-- Checkout: the held booking takes the client's details and the stylist's current policy, then Stripe's
-- payment_intent.succeeded event (and nothing else) confirms it.
alter table public.profiles add column stripe_customer_id text unique;

alter table public.bookings
  add column contact jsonb,
  add column notes text check (length(notes) <= 500),
  add column policy_id uuid references public.payment_policies (id),
  -- the policy as agreed, with the free-cancellation deadline worked out
  add column terms jsonb,
  add column due_today_pence integer check (due_today_pence >= 0),
  add column stripe_customer_id text,
  add column stripe_payment_intent_id text unique,
  add column paid_at timestamptz;

create index bookings_policy_id_idx on public.bookings (policy_id);

/** Fills in a live hold for payment; called by the booking-checkout Edge Function. */
create function public.checkout_booking(
  target uuid,
  secret text,
  contact jsonb,
  notes text,
  address jsonb,
  client_lat double precision,
  client_lng double precision,
  client uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  held public.bookings;
  stylist public.stylists;
  policy public.payment_policies;
  point extensions.geography;
  deposit integer := 0;
  due integer;
begin
  select * into held from public.bookings
  where id = target
    and hold_secret_hash = sha256(convert_to(coalesce(secret, ''), 'UTF8'))
    and status = 'held' and hold_expires_at > now()
  for update;

  if held.id is null then
    raise exception 'hold_not_found';
  end if;

  select * into stylist from public.stylists where id = held.stylist_id;

  if stylist.business_type = 'mobile' then
    if client_lat is null or client_lng is null or address is null then
      raise exception 'address_required';
    end if;

    point := extensions.st_setsrid(extensions.st_makepoint(client_lng, client_lat), 4326)::extensions.geography;

    if not extensions.st_dwithin(stylist.location, point, stylist.travel_radius_miles * 1609.344) then
      raise exception 'outside_area';
    end if;
  end if;

  select * into policy from public.payment_policies
  where stylist_id = stylist.id
  order by created_at desc
  limit 1;

  if policy.mode = 'deposit' then
    deposit := round(held.price_pence * policy.deposit_percent / 100.0);
  end if;

  due := case policy.mode
    when 'deposit' then deposit + held.fee_pence
    when 'full' then held.price_pence + held.fee_pence
    else held.fee_pence
  end;

  update public.bookings
  set contact = checkout_booking.contact,
    notes = nullif(checkout_booking.notes, ''),
    address = case when stylist.business_type = 'mobile' then checkout_booking.address end,
    location = coalesce(point, bookings.location),
    client_id = coalesce(client, bookings.client_id),
    policy_id = policy.id,
    terms = to_jsonb(policy) - 'id' - 'stylist_id' - 'created_at' || jsonb_build_object(
      'deposit_pence', deposit,
      'free_cancel_until', held.starts_at - make_interval(secs => policy.free_window_hours * 3600)
    ),
    due_today_pence = due
  where id = held.id
  returning * into held;

  return jsonb_build_object(
    'id', held.id,
    'ref', held.ref,
    'mode', policy.mode,
    'price_pence', held.price_pence,
    'fee_pence', held.fee_pence,
    'due_today_pence', due,
    'service_name', held.snapshot ->> 'service_name',
    'starts_at', held.starts_at,
    'stylist_account', stylist.stripe_account_id,
    'stylist_name', stylist.business_name,
    'customer_id', held.stripe_customer_id,
    'payment_intent_id', held.stripe_payment_intent_id
  );
end;
$$;

/**
 * Confirms a booking when its payment succeeds: 'confirmed', 'duplicate' (already done) or 'slot_taken' (the
 * hold lapsed and someone else has the time, so the payment is refunded).
 */
create function public.confirm_booking_payment(intent text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
begin
  select * into booking from public.bookings where stripe_payment_intent_id = intent for update;

  if booking.id is null then
    raise exception 'booking_not_found';
  end if;

  if booking.status <> 'held' and booking.status <> 'expired' then
    return 'duplicate';
  end if;

  begin
    update public.bookings
    set status = 'confirmed', paid_at = now(), hold_expires_at = null
    where id = booking.id;
  exception when exclusion_violation then
    insert into public.booking_events (booking_id, kind) values (booking.id, 'paid_after_slot_taken');

    return 'slot_taken';
  end;

  insert into public.booking_events (booking_id, kind, data)
  values (booking.id, 'confirmed', jsonb_build_object('payment_intent', intent));

  return 'confirmed';
end;
$$;

/** For the paying browser: its booking's status, by the hold's id and secret. */
create function public.get_booking_status(target uuid, secret text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('status', status, 'ref', ref, 'starts_at', starts_at, 'ends_at', ends_at)
  from public.bookings
  where id = target and hold_secret_hash = sha256(convert_to(coalesce(secret, ''), 'UTF8'))
$$;

revoke execute on function
  public.checkout_booking(uuid, text, jsonb, text, jsonb, double precision, double precision, uuid),
  public.confirm_booking_payment(text),
  public.get_booking_status(uuid, text)
  from public, anon, authenticated;

grant execute on function
  public.checkout_booking(uuid, text, jsonb, text, jsonb, double precision, double precision, uuid),
  public.confirm_booking_payment(text)
  to service_role;

grant execute on function public.get_booking_status(uuid, text) to anon, authenticated;
