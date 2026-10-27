begin;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('e1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@calendar.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Crown Studio', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@calendar.test')
  ), '{}'),
  ('e2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'nia@calendar.test', '{"first_name": "Nia"}', '{}');

create function pg_temp.book(booking_status text, days integer, client uuid default 'e2222222-2222-2222-2222-222222222222')
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, client_id, service_id, choices, snapshot, price_pence, fee_pence, minutes,
    starts_at, ends_at, block_ends_at, status, contact, terms, created_by)
  select stylists.id, client, (select id from public.services where stylist_id = stylists.id order by sort limit 1),
    '{}', '{"service_name": "Silk press"}', 6000, 140, 60, now() + make_interval(days => days),
    now() + make_interval(days => days, hours => 1), now() + make_interval(days => days, hours => 1), booking_status,
    '{"first": "Nia", "email": "nia@calendar.test"}', '{"mode": "deposit"}', 'client'
  from public.stylists where owner_id = 'e1111111-1111-1111-1111-111111111111'
  returning id
$$;

select pg_temp.book('confirmed', 3), pg_temp.book('cancelled', 5), pg_temp.book('completed', -10),
  pg_temp.book('completed', -40), pg_temp.book('held', 7), pg_temp.book('confirmed', 4, null);

select set_config('request.jwt.claims', json_build_object('sub', 'e2222222-2222-2222-2222-222222222222',
  'role', 'authenticated')::text, true);
set local role authenticated;

create temp table secrets as select public.get_calendar_secret() as first;
alter table secrets add column again text, add column renewed text;
update secrets set again = public.get_calendar_secret();
update secrets set renewed = public.get_calendar_secret(true);

select ok((select first ~ '^[a-f0-9]{48}$' from secrets), 'the first visit makes a secret');
select is((select again from secrets), (select first from secrets), 'later visits keep it');
select isnt((select renewed from secrets), (select first from secrets), 'resetting makes a new one');

select throws_ok($$ select public.get_client_calendar((select renewed from secrets)) $$, '42501', null,
  'the feed isn''t readable from the browser');

reset role;

create temp table feed as select public.get_client_calendar((select renewed from secrets)) as events;

select is(jsonb_array_length((select events from feed)), 3,
  'the feed has the client''s bookings from 30 days ago on, without unpaid holds or guest bookings');

select is((select events -> 0 ->> 'starts_at' from feed)::timestamptz < now(), true, 'oldest first');

select is((select count(*) from jsonb_array_elements((select events from feed)) where value ->> 'status' = 'cancelled'),
  1::bigint, 'each booking says its status');

select is(public.get_client_calendar((select first from secrets)), null, 'the old link stops working');
select is(public.get_client_calendar('nope'), null, 'an unknown secret finds nothing');

select * from finish();
rollback;
