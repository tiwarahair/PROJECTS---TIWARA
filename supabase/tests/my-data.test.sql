begin;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data)
values ('d1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@mydata.test', now(),
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Crown Studio', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@mydata.test')
  ), '{}'),
  ('d2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'nia@mydata.test', now(), '{"first_name": "Nia"}', '{}'),
  ('d3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'kemi@mydata.test', now(), '{"first_name": "Kemi"}', '{}');

update public.profiles set stripe_customer_id = 'cus_secret', calendar_secret = 'calsecret'
where id = 'd2222222-2222-2222-2222-222222222222';

create function pg_temp.book(client uuid, email text, notes text)
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, client_id, service_id, choices, snapshot, price_pence, fee_pence, minutes,
    starts_at, ends_at, block_ends_at, status, contact, notes, allergies, terms, created_by)
  select stylists.id, client, (select id from public.services where stylist_id = stylists.id order by sort limit 1),
    '{}', '{"service_name": "Silk press"}', 6000, 140, 60, now() - interval '3 days',
    now() - interval '3 days' + interval '1 hour', now() - interval '3 days' + interval '1 hour', 'completed',
    jsonb_build_object('first', 'Someone', 'email', email), notes, 'Sensitive scalp', '{"mode": "deposit"}', 'client'
  from public.stylists where owner_id = 'd1111111-1111-1111-1111-111111111111'
  returning id
$$;

create temp table ids as
select pg_temp.book('d2222222-2222-2222-2222-222222222222', 'nia@mydata.test', 'Nia linked') as linked,
  pg_temp.book(null, 'NIA@mydata.test', 'Nia as guest') as guest,
  pg_temp.book('d3333333-3333-3333-3333-333333333333', 'kemi@mydata.test', 'Kemi only') as other;

insert into public.payments (booking_id, kind, amount_pence, platform_fee_pence)
values ((select linked from ids), 'booking', 6140, 140), ((select other from ids), 'booking', 7000, 140);

insert into public.client_addresses (client_id, label, line1, town, postcode, lat, lng)
values ('d2222222-2222-2222-2222-222222222222', 'Home', '2 Low St', 'Manchester', 'M2 2BB', 53.48, -2.24),
  ('d3333333-3333-3333-3333-333333333333', 'Work', '9 Kemi Rd', 'Leeds', 'LS1 1AA', 53.8, -1.55);

insert into public.favourites (client_id, stylist_id)
select 'd2222222-2222-2222-2222-222222222222', id from public.stylists
where owner_id = 'd1111111-1111-1111-1111-111111111111';

insert into public.notifications (channel, to_address, template, payload)
values ('email', 'nia@mydata.test', 'booking_confirmed', '{"secret": "payload-stays-out"}'),
  ('email', 'kemi@mydata.test', 'booking_confirmed', '{}');

select set_config('request.jwt.claims', json_build_object('sub', 'd2222222-2222-2222-2222-222222222222',
  'role', 'authenticated')::text, true);
set local role authenticated;

create temp table export as select public.get_my_data() as data;

select is((select data #>> '{account,email}' from export), 'nia@mydata.test', 'the export is the signed-in client''s');

select is((select jsonb_array_length(data -> 'bookings') from export), 2,
  'with their own bookings and the guest ones under their email');

select ok((select data::text like '%Nia linked%' and data::text like '%Nia as guest%' from export),
  'including the notes they wrote');

select ok((select data::text not like '%Kemi%' from export), 'and nothing of another client''s');

select is((select data #>> '{bookings,0,payments,0,amount_pence}' from export)::integer, 6140,
  'what they paid is there');

select is((select jsonb_array_length(data -> 'addresses') from export), 1, 'their saved address');
select is((select data #>> '{favourites,0,stylist}' from export), 'Crown Studio', 'their favourites');
select is((select jsonb_array_length(data -> 'emails_and_texts') from export), 1, 'the emails sent to them');

select ok((select data::text not like '%cus_secret%' and data::text not like '%calsecret%'
  and data::text not like '%payload-stays-out%' from export),
  'but no payment or calendar secrets and no email contents');

select ok((select data::text not like '%platform_fee%' from export), 'and no internal bookkeeping');

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select throws_ok($$ select public.get_my_data() $$, '42501', null, 'nobody signed out can ask');

select * from finish();
rollback;
