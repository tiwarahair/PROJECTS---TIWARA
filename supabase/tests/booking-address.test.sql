begin;
select plan(7);

create function pg_temp.open_business(user_id uuid, business_type text)
returns uuid
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', user_id || '@address.test',
    jsonb_build_object(
      'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
      'terms_version', '2026-10',
      'stylist', jsonb_build_object('business_name', 'Address ' || business_type, 'business_type', business_type,
        'line1', '1 High St', 'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24,
        'travel_radius_miles', case when business_type = 'mobile' then 5 end, 'categories', jsonb_build_array('braids'), 'contact_email', 'a@address.test')
    ), '{}');

  select id from public.stylists where owner_id = user_id
$$;

create function pg_temp.book(stylist uuid, booking_status text)
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
    ends_at, block_ends_at, status, contact, address, terms, created_by)
  select stylist, (select id from public.services where stylist_id = stylist order by sort limit 1), '{}',
    '{"service_name": "Silk press"}', 5000, 0, 60, now() + interval '2 days', now() + interval '2 days 1 hour',
    now() + interval '2 days 1 hour', booking_status, '{"first": "Ada", "email": "ada@address.test"}',
    '{"line1": "2 Low St", "notes": "Ring twice"}', '{"mode": "none"}', 'stylist'
  returning id
$$;

create temp table ids as
select
  pg_temp.open_business('b1111111-1111-1111-1111-111111111111', 'mobile') as mobile,
  pg_temp.open_business('b2222222-2222-2222-2222-222222222222', 'shop') as shop;

create temp table bookings as
select
  pg_temp.book((select mobile from ids), 'confirmed') as confirmed,
  pg_temp.book((select mobile from ids), 'cancelled') as cancelled,
  pg_temp.book((select shop from ids), 'confirmed') as shop;

grant select on ids, bookings to authenticated;

create function pg_temp.sign_in(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true)
$$;

select pg_temp.sign_in('b2222222-2222-2222-2222-222222222222');
set local role authenticated;

select throws_ok($$ select public.set_booking_address((select confirmed from bookings), '9 New Rd') $$,
  'not_found', 'another stylist can''t change the address');

select throws_ok($$ select public.set_booking_address((select shop from bookings), '9 New Rd') $$,
  'not_mobile', 'a shop''s bookings have no client address');

reset role;
select pg_temp.sign_in('b1111111-1111-1111-1111-111111111111');
set local role authenticated;

select public.set_booking_address((select confirmed from bookings), '  9 New Rd, M2 2BB ');

select throws_ok($$ select public.set_booking_address((select cancelled from bookings), '9 New Rd') $$,
  'edit_not_allowed', 'a cancelled booking keeps its address');

reset role;

select is((select address from public.bookings where id = (select confirmed from bookings)),
  '{"line1": "9 New Rd, M2 2BB"}'::jsonb, 'the new address is saved');

select is(
  (select data from public.booking_events where booking_id = (select confirmed from bookings) and kind = 'address_changed'),
  '{"by": "stylist", "to": "9 New Rd, M2 2BB", "from": {"line1": "2 Low St", "notes": "Ring twice"}}'::jsonb,
  'the change is logged');

select is(
  (select payload ->> 'where' from public.notifications
    where template = 'booking_updated_by_stylist' and to_address = 'ada@address.test'),
  '9 New Rd, M2 2BB', 'the client is emailed the new address');

select pg_temp.sign_in('b1111111-1111-1111-1111-111111111111');
set local role authenticated;
select public.set_booking_address((select confirmed from bookings), '');
reset role;

select is((select address from public.bookings where id = (select confirmed from bookings)), null,
  'clearing it removes the address');

select * from finish();
rollback;
