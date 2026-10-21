-- when each reminder was sent, or skipped because its time had passed when the booking was made, confirmed or moved
alter table public.bookings
  add column reminder_48_at timestamptz,
  add column reminder_24_at timestamptz;

update public.bookings
set reminder_48_at = case when starts_at <= now() + interval '48 hours' then now() end,
  reminder_24_at = case when starts_at <= now() + interval '24 hours' then now() end;

create function public.skip_passed_reminders()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.starts_at is distinct from old.starts_at
    or (new.status = 'confirmed' and old.status in ('held', 'awaiting_confirmation')) then
    new.reminder_48_at := case when new.starts_at <= now() + interval '48 hours' then now() end;
    new.reminder_24_at := case when new.starts_at <= now() + interval '24 hours' then now() end;
  end if;

  return new;
end;
$$;

create trigger bookings_skip_passed_reminders before insert or update of starts_at, status on public.bookings
for each row execute function public.skip_passed_reminders();

-- 48 and 24 hours before, for confirmed bookings with an email (send_studio_booking_notice skips the rest)
create function public.queue_due_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due record;
  sent integer := 0;
begin
  for due in
    select id, starts_at <= now() + interval '24 hours' as is_day_before
    from public.bookings
    where status = 'confirmed' and starts_at > now()
      and (
        (reminder_24_at is null and starts_at <= now() + interval '24 hours')
        or (reminder_48_at is null and starts_at <= now() + interval '48 hours')
      )
    for update skip locked
  loop
    update public.bookings
    set reminder_48_at = coalesce(reminder_48_at, now()),
      reminder_24_at = case when due.is_day_before then now() else reminder_24_at end
    where id = due.id;

    perform public.send_studio_booking_notice(
      due.id, case when due.is_day_before then 'booking_reminder_24h' else 'booking_reminder_48h' end
    );

    sent := sent + 1;
  end loop;

  return sent;
end;
$$;

-- "Completed · Unpaid" in Studio's Due for checkout: an hour after an arrived booking ends, or once the no-show
-- window (24 hours from the start) closes on one never marked arrived
create function public.complete_past_bookings()
returns integer
language sql
security definer
set search_path = ''
as $$
  with due as (
    select id, status from public.bookings
    where (status = 'arrived' and ends_at + interval '1 hour' <= now())
      or (status = 'confirmed' and starts_at + interval '24 hours' <= now())
    for update skip locked
  ),
  done as (
    update public.bookings
    set status = 'completed', completed_at = now(), unpaid_at = now()
    from due
    where bookings.id = due.id
    returning bookings.id, due.status
  ),
  logged as (
    insert into public.booking_events (booking_id, kind, data)
    select id, 'auto_completed', jsonb_build_object('from', status) from done
  )
  select count(*)::integer from done
$$;

-- a checkout of an auto-completed booking undoes back to "Completed · Unpaid"; ten minutes from the checkout itself
create or replace function public.undo_checkout(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  from_status text := booking.checkout ->> 'from_status';
  checked_out_at timestamptz := (
    select max(created_at) from public.booking_events where booking_id = target and kind = 'checked_out'
  );
begin
  if booking.status <> 'completed' or booking.checkout ->> 'method' not in ('record', 'none')
    or from_status not in ('confirmed', 'arrived', 'completed')
    or coalesce(checked_out_at, booking.completed_at) < now() - interval '10 minutes'
    or exists (select 1 from public.refunds where booking_id = target) then
    raise exception 'undo_not_allowed';
  end if;

  delete from public.payments where booking_id = target and kind = 'balance' and method <> 'card';

  -- a receipt that hasn't gone yet isn't sent
  delete from public.notifications
  where status = 'pending' and template = 'checkout_receipt' and payload ->> 'ref' = booking.ref;

  update public.bookings
  set status = from_status,
    completed_at = case when from_status = 'completed' then completed_at end,
    unpaid_at = case when from_status = 'completed' then now() end,
    final_price_pence = null, tip_pence = 0, checkout = null
  where id = target;

  insert into public.booking_events (booking_id, kind) values (target, 'checkout_undone');
end;
$$;

-- each day's open time as it was, so later changes to hours, blocks or closures don't rewrite past occupancy
create table public.daily_open_minutes (
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  day date not null,
  minutes integer not null,
  primary key (stylist_id, day)
);

alter table public.daily_open_minutes enable row level security;

create function public.save_open_minutes()
returns integer
language sql
security definer
set search_path = ''
as $$
  with saved as (
    insert into public.daily_open_minutes (stylist_id, day, minutes)
    select stylists.id, yesterday, public.get_open_minutes(stylists.id, yesterday)
    from public.stylists, (select (now() at time zone 'Europe/London')::date - 1 as yesterday) as days
    on conflict do nothing
    returning 1
  )
  select count(*)::integer from saved
$$;

insert into public.daily_open_minutes (stylist_id, day, minutes)
select stylists.id, day::date, public.get_open_minutes(stylists.id, day::date)
from public.stylists
cross join generate_series(
  (stylists.created_at at time zone 'Europe/London')::date,
  (now() at time zone 'Europe/London')::date - 1,
  interval '1 day'
) as day;

create or replace function public.get_period_kpis(target uuid, first_day date, last_day date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with counted as (
    select bookings.minutes, bookings.stylist_client_id, (bookings.starts_at at time zone 'Europe/London')::date as day
    from public.bookings
    where bookings.stylist_id = target
      and bookings.status in ('awaiting_confirmation', 'confirmed', 'arrived', 'completed', 'no_show')
  ),
  first_visits as (
    select stylist_client_id, min(day) as day from counted where stylist_client_id is not null group by stylist_client_id
  )
  select jsonb_build_object(
    'bookings', (select count(*) from counted where day between first_day and last_day),
    'booked_minutes', (select coalesce(sum(minutes), 0) from counted where day between first_day and last_day),
    'open_minutes', (
      select coalesce(sum(coalesce(saved.minutes, public.get_open_minutes(target, dates.day::date))), 0)
      from generate_series(first_day, last_day, interval '1 day') as dates (day)
      left join public.daily_open_minutes as saved on saved.stylist_id = target and saved.day = dates.day::date
      -- nothing was open before the stylist joined
      where dates.day::date >= (select (created_at at time zone 'Europe/London')::date from public.stylists where id = target)
    ),
    'new_clients', (select count(*) from first_visits where day between first_day and last_day)
  )
$$;

revoke execute on function
  public.queue_due_reminders(),
  public.complete_past_bookings(),
  public.save_open_minutes()
  from public, anon, authenticated;

select cron.schedule('complete-and-remind', '*/5 * * * *',
  $$select public.complete_past_bookings(); select public.queue_due_reminders()$$);

select cron.schedule('save-open-minutes', '5 * * * *', $$select public.save_open_minutes()$$);
