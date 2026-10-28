-- with no booking policy (mode 'none') the booking can be moved whenever there's a slot;
-- cancelling after the free window still keeps the booking fee
create function public.is_reschedule_open(terms jsonb)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(terms ->> 'mode', 'none') = 'none'
    or now() < (terms ->> 'free_cancel_until')::timestamptz
$$;

create or replace function public.get_managed_booking(token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', booking.id,
    'ref', booking.ref,
    'status', booking.status,
    'snapshot', booking.snapshot,
    'starts_at', booking.starts_at,
    'ends_at', booking.ends_at,
    'stylist_name', stylists.business_name,
    'stylist_slug', stylists.slug,
    'is_mobile', stylists.business_type = 'mobile',
    'where', public.get_booking_where(booking.id),
    'price_pence', booking.price_pence,
    'fee_pence', booking.fee_pence,
    'paid_pence', booking.due_today_pence,
    'terms', booking.terms,
    'notes', booking.notes,
    'address_notes', nullif(booking.address ->> 'notes', ''),
    'reschedule_count', booking.reschedule_count,
    'calendar_key', booking.calendar_key,
    'is_verified', public.is_manage_verified(token),
    'cancelled_at', booking.cancelled_at,
    'can_cancel', booking.status = 'confirmed' and booking.starts_at > now(),
    'can_reschedule', booking.status = 'confirmed' and booking.reschedule_count < 1
      and public.is_reschedule_open(booking.terms),
    'cancellation', coalesce(booking.cancellation, public.get_cancellation_terms(booking))
  )
  from public.get_booking_by_token(token) as booking
  join public.stylists on stylists.id = booking.stylist_id
$$;

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
    or not public.is_reschedule_open(booking.terms) then
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

revoke execute on function public.is_reschedule_open(jsonb) from public, anon, authenticated;
