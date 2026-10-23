-- Studio runs the day: stylists mark arrivals, no-shows and completions, move and cancel bookings.
alter table public.bookings
  add column created_by text not null default 'client' check (created_by in ('client', 'stylist')),
  add column cancel_reason text check (length(cancel_reason) <= 500),
  add column arrived_at timestamptz,
  add column completed_at timestamptz,
  add column no_show_at timestamptz,
  -- the stylist chose to double-book it; online booking still never overlaps it
  add column overlap_ok boolean not null default false;

alter table public.bookings
  drop constraint bookings_status_check,
  add constraint bookings_status_check check (status in (
    'held', 'expired', 'awaiting_confirmation', 'confirmed', 'arrived', 'completed', 'cancelled', 'auto_cancelled', 'no_show'
  )),
  drop constraint bookings_no_overlap,
  add constraint bookings_no_overlap exclude using gist (stylist_id with =, block_range with &&)
    where (status in ('held', 'awaiting_confirmation', 'confirmed', 'arrived') and not overlap_ok);

create index bookings_stylist_starts_idx on public.bookings (stylist_id, starts_at);

-- New statuses hold their time too; the overlap check now uses the new booking's length, not the existing one's.
create or replace function public.get_day_slots(target uuid, minutes integer, buffer_minutes integer, check_day date, ignore_booking uuid default null)
returns setof timestamptz
language sql
stable
set search_path = ''
as $$
  select distinct slot at time zone 'Europe/London'
  from public.working_hours as hours
  join public.booking_rules as rules on rules.stylist_id = target
  join public.stylists as stylist on stylist.id = target
  cross join lateral generate_series(
    check_day + hours.start_time,
    check_day + hours.end_time - make_interval(mins => minutes),
    interval '30 minutes'
  ) as slots (slot)
  where hours.stylist_id = target
    and hours.is_open
    and hours.weekday = extract(isodow from check_day) - 1
    and slot at time zone 'Europe/London' >= now() + make_interval(hours => rules.min_notice_hours)
    and check_day <= (now() at time zone 'Europe/London')::date + make_interval(months => rules.max_notice_months)
    and not (stylist.pause_on and (stylist.pause_until is null or check_day < stylist.pause_until))
    and not exists (
      select 1 from public.closed_periods
      where stylist_id = target and check_day between starts_on and ends_on
    )
    and not exists (
      select 1 from public.time_blocks as block
      where block.stylist_id = target
        and check_day >= block.starts_on
        and (block.repeat_until is null or check_day <= block.repeat_until)
        and case block.repeat
          when 'none' then check_day = block.starts_on
          when 'weekly' then extract(isodow from check_day) = extract(isodow from block.starts_on)
          when 'monthly' then extract(day from check_day) = extract(day from block.starts_on)
          else true
        end
        and (block.all_day or (
          slot < check_day + block.end_time and slot + make_interval(mins => minutes) > check_day + block.start_time
        ))
    )
    and not exists (
      select 1 from public.bookings as booking
      where booking.stylist_id = target
        and booking.id is distinct from ignore_booking
        and (
          booking.status in ('awaiting_confirmation', 'confirmed', 'arrived')
          or (booking.status = 'held' and booking.hold_expires_at > now())
        )
        and booking.block_range && tstzrange(
          slot at time zone 'Europe/London',
          (slot + make_interval(mins => get_day_slots.minutes + get_day_slots.buffer_minutes)) at time zone 'Europe/London',
          '[)'
        )
    )
$$;


-- Changes the stylist makes themselves only email the client (stylist_event null); each email gets only the
-- links it shows.
create or replace function public.queue_booking_change(target uuid, client_template text, stylist_event text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  stylist public.stylists;
  owner_email text;
  preference public.notification_preferences;
  details jsonb := public.get_booking_details(target);
begin
  select * into booking from public.bookings where id = target;

  perform public.queue_email(
    booking.contact ->> 'email',
    client_template,
    details || jsonb_build_object('cancellation', booking.cancellation, 'fee_pence', booking.fee_pence)
      || case when client_template in ('booking_rescheduled', 'booking_moved_by_stylist') then jsonb_build_object(
        'manage_url', booking.site || '/manage?token='
          || public.create_booking_token(booking.id, 'manage', booking.starts_at + interval '30 days')
      ) else '{}' end
      || case when client_template in ('booking_rescheduled', 'booking_cancelled') then jsonb_build_object(
        'secure_url', booking.site || '/manage?secure='
          || public.create_booking_token(booking.id, 'secure', now() + interval '30 days')
      ) else '{}' end,
    booking.client_id
  );

  if stylist_event is null then
    return;
  end if;

  select * into stylist from public.stylists where id = booking.stylist_id;
  select email into owner_email from auth.users where id = stylist.owner_id;
  select * into preference from public.notification_preferences where stylist_id = stylist.id and event = stylist_event;

  if owner_email is not null and coalesce(preference.email, true) then
    perform public.queue_email(
      owner_email, stylist_event,
      details || jsonb_build_object('cancellation', booking.cancellation, 'studio_url', booking.site || '/studio'),
      stylist.owner_id
    );
  end if;

  if stylist.contact_phone is not null and coalesce(preference.sms, false) then
    perform public.queue_sms(stylist.contact_phone, stylist_event, details, stylist.owner_id);
  end if;
end;
$$;

-- A client's own move only goes to a free time, so it is no longer a double-booking.
create or replace function public.reschedule_managed_booking(token text, slot_start timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.get_booking_by_token(token);
  window_hours numeric := (booking.terms ->> 'free_window_hours')::numeric;
  slot_end timestamptz := slot_start + make_interval(mins => booking.minutes);
begin
  if booking.id is null then
    raise exception 'link_not_valid';
  end if;

  if not public.is_manage_verified(token) then
    raise exception 'confirm_needed';
  end if;

  select * into booking from public.bookings where id = booking.id for update;

  if booking.status <> 'confirmed' or booking.reschedule_count >= 1
    or now() >= (booking.terms ->> 'free_cancel_until')::timestamptz then
    raise exception 'reschedule_not_allowed';
  end if;

  if not exists (
    select 1
    from public.get_day_slots(
      booking.stylist_id, booking.minutes, booking.buffer_minutes, (slot_start at time zone 'Europe/London')::date, booking.id
    ) as slot
    where slot = slot_start
  ) then
    raise exception 'slot_taken';
  end if;

  begin
    update public.bookings
    set starts_at = slot_start,
      ends_at = slot_end,
      block_ends_at = slot_end + make_interval(mins => booking.buffer_minutes),
      reschedule_count = reschedule_count + 1,
      overlap_ok = false,
      terms = terms || jsonb_build_object('free_cancel_until', slot_start - make_interval(secs => window_hours * 3600))
    where id = booking.id;
  exception when exclusion_violation then
    raise exception 'slot_taken';
  end;

  insert into public.booking_events (booking_id, kind, data)
  values (booking.id, 'rescheduled', jsonb_build_object('from', booking.starts_at, 'to', slot_start, 'by', 'client'));

  perform public.queue_booking_change(booking.id, 'booking_rescheduled', 'client_rescheduled');

  return jsonb_build_object('starts_at', slot_start, 'ends_at', slot_end);
end;
$$;

/** The signed-in stylist's booking, locked for the change; raises not_found for anyone else's. */
create function public.lock_own_booking(target uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
begin
  select * into booking from public.bookings where id = target for update;

  if booking.id is null or not public.is_stylist_owner(booking.stylist_id) then
    raise exception 'not_found';
  end if;

  return booking;
end;
$$;

/** Arrived (from an hour before the start) and back to confirmed. */
create function public.set_booking_status(target uuid, next_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
begin
  if booking.status = 'confirmed' and next_status = 'arrived' and now() >= booking.starts_at - interval '1 hour' then
    update public.bookings set status = 'arrived', arrived_at = now() where id = target;
  elsif booking.status = 'arrived' and next_status = 'confirmed' then
    update public.bookings set status = 'confirmed', arrived_at = null where id = target;
  else
    raise exception 'status_not_allowed';
  end if;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'status_changed', jsonb_build_object('from', booking.status, 'to', next_status, 'by', 'stylist'));
end;
$$;

/** A no-show, from the end of the grace period until a day after the start. */
create function public.mark_no_show(target uuid, charge_fee boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  grace integer := coalesce((booking.terms ->> 'grace_minutes')::integer, 0);
begin
  if booking.status <> 'confirmed'
    or now() < booking.starts_at + make_interval(mins => grace)
    or now() >= booking.starts_at + interval '24 hours' then
    raise exception 'no_show_not_allowed';
  end if;

  update public.bookings set status = 'no_show', no_show_at = now() where id = target;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'no_show', jsonb_build_object('charge_fee', charge_fee, 'by', 'stylist'));
end;
$$;

/** Puts a no-show back within 24 hours of marking it. */
create function public.undo_no_show(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
begin
  if booking.status <> 'no_show' or booking.no_show_at <= now() - interval '24 hours' then
    raise exception 'undo_not_allowed';
  end if;

  update public.bookings set status = 'confirmed', no_show_at = null where id = target;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'no_show_undone', jsonb_build_object('by', 'stylist'));
end;
$$;

-- The stylist moves a booking to any future time, over another booking only when they've agreed to the overlap;
-- it doesn't use up the client's own reschedule, and an arrived booking goes back to confirmed.
create function public.reschedule_studio_booking(target uuid, slot_start timestamptz, allow_overlap boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  window_hours numeric := coalesce((booking.terms ->> 'free_window_hours')::numeric, 0);
  slot_end timestamptz := slot_start + make_interval(mins => booking.minutes);
begin
  if booking.status not in ('awaiting_confirmation', 'confirmed', 'arrived') or slot_start <= now() then
    raise exception 'reschedule_not_allowed';
  end if;

  begin
    update public.bookings
    set status = case when status = 'arrived' then 'confirmed' else status end,
      arrived_at = null,
      overlap_ok = allow_overlap,
      starts_at = slot_start,
      ends_at = slot_end,
      block_ends_at = slot_end + make_interval(mins => booking.buffer_minutes),
      terms = terms || jsonb_build_object('free_cancel_until', slot_start - make_interval(secs => window_hours * 3600))
    where id = target;
  exception when exclusion_violation then
    raise exception 'slot_taken';
  end;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'rescheduled', jsonb_build_object('from', booking.starts_at, 'to', slot_start, 'by', 'stylist'));

  perform public.queue_booking_change(target, 'booking_moved_by_stylist', null);

  return jsonb_build_object('starts_at', slot_start, 'ends_at', slot_end);
end;
$$;

-- Cancelling from Studio (the edge function refunds in between): the stylist cancelling refunds everything
-- including the booking fee, which is then owed back by the stylist; a client cancelling by phone follows
-- the policy, or refunds what they paid for the service when the stylist waives the fee.
create function public.get_studio_cancellation(target uuid, owner uuid, who text, waive_fee boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  paid integer;
  terms jsonb;
begin
  select bookings.* into booking
  from public.bookings
  join public.stylists on stylists.id = bookings.stylist_id
  where bookings.id = target and stylists.owner_id = owner;

  if booking.id is null then
    raise exception 'not_found';
  end if;

  if booking.status not in ('awaiting_confirmation', 'confirmed', 'arrived') then
    raise exception 'cannot_cancel';
  end if;

  -- only money taken through Stripe can go back
  paid := case
    when booking.paid_at is null or booking.stripe_payment_intent_id is null then 0
    else coalesce(booking.due_today_pence, 0)
  end;

  if who = 'stylist' then
    terms := jsonb_build_object(
      'is_late', false, 'refund_pence', paid, 'kept_pence', 0, 'charge_pence', 0,
      'fee_recovery_pence', case when paid > 0 then booking.fee_pence else 0 end
    );
  else
    terms := public.get_cancellation_terms(booking);

    if waive_fee then
      terms := terms || jsonb_build_object(
        'refund_pence', (terms ->> 'refund_pence')::integer + (terms ->> 'kept_pence')::integer,
        'kept_pence', 0,
        'charge_pence', 0,
        'waived', true
      );
    end if;

    if booking.stripe_payment_intent_id is null then
      terms := terms || jsonb_build_object('refund_pence', 0);
    end if;
  end if;

  return terms || jsonb_build_object('id', booking.id, 'payment_intent_id', booking.stripe_payment_intent_id);
end;
$$;

create function public.cancel_studio_booking(target uuid, owner uuid, who text, reason text, cancellation jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bookings
  set status = 'cancelled', cancelled_at = now(), cancelled_by = who,
    cancel_reason = nullif(trim(reason), ''), cancellation = cancel_studio_booking.cancellation
  where id = target
    and status in ('awaiting_confirmation', 'confirmed', 'arrived')
    and stylist_id in (select id from public.stylists where owner_id = owner);

  if not found then
    raise exception 'cannot_cancel';
  end if;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'cancelled', cancel_studio_booking.cancellation || jsonb_build_object('by', who, 'recorded_by', 'stylist'));

  perform public.queue_booking_change(
    target, case when who = 'stylist' then 'booking_cancelled_by_stylist' else 'booking_cancelled' end, null
  );
end;
$$;

revoke execute on function
  public.lock_own_booking(uuid),
  public.set_booking_status(uuid, text),
  public.mark_no_show(uuid, boolean),
  public.undo_no_show(uuid),
  public.reschedule_studio_booking(uuid, timestamptz, boolean),
  public.get_studio_cancellation(uuid, uuid, text, boolean),
  public.cancel_studio_booking(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;

grant execute on function
  public.set_booking_status(uuid, text),
  public.mark_no_show(uuid, boolean),
  public.undo_no_show(uuid),
  public.reschedule_studio_booking(uuid, timestamptz, boolean)
  to authenticated;

grant execute on function
  public.get_studio_cancellation(uuid, uuid, text, boolean),
  public.cancel_studio_booking(uuid, uuid, text, text, jsonb)
  to service_role;
