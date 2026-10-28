begin;
select plan(4);

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
  ('ab111111-1111-1111-1111-111111111111'::uuid, 'owner@activity-reads.test', 'Read Studio'),
  ('ab333333-3333-3333-3333-333333333333'::uuid, 'other@activity-reads.test', 'Other Studio')
) as stylists (id, email, business);

create temp table studio as
select id from public.stylists where owner_id = 'ab111111-1111-1111-1111-111111111111';
grant select on studio to authenticated;

insert into public.payouts (stylist_id, stripe_payout_id, amount_pence, status, status_at)
select id, payout, 900, 'paid', now() - offset_by
from studio, (values ('po_reads_1', interval '2 hours'), ('po_reads_2', interval '1 hour')) as items (payout, offset_by);

create function pg_temp.sign_in(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true)
$$;

create function pg_temp.unread_count()
returns bigint
language sql
as $$
  select count(*) from public.get_studio_activity((select id from studio), 30) where is_unread
$$;

select pg_temp.sign_in('ab111111-1111-1111-1111-111111111111');
set local role authenticated;

select is(pg_temp.unread_count(), 2::bigint, 'both payouts start unread');

select public.mark_activity_read((select id from studio),
  (select id from public.get_studio_activity((select id from studio), 30) order by at limit 1));

select is(pg_temp.unread_count(), 1::bigint, 'opening the older one reads only that one');

select public.mark_activity_read((select id from studio),
  (select id from public.get_studio_activity((select id from studio), 30) order by at limit 1));

select is(pg_temp.unread_count(), 1::bigint, 'opening it again is harmless');

select pg_temp.sign_in('ab333333-3333-3333-3333-333333333333');

select public.mark_activity_read((select id from studio),
  (select id from public.get_studio_activity((select id from studio), 30) order by at desc limit 1));

reset role;

select is((select count(*) from public.stylist_activity_reads where stylist_id = (select id from studio)), 1::bigint,
  'another stylist can''t mark this studio''s activity read');

select * from finish();
rollback;
