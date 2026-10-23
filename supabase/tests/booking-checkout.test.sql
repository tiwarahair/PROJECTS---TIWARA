begin;
select plan(26);

create function pg_temp.open_business(user_id uuid, business_type text, radius int)
returns uuid
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', user_id || '@pay.test',
    jsonb_build_object(
      'account_type', 'stylist', 'first_name', 'Pay', 'last_name', 'Ing', 'phone', '07700900456', 'terms_version', '2026-10',
      'stylist', jsonb_build_object('business_name', 'Pay ' || business_type, 'business_type', business_type,
        'line1', '1 High St', 'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24,
        'travel_radius_miles', radius, 'categories', jsonb_build_array('braids'), 'contact_email', 'pay@pay.test',
        'contact_phone', '07700900999')
    ), '{}');

  update public.services set status = 'active', price_pence = 5000, duration_min = 60
  where stylist_id = (select id from public.stylists where owner_id = user_id);

  update public.working_hours set is_open = true, start_time = '09:00', end_time = '18:00'
  where stylist_id = (select id from public.stylists where owner_id = user_id);

  update public.stylists set status = 'live', stripe_account_id = 'acct_' || business_type where owner_id = user_id;

  select id from public.stylists where owner_id = user_id
$$;

create function pg_temp.hold(stylist uuid, at_time text)
returns jsonb
language sql
as $$
  select public.hold_booking(
    (select id from public.services where stylist_id = stylist order by sort limit 1), '{}',
    (((now() at time zone 'Europe/London')::date + 3) + at_time::time) at time zone 'Europe/London'
  )
$$;

create function pg_temp.set_policy(stylist uuid, mode text, deposit_percent int default 0)
returns void
language sql
as $$
  insert into public.payment_policies (stylist_id, mode, deposit_percent, free_window_hours, created_at)
  values (stylist, mode, deposit_percent, 48, clock_timestamp())
$$;

create function pg_temp.checkout(held jsonb, lat float8 default null, lng float8 default null)
returns jsonb
language sql
as $$
  select public.checkout_booking((held ->> 'id')::uuid, held ->> 'secret',
    '{"first":"Nia","last":"Okafor","email":"nia@pay.test","phone":"07700900123"}', 'Tender scalp',
    case when lat is null then null else '{"line1":"2 Low St","postcode":"M1 2AA"}'::jsonb end, lat, lng, null)
$$;

create temp table ids as
select
  pg_temp.open_business('f1111111-1111-1111-1111-111111111111', 'shop', null) as shop,
  pg_temp.open_business('f2222222-2222-2222-2222-222222222222', 'mobile', 5) as mobile;

create temp table holds as
select
  pg_temp.hold((select shop from ids), '09:00') as deposit,
  pg_temp.hold((select shop from ids), '11:00') as full_price,
  pg_temp.hold((select shop from ids), '13:00') as fee_only,
  pg_temp.hold((select mobile from ids), '09:00') as mobile;

select throws_ok(
  format('select public.checkout_booking(%L, %L, ''{}'', null, null, null, null, null)', (select deposit ->> 'id' from holds), 'wrong'),
  'hold_not_found', 'a wrong secret is refused'
);

select pg_temp.set_policy((select shop from ids), 'deposit', 30);

create temp table deposit as select pg_temp.checkout((select deposit from holds)) as result;

select is((select (result ->> 'due_today_pence')::int from deposit), 1625, 'deposit: 30% of the price plus the fee');
select is((select result ->> 'mode' from deposit), 'deposit', 'the mode is returned for the payment');
select is((select result ->> 'stylist_account' from deposit), 'acct_shop', 'the stylist''s account is returned for the transfer');

select is(
  (select terms ->> 'free_cancel_until' from public.bookings where id = (select (deposit ->> 'id')::uuid from holds))::timestamptz,
  (select starts_at - interval '48 hours' from public.bookings where id = (select (deposit ->> 'id')::uuid from holds)),
  'the terms keep the free-cancellation deadline'
);

select is(
  (select contact ->> 'email' from public.bookings where id = (select (deposit ->> 'id')::uuid from holds)),
  'nia@pay.test', 'the contact details are kept'
);

select is(
  (select notes from public.bookings where id = (select (deposit ->> 'id')::uuid from holds)),
  'Tender scalp', 'the notes are kept'
);

select pg_temp.set_policy((select shop from ids), 'full');
select is((pg_temp.checkout((select full_price from holds)) ->> 'due_today_pence')::int, 5125, 'full: the price plus the fee');

select pg_temp.set_policy((select shop from ids), 'card');
select is((pg_temp.checkout((select fee_only from holds)) ->> 'due_today_pence')::int, 125, 'card on file: the fee only');

select pg_temp.set_policy((select shop from ids), 'none');
select is((pg_temp.checkout((select fee_only from holds)) ->> 'due_today_pence')::int, 125, 'pay at the appointment: the fee only');

select throws_ok(
  format('select pg_temp.checkout(%L::jsonb)', (select mobile from holds)),
  'address_required', 'mobile: an address is needed'
);

select throws_ok(
  format('select pg_temp.checkout(%L::jsonb, 53.90, -2.24)', (select mobile from holds)),
  'outside_area', 'mobile: an address outside the area is refused'
);

select is(
  (pg_temp.checkout((select mobile from holds), 53.50, -2.24) ->> 'due_today_pence')::int, 125,
  'mobile: an address inside the area is accepted'
);

select is(
  (select address ->> 'line1' from public.bookings where id = (select (mobile ->> 'id')::uuid from holds)),
  '2 Low St', 'mobile: the address is kept'
);

update public.bookings set hold_expires_at = now() - interval '1 second'
where id = (select (full_price ->> 'id')::uuid from holds);

select throws_ok(
  format('select pg_temp.checkout(%L::jsonb)', (select full_price from holds)),
  'hold_not_found', 'a lapsed hold is refused'
);

update public.bookings set stripe_payment_intent_id = 'pi_deposit' where id = (select (deposit ->> 'id')::uuid from holds);

select is(public.confirm_booking_payment('pi_deposit'), 'confirmed', 'a successful payment confirms the booking');

select is(
  (select status || ':' || (paid_at is not null) from public.bookings where stripe_payment_intent_id = 'pi_deposit'),
  'confirmed:true', 'the booking is confirmed and marked paid'
);

select is(public.confirm_booking_payment('pi_deposit'), 'duplicate', 'a repeated event changes nothing');
select throws_ok('select public.confirm_booking_payment(''pi_unknown'')', 'booking_not_found', 'an unknown payment is refused');

update public.bookings set status = 'expired', stripe_payment_intent_id = 'pi_late'
where id = (select (full_price ->> 'id')::uuid from holds);

select is(public.confirm_booking_payment('pi_late'), 'confirmed', 'paid late with the time still free: confirmed');

update public.bookings set status = 'expired', stripe_payment_intent_id = 'pi_taken'
where id = (select (fee_only ->> 'id')::uuid from holds);

select pg_temp.hold((select shop from ids), '13:00');

select is(public.confirm_booking_payment('pi_taken'), 'slot_taken', 'paid late with the time taken: refund');
select is((select status from public.bookings where stripe_payment_intent_id = 'pi_taken'), 'expired', 'and the booking stays expired');

select is(
  public.get_booking_status((select (deposit ->> 'id')::uuid from holds), (select deposit ->> 'secret' from holds)) ->> 'status',
  'confirmed', 'the status is readable with the secret'
);

select throws_ok(
  format('select pg_temp.checkout(%L::jsonb)', (select deposit from holds)),
  'already_paid', 'checking out a paid booking again says it is paid'
);

select is(
  public.get_booking_status((select (fee_only ->> 'id')::uuid from holds), (select fee_only ->> 'secret' from holds)) ->> 'status',
  'refunded', 'paid after the time was taken: the browser is told it was refunded'
);

select ok(
  has_function_privilege('anon', 'public.get_booking_status(uuid, text)', 'execute')
    and not has_function_privilege('anon', 'public.checkout_booking(uuid, text, jsonb, text, jsonb, double precision, double precision, uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.confirm_booking_payment(text, integer, uuid)', 'execute'),
  'browsers can only read the status; checkout and confirming are server-only'
);

select * from finish();
rollback;
