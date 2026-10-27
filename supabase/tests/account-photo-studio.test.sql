begin;
select plan(5);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email,
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', business, 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', email)
  ), '{}'
from (values
  ('a9111111-1111-1111-1111-111111111111'::uuid, 'owner@photo-studio.test', 'Crown Studio'),
  ('a9333333-3333-3333-3333-333333333333'::uuid, 'other@photo-studio.test', 'Other Studio')
) as stylists (id, email, business);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('a9222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'nia@photo-studio.test', '{"first_name": "Nia"}', '{}');

update public.profiles set photo_path = 'a9222222-2222-2222-2222-222222222222/photo.jpg'
where id = 'a9222222-2222-2222-2222-222222222222';

insert into storage.objects (bucket_id, name, owner_id)
values ('account-photos', 'a9222222-2222-2222-2222-222222222222/photo.jpg', 'a9222222-2222-2222-2222-222222222222');

insert into public.bookings (stylist_id, client_id, service_id, choices, snapshot, price_pence, fee_pence, minutes,
  starts_at, ends_at, block_ends_at, status, contact, terms, created_by, overlap_ok)
select stylists.id, 'a9222222-2222-2222-2222-222222222222',
  (select id from public.services where stylist_id = stylists.id order by sort limit 1), '{}',
  '{"service_name": "Silk press"}', 6000, 140, 60, now() - interval '5 days', now() - interval '5 days' + interval '1 hour',
  now() - interval '5 days' + interval '1 hour', 'completed', '{"first": "Nia", "email": "nia@photo-studio.test"}',
  '{"mode": "deposit"}', 'client', true
from public.stylists where owner_id = 'a9111111-1111-1111-1111-111111111111';

create temp table linked as
select id from public.stylist_clients where client_id = 'a9222222-2222-2222-2222-222222222222';
grant select on linked to authenticated;

create function pg_temp.sign_in(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true)
$$;

select pg_temp.sign_in('a9111111-1111-1111-1111-111111111111');
set local role authenticated;

select is((select count(*) from storage.objects where bucket_id = 'account-photos'), 1::bigint,
  'the stylist a client booked while signed in can see their account photo');

select is((select account_photo_path from public.get_studio_clients(
    (select id from public.stylists where owner_id = 'a9111111-1111-1111-1111-111111111111'))),
  'a9222222-2222-2222-2222-222222222222/photo.jpg', 'and Studio''s client list points to it');

reset role;
select pg_temp.sign_in('a9333333-3333-3333-3333-333333333333');
set local role authenticated;

select is((select count(*) from storage.objects where bucket_id = 'account-photos'), 0::bigint,
  'a stylist they haven''t booked can''t');

reset role;
update public.stylist_clients set deleted_at = now(), client_id = null where id = (select id from linked);
select pg_temp.sign_in('a9111111-1111-1111-1111-111111111111');
set local role authenticated;

select is((select count(*) from storage.objects where bucket_id = 'account-photos'), 0::bigint,
  'nor can the stylist once they''ve deleted the client');

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select is((select count(*) from storage.objects where bucket_id = 'account-photos'), 0::bigint,
  'and nobody signed out can');

select * from finish();
rollback;
