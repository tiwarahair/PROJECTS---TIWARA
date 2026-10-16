alter table public.bookings
  add column allergies text check (length(allergies) <= 1000),
  add column allergies_consented_at timestamptz,
  add column cancelled_at timestamptz,
  add column cancelled_by text check (cancelled_by in ('client', 'stylist')),
  add column cancellation jsonb;

create function public.get_booking_by_token(token text)
returns public.bookings
language sql
stable
security definer
set search_path = ''
as $$
  select bookings.*
  from public.booking_tokens
  join public.bookings on bookings.id = booking_tokens.booking_id
  where token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8')) and purpose = 'manage' and expires_at > now()
$$;

create function public.get_cancellation_terms(booking public.bookings)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  terms jsonb := booking.terms;
  mode text := terms ->> 'mode';
  price integer := booking.price_pence;
  deposit integer := coalesce((terms ->> 'deposit_pence')::integer, 0);
  is_late boolean := now() >= (terms ->> 'free_cancel_until')::timestamptz;
  late_fee integer := 0;
  kept integer := 0;
  charge integer := 0;
  refund integer := 0;
begin
  if is_late and mode <> 'none' and (terms ->> 'late_on')::boolean then
    late_fee := case
      when mode = 'deposit' and terms ->> 'late_kind' = 'keep' then deposit
      else round(price * (terms ->> 'late_percent')::numeric / 100)
    end;
  end if;

  if mode = 'deposit' then
    kept := case when (terms ->> 'refundable')::boolean then least(late_fee, deposit) else deposit end;
    refund := deposit - kept;
    charge := greatest(late_fee - deposit, 0);
  elsif mode = 'full' then
    kept := least(late_fee, price);
    refund := price - kept;
  elsif mode = 'card' then
    charge := late_fee;
  end if;

  return jsonb_build_object(
    'is_late', is_late,
    'refund_pence', refund,
    'kept_pence', kept,
    'charge_pence', charge,
    'free_cancel_until', terms ->> 'free_cancel_until'
  );
end;
$$;

create function public.get_managed_booking(token text)
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
    'allergies', booking.allergies,
    'reschedule_count', booking.reschedule_count,
    'cancelled_at', booking.cancelled_at,
    'can_cancel', booking.status = 'confirmed' and booking.starts_at > now(),
    'can_reschedule', booking.status = 'confirmed' and booking.reschedule_count < 1
      and now() < (booking.terms ->> 'free_cancel_until')::timestamptz,
    'cancellation', coalesce(booking.cancellation, public.get_cancellation_terms(booking))
  )
  from public.get_booking_by_token(token) as booking
  join public.stylists on stylists.id = booking.stylist_id
$$;

create function public.get_reschedule_slots(token text, from_date date, to_date date)
returns setof timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select slot
  from public.get_booking_by_token(token) as booking
  cross join generate_series(from_date, least(to_date, from_date + 62), interval '1 day') as day
  cross join public.get_day_slots(booking.stylist_id, booking.minutes, booking.buffer_minutes, day::date, booking.id) as slot
  where booking.status = 'confirmed' and slot <> booking.starts_at
  order by slot
$$;

create function public.queue_booking_change(target uuid, client_template text, stylist_event text)
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
  select * into stylist from public.stylists where id = booking.stylist_id;
  select email into owner_email from auth.users where id = stylist.owner_id;
  select * into preference from public.notification_preferences where stylist_id = stylist.id and event = stylist_event;

  perform public.queue_email(
    booking.contact ->> 'email',
    client_template,
    details || jsonb_build_object(
      'cancellation', booking.cancellation,
      'fee_pence', booking.fee_pence,
      'manage_url', booking.site || '/manage?token='
        || public.create_booking_token(booking.id, 'manage', booking.starts_at + interval '30 days')
    ),
    booking.client_id
  );

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

create function public.reschedule_managed_booking(token text, slot_start timestamptz)
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

create function public.update_booking_allergies(token text, allergies text, consent boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.get_booking_by_token(token);
  text_given text := nullif(trim(allergies), '');
begin
  if booking.id is null then
    raise exception 'link_not_valid';
  end if;

  if text_given is not null and not consent then
    raise exception 'consent_required';
  end if;

  update public.bookings
  set allergies = text_given,
    allergies_consented_at = case when text_given is null then null else now() end
  where id = booking.id;

  insert into public.booking_events (booking_id, kind)
  values (booking.id, case when text_given is null then 'allergies_removed' else 'allergies_shared' end);
end;
$$;

create function public.get_cancellation(token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.get_booking_by_token(token);
begin
  if booking.id is null then
    raise exception 'link_not_valid';
  end if;

  if booking.status <> 'confirmed' or booking.starts_at <= now() then
    raise exception 'cannot_cancel';
  end if;

  return public.get_cancellation_terms(booking) || jsonb_build_object(
    'id', booking.id,
    'payment_intent_id', booking.stripe_payment_intent_id
  );
end;
$$;

create function public.cancel_managed_booking(token text, cancellation jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.get_booking_by_token(token);
begin
  if booking.id is null then
    raise exception 'link_not_valid';
  end if;

  update public.bookings
  set status = 'cancelled', cancelled_at = now(), cancelled_by = 'client',
    cancellation = cancel_managed_booking.cancellation
  where id = booking.id and status = 'confirmed';

  if not found then
    raise exception 'cannot_cancel';
  end if;

  insert into public.booking_events (booking_id, kind, data)
  values (booking.id, 'cancelled', cancel_managed_booking.cancellation || jsonb_build_object('by', 'client'));

  perform public.queue_booking_change(booking.id, 'booking_cancelled', 'client_cancelled');
end;
$$;

create function public.get_booking_calendar(token text, target uuid, secret text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_booking_details(bookings.id)
  from public.bookings
  where status = 'confirmed' and (
    id = (public.get_booking_by_token(token)).id
    or (id = target and hold_secret_hash = sha256(convert_to(coalesce(secret, ''), 'UTF8')))
  )
  limit 1
$$;

revoke execute on function
  public.get_booking_by_token(text),
  public.get_cancellation_terms(public.bookings),
  public.get_managed_booking(text),
  public.get_reschedule_slots(text, date, date),
  public.queue_booking_change(uuid, text, text),
  public.reschedule_managed_booking(text, timestamptz),
  public.update_booking_allergies(text, text, boolean),
  public.get_cancellation(text),
  public.cancel_managed_booking(text, jsonb),
  public.get_booking_calendar(text, uuid, text)
  from public, anon, authenticated;

grant execute on function
  public.get_managed_booking(text),
  public.get_reschedule_slots(text, date, date),
  public.reschedule_managed_booking(text, timestamptz),
  public.update_booking_allergies(text, text, boolean)
  to anon, authenticated;

grant execute on function
  public.get_cancellation(text),
  public.cancel_managed_booking(text, jsonb),
  public.get_booking_calendar(text, uuid, text)
  to service_role;
