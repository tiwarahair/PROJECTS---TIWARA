alter table public.stylist_private add column activity_seen_at timestamptz;

-- when the payout last changed status, for the activity feed (repeated Stripe events don't move it)
alter table public.payouts add column status_at timestamptz not null default now();

update public.payouts set status_at = coalesce(updated_at, created_at);

create function public.set_payout_status_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_at := now();
  end if;

  return new;
end;
$$;

create trigger payouts_status_at before update on public.payouts
for each row execute function public.set_payout_status_at();

-- working hours less blocked time (the same repeat rules as get_day_slots); nothing on a closed day
create function public.get_open_minutes(target uuid, check_day date)
returns integer
language sql
stable
set search_path = ''
as $$
  with open as (
    select range_agg(tsrange(check_day + hours.start_time, check_day + hours.end_time)) as ranges
    from public.working_hours as hours
    where hours.stylist_id = target
      and hours.is_open
      and hours.weekday = extract(isodow from check_day) - 1
      and not exists (
        select 1 from public.closed_periods
        where stylist_id = target and check_day between starts_on and ends_on
      )
  ),
  blocked as (
    select range_agg(case when block.all_day
      then tsrange(check_day, check_day + 1)
      else tsrange(check_day + block.start_time, check_day + block.end_time)
    end) as ranges
    from public.time_blocks as block
    where block.stylist_id = target
      and check_day >= block.starts_on
      and (block.repeat_until is null or check_day <= block.repeat_until)
      and case block.repeat
        when 'none' then check_day = block.starts_on
        when 'weekly' then extract(isodow from check_day) = extract(isodow from block.starts_on)
        when 'monthly' then extract(day from check_day) = extract(day from block.starts_on)
        else true
      end
  )
  select coalesce(sum(extract(epoch from upper(part) - lower(part)) / 60), 0)::integer
  from open, blocked, unnest(open.ranges - coalesce(blocked.ranges, '{}'::tsmultirange)) as part
$$;

create function public.get_period_kpis(target uuid, first_day date, last_day date)
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
      select coalesce(sum(public.get_open_minutes(target, day::date)), 0)
      from generate_series(first_day, last_day, interval '1 day') as day
    ),
    'new_clients', (select count(*) from first_visits where day between first_day and last_day)
  )
$$;

create function public.get_studio_kpis(target uuid, days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/London')::date;
  first_day date := today - (days - 1);
begin
  if not public.is_stylist_owner(target) then
    raise exception 'not_owner';
  end if;

  if days is null or days not between 1 and 90 then
    raise exception 'invalid_range';
  end if;

  return (
    with lines as materialized (
      select lines.at at time zone 'Europe/London' as local_at, lines.amount_pence
      from public.get_stylist_ledger(target) as lines
      where (lines.at at time zone 'Europe/London')::date between first_day - days and today
    )
    select jsonb_build_object(
      'today', today,
      'current', public.get_period_kpis(target, first_day, today) || jsonb_build_object(
        'revenue_pence', (select coalesce(sum(amount_pence), 0) from lines where local_at::date >= first_day)
      ),
      'previous', public.get_period_kpis(target, first_day - days, first_day - 1) || jsonb_build_object(
        'revenue_pence', (select coalesce(sum(amount_pence), 0) from lines where local_at::date < first_day)
      ),
      -- UK wall-clock keys: '2026-10-21T14' by hour for today, '2026-10-21' by day otherwise
      'buckets', (
        select coalesce(jsonb_object_agg(bucket, takings), '{}')
        from (
          select to_char(local_at, case when days = 1 then 'YYYY-MM-DD"T"HH24' else 'YYYY-MM-DD' end) as bucket,
            sum(amount_pence) as takings
          from lines
          where amount_pence > 0 and local_at::date >= first_day
          group by 1
        ) as totals
      )
    )
  );
end;
$$;

-- what clients, Stripe and the bank did (not the stylist's own actions), newest first
create function public.get_studio_activity(target uuid, max_rows integer)
returns table (
  id text, kind text, at timestamptz, booking_id uuid, client_first text, service text, amount_pence integer,
  is_unread boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with items as (
    -- when it was confirmed (paid, or nothing to pay), not when its hold started
    select 'booking:' || bookings.id as id, 'new_booking' as kind, coalesce(bookings.paid_at, bookings.created_at) as at,
      bookings.id as booking_id,
      null::integer as amount_pence
    from public.bookings
    where bookings.stylist_id = target and bookings.created_by = 'client' and bookings.status not in ('held', 'expired')

    union all

    select 'event:' || events.id,
      case events.kind
        when 'confirmed' then 'client_confirmed'
        when 'cancelled' then 'client_cancelled'
        when 'rescheduled' then 'client_rescheduled'
        when 'fee_settled' then 'fee_' || (events.data ->> 'outcome')
        else events.kind
      end,
      events.created_at, events.booking_id, payments.amount_pence
    from public.booking_events as events
    join public.bookings on bookings.id = events.booking_id
    left join public.payments
      on payments.stripe_payment_intent_id = coalesce(events.data ->> 'payment_intent', events.data ->> 'payment_intent_id')
    where bookings.stylist_id = target
      and (
        -- a cancellation the stylist recorded for the client is their own action
        (events.kind in ('confirmed', 'cancelled', 'rescheduled') and events.data ->> 'by' = 'client'
          and not events.data ? 'recorded_by')
        or (events.kind = 'fee_settled' and events.data ->> 'outcome' in ('paid', 'unpaid'))
        or events.kind in ('auto_cancelled', 'fee_paid_by_link', 'balance_paid_by_link')
      )

    union all

    select 'dispute:' || disputes.id, 'dispute_opened', disputes.created_at, disputes.booking_id, disputes.amount_pence
    from public.disputes
    where disputes.stylist_id = target

    union all

    select 'payout:' || payouts.id, 'payout_' || payouts.status, payouts.status_at, null,
      payouts.amount_pence
    from public.payouts
    where payouts.stylist_id = target and payouts.status in ('paid', 'failed')
  )
  select items.id, items.kind, items.at, items.booking_id, bookings.contact ->> 'first',
    bookings.snapshot ->> 'service_name', items.amount_pence,
    items.at > coalesce(private.activity_seen_at, '-infinity')
  from items
  left join public.bookings on bookings.id = items.booking_id
  left join public.stylist_private as private on private.stylist_id = target
  where public.is_stylist_owner(target)
  order by items.at desc
  limit max_rows
$$;

-- only up to the newest item they were shown, so anything that arrived since stays unread
create function public.mark_activity_seen(target uuid, seen_until timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.stylist_private
  set activity_seen_at = greatest(coalesce(activity_seen_at, '-infinity'), least(seen_until, now()))
  where stylist_id = target and public.is_stylist_owner(target)
$$;

revoke execute on function
  public.get_open_minutes(uuid, date),
  public.get_period_kpis(uuid, date, date),
  public.get_studio_kpis(uuid, integer),
  public.get_studio_activity(uuid, integer),
  public.mark_activity_seen(uuid, timestamptz)
  from public, anon, authenticated;

grant execute on function
  public.get_studio_kpis(uuid, integer),
  public.get_studio_activity(uuid, integer),
  public.mark_activity_seen(uuid, timestamptz)
  to authenticated;
