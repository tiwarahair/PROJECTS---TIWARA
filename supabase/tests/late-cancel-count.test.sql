begin;
select plan(2);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('ae111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@late-cancel.test', jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Late Cancel Studio', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'owner@late-cancel.test')
  ), '{}');

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('ae222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'nia@late-cancel.test', '{"first_name": "Nia"}', '{}');

-- no policy, so no fee is ever charged: lateness comes from when, and by whom, it was cancelled
insert into public.bookings (stylist_id, client_id, service_id, choices, snapshot, price_pence, fee_pence, minutes,
  starts_at, ends_at, block_ends_at, status, contact, terms, created_by, overlap_ok, cancelled_at, cancelled_by)
select stylists.id, 'ae222222-2222-2222-2222-222222222222',
  (select id from public.services where stylist_id = stylists.id order by sort limit 1), '{}',
  '{"service_name": "Silk press"}', 6000, 140, 60, starts, starts + interval '1 hour', starts + interval '1 hour',
  'cancelled', '{"first": "Nia", "email": "nia@late-cancel.test"}',
  jsonb_build_object('mode', 'none', 'free_cancel_until', starts - interval '48 hours'), 'client', true,
  starts - cancelled_before, who
from public.stylists,
  (values
    (now() + interval '1 day', interval '2 hours', 'client'),
    (now() + interval '2 days', interval '3 hours', 'client'),
    (now() + interval '3 days', interval '5 days', 'client'),
    (now() + interval '4 days', interval '1 hour', 'stylist')
  ) as cancels (starts, cancelled_before, who)
where stylists.owner_id = 'ae111111-1111-1111-1111-111111111111';

select set_config('request.jwt.claims',
  json_build_object('sub', 'ae111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

create temp table counted as
select late_cancels from public.get_studio_clients(
  (select id from public.stylists where owner_id = 'ae111111-1111-1111-1111-111111111111'));

select is((select count(*) from counted), 1::bigint, 'the client has one row');

select is((select late_cancels from counted), 2,
  'both client cancellations after the cutoff count, with no fee; the early one and the stylist''s own don''t');

select * from finish();
rollback;
