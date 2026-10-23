begin;
select plan(20);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('b1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@links.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Crown Studio', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@links.test')
  ), '{}'),
  ('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'nia@links.test', '{"first_name": "Nia", "last_name": "Okafor", "phone": "07700900123"}', '{}'),
  ('b3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'kemi@links.test', '{"first_name": "Kemi"}', '{}');

update public.profiles set first_name = 'Nia', last_name = 'Okafor', phone = '07700900123'
where id = 'b2222222-2222-2222-2222-222222222222';

create function pg_temp.book(client uuid, contact jsonb, days integer default 3, booking_status text default 'confirmed')
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, client_id, service_id, choices, snapshot, price_pence, fee_pence, minutes,
    starts_at, ends_at, block_ends_at, status, contact, terms, created_by, overlap_ok)
  select stylists.id, client, (select id from public.services where stylist_id = stylists.id order by sort limit 1),
    '{}', '{"service_name": "Silk press"}', 6000, 140, 60, now() + make_interval(days => days),
    now() + make_interval(days => days, hours => 1), now() + make_interval(days => days, hours => 1), booking_status,
    contact, '{"mode": "deposit"}', 'client', true
  from public.stylists where owner_id = 'b1111111-1111-1111-1111-111111111111'
  returning id
$$;

create function pg_temp.record_of(booking uuid)
returns public.stylist_clients
language sql
as $$
  select stylist_clients.* from public.stylist_clients
  join public.bookings on bookings.stylist_client_id = stylist_clients.id
  where bookings.id = booking
$$;

create temp table ids as
select pg_temp.book('b2222222-2222-2222-2222-222222222222',
  '{"first": "Nia", "last": "Okafor", "email": "nia@links.test", "phone": "07700900123"}') as signed_in;

select is((pg_temp.record_of((select signed_in from ids))).client_id, 'b2222222-2222-2222-2222-222222222222'::uuid,
  'a signed-in booking links the stylist''s client record to the account');

alter table ids add column guest uuid;
update ids set guest = pg_temp.book(null, '{"first": "Nia", "email": "NIA@links.test"}', 5);

select is((pg_temp.record_of((select guest from ids))).id, (pg_temp.record_of((select signed_in from ids))).id,
  'a guest booking under the same email joins the same record');

select is((select count(*) from public.stylist_clients where client_id = 'b2222222-2222-2222-2222-222222222222'),
  1::bigint, 'and doesn''t add or change a link');

-- the stylist renames the client, then the client renames themselves: the stylist's name stays
update public.stylist_clients set first = 'Nia (braids)'
where client_id = 'b2222222-2222-2222-2222-222222222222';

update public.profiles set first_name = 'Nina' where id = 'b2222222-2222-2222-2222-222222222222';

select is((pg_temp.record_of((select signed_in from ids))).first, 'Nia (braids)',
  'a name the stylist changed is kept');

update public.stylist_clients set first = 'Nina' where client_id = 'b2222222-2222-2222-2222-222222222222';
update public.profiles set first_name = 'Nini', last_name = 'Okafor-Bello' where id = 'b2222222-2222-2222-2222-222222222222';

select is((select first || ' ' || last from public.stylist_clients where client_id = 'b2222222-2222-2222-2222-222222222222'),
  'Nini Okafor-Bello', 'an untouched name follows the account');

update public.profiles set phone = '+44 7700 900999' where id = 'b2222222-2222-2222-2222-222222222222';

select is((pg_temp.record_of((select signed_in from ids))).phone, '07700900999', 'a new mobile always reaches the record');

select is((select contact ->> 'phone' from public.bookings where id = (select signed_in from ids)), '07700900999',
  'and the upcoming booking');

-- an older guest record under the email the client is about to switch to
create temp table other as
select public.match_stylist_client(stylists.id, '{"first": "N", "email": "nia.new@links.test"}') as id
from public.stylists where owner_id = 'b1111111-1111-1111-1111-111111111111';

update public.stylist_clients set hair_notes = 'Prefers mornings', photo_path = 'old/photo.jpg',
  blocked_at = now()
where id = (select id from other);

update public.stylist_clients set hair_notes = 'Type 4C'
where client_id = 'b2222222-2222-2222-2222-222222222222';

alter table ids add column old_guest uuid;
update public.stylist_clients set blocked_at = null where id = (select id from other);
update ids set old_guest = pg_temp.book(null, '{"first": "N", "email": "nia.new@links.test"}', -30, 'completed');
update public.stylist_clients set blocked_at = now() where id = (select id from other);

alter table ids add column upcoming_guest uuid;
update public.stylist_clients set blocked_at = null where id = (select id from other);
update ids set upcoming_guest = pg_temp.book(null, '{"first": "N", "email": "nia.new@links.test"}', 11);
update public.stylist_clients set blocked_at = now() where id = (select id from other);

select public.create_booking_token((select upcoming_guest from ids), 'manage', now() + interval '1 day');
select public.create_booking_token((select signed_in from ids), 'manage', now() + interval '1 day');

update auth.users set email = 'nia.new@links.test' where id = 'b2222222-2222-2222-2222-222222222222';

select is((pg_temp.record_of((select signed_in from ids))).email, 'nia.new@links.test',
  'a confirmed new email reaches the linked record');

select is((select contact ->> 'email' from public.bookings where id = (select signed_in from ids)), 'nia.new@links.test',
  'and the upcoming booking');

select is((select count(*) from public.stylist_clients where id = (select id from other)), 0::bigint,
  'the other record with that email is merged away');

select is((pg_temp.record_of((select old_guest from ids))).client_id, 'b2222222-2222-2222-2222-222222222222'::uuid,
  'its bookings move to the linked record');

select is((pg_temp.record_of((select signed_in from ids))).hair_notes, E'Type 4C\n\nPrefers mornings',
  'both sets of hair notes are kept');

select is((pg_temp.record_of((select signed_in from ids))).photo_path, 'old/photo.jpg',
  'it takes the other photo, having none');

select isnt((pg_temp.record_of((select signed_in from ids))).blocked_at, null, 'and the block carries over');

select is((select count(*) from public.booking_tokens where booking_id = (select upcoming_guest from ids)), 1::bigint,
  'a merged-in booking already on the new email keeps its manage link');

select is((select count(*) from public.booking_tokens where booking_id = (select signed_in from ids)), 0::bigint,
  'one whose email changed loses the link sent to the old address');

update public.stylist_clients set blocked_at = null where client_id = 'b2222222-2222-2222-2222-222222222222';

alter table ids add column after_change uuid;
update ids set after_change = pg_temp.book('b2222222-2222-2222-2222-222222222222',
  '{"first": "Nini", "email": "nia.renamed@links.test"}', 7);

select is((pg_temp.record_of((select after_change from ids))).id, (pg_temp.record_of((select signed_in from ids))).id,
  'a signed-in booking finds the linked record even under a different email');

alter table ids add column someone_else uuid;
update ids set someone_else = pg_temp.book('b3333333-3333-3333-3333-333333333333',
  '{"first": "Kemi", "email": "nia.new@links.test"}', 9);

select is((pg_temp.record_of((select signed_in from ids))).client_id, 'b2222222-2222-2222-2222-222222222222'::uuid,
  'a record linked to one account is never moved to another');

update public.bookings set status = 'cancelled' where stylist_client_id = (pg_temp.record_of((select signed_in from ids))).id;
delete from public.payments where booking_id in (select id from public.bookings
  where stylist_client_id = (pg_temp.record_of((select signed_in from ids))).id);

create temp table linked_record as select (pg_temp.record_of((select signed_in from ids))).id as id;

select set_config('request.jwt.claims', json_build_object('sub', 'b1111111-1111-1111-1111-111111111111',
  'role', 'authenticated')::text, true);

select lives_ok($$ select public.delete_stylist_client((select id from linked_record)) $$,
  'the stylist can delete the linked client');

select is((select client_id from public.stylist_clients where id = (select id from linked_record)), null,
  'which drops the account link');

select * from finish();
rollback;
