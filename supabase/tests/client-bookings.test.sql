begin;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('f1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@clientbookings.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Crown Studio', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@clientbookings.test')
  ), '{}'),
  ('f2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'nia@clientbookings.test', '{"first_name": "Nia"}', '{}'),
  ('f3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'kemi@clientbookings.test', '{"first_name": "Kemi"}', '{}');

create function pg_temp.book(client uuid, booking_status text, days integer)
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, client_id, service_id, choices, snapshot, price_pence, fee_pence, minutes,
    starts_at, ends_at, block_ends_at, status, contact, terms, created_by)
  select stylists.id, client, (select id from public.services where stylist_id = stylists.id order by sort limit 1),
    '{}', '{"service_name": "Silk press", "options": [], "addons": [], "colour": null}', 6000, 140, 60,
    now() + make_interval(days => days), now() + make_interval(days => days, hours => 1),
    now() + make_interval(days => days, hours => 1), booking_status, '{"first": "Nia"}', '{"mode": "deposit"}', 'client'
  from public.stylists where owner_id = 'f1111111-1111-1111-1111-111111111111'
  returning id
$$;

create temp table ids as
select
  pg_temp.book('f2222222-2222-2222-2222-222222222222', 'confirmed', 3) as upcoming,
  pg_temp.book('f2222222-2222-2222-2222-222222222222', 'cancelled', -5) as cancelled,
  pg_temp.book('f2222222-2222-2222-2222-222222222222', 'held', 4) as held,
  pg_temp.book('f3333333-3333-3333-3333-333333333333', 'confirmed', 6) as other;

insert into public.payments (booking_id, kind, amount_pence, platform_fee_pence)
values ((select cancelled from ids), 'booking', 1340, 140);

insert into public.refunds (booking_id, amount_pence, reason)
values ((select cancelled from ids), 1200, 'client_cancel');

grant select on ids to authenticated;

create function pg_temp.sign_in(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true)
$$;

select pg_temp.sign_in('f2222222-2222-2222-2222-222222222222');
set local role authenticated;

create temp table mine as select jsonb_array_elements(public.get_client_bookings()) as booking;

select is((select count(*) from mine), 2::bigint, 'a client sees their bookings, not holds or other clients''');

select is((select booking ->> 'id' from mine limit 1), (select upcoming::text from ids),
  'the latest appointment comes first');

select is((select booking ->> 'stylist_name' from mine limit 1), 'Crown Studio', 'with the stylist''s name');

select is(
  (select (booking -> 'payments' -> 0 ->> 'amount_pence')::integer from mine where booking ->> 'id' = (select cancelled::text from ids)),
  1340, 'with what they paid');

select is(
  (select (booking -> 'refunds' -> 0 ->> 'amount_pence')::integer from mine where booking ->> 'id' = (select cancelled::text from ids)),
  1200, 'and what came back');

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select throws_ok($$ select public.get_client_bookings() $$, '42501', null, 'signed-out visitors can''t call it');

select * from finish();
rollback;
