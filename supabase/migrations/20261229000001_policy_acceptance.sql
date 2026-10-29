create or replace function public.checkout_booking(
  target uuid, secret text, contact jsonb, notes text, address jsonb, client_lat double precision,
  client_lng double precision, client uuid
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
    -- paid already (a reload while the payment was confirming): say so rather than "not held"
    if exists (
      select 1 from public.bookings
      where id = target and status = 'confirmed'
        and hold_secret_hash = sha256(convert_to(coalesce(secret, ''), 'UTF8'))
    ) then
      raise exception 'already_paid';
    end if;

    raise exception 'hold_not_found';
  end if;

  select * into stylist from public.stylists where id = held.stylist_id;

  if public.has_unpaid_fee(stylist.id, checkout_booking.contact, client) then
    raise exception 'unpaid_fee';
  end if;

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
      'free_cancel_until', held.starts_at - make_interval(secs => policy.free_window_hours * 3600),
      'agreement', case when policy.mode in ('deposit', 'card') and client is null
        then 'By booking, you agree to ' || stylist.business_name || '''s cancellation policy and our Terms.' end
    ),
    due_today_pence = due,
    policy_accepted_at = now()
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

create or replace function public.get_dispute_evidence(target uuid, owner uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'stripe_dispute_id', disputes.stripe_dispute_id,
    'status', disputes.status,
    'outcome', disputes.outcome,
    'evidence', disputes.evidence,
    'client_name', concat_ws(' ', bookings.contact ->> 'first', bookings.contact ->> 'last'),
    'client_email', bookings.contact ->> 'email',
    'service_name', bookings.snapshot ->> 'service_name',
    'starts_at', bookings.starts_at,
    'arrived_at', bookings.arrived_at,
    'completed_at', bookings.completed_at,
    'terms', bookings.terms,
    'policy_accepted_at', bookings.policy_accepted_at,
    'lines', bookings.checkout -> 'lines',
    'final_pence', coalesce(bookings.final_price_pence, bookings.price_pence),
    'business_name', stylists.business_name
  )
  from public.disputes
  join public.stylists on stylists.id = disputes.stylist_id
  left join public.bookings on bookings.id = disputes.booking_id
  where disputes.id = target and stylists.owner_id = owner
$$;
