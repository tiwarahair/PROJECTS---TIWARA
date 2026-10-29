begin;
select plan(5);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values
  ('ca111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'owner@purge.test',
    jsonb_build_object(
      'account_type', 'stylist', 'first_name', 'Purge', 'last_name', 'Owner', 'phone', '07700900456',
      'terms_version', '2026-10',
      'stylist', jsonb_build_object('business_name', 'Purge Test', 'business_type', 'shop', 'line1', '1 High St',
        'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24,
        'categories', jsonb_build_array('braids'), 'contact_email', 'shop@purge.test')
    ), '{}'),
  ('ca222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'client@purge.test', '{"first_name": "Ada"}', '{}');

create function pg_temp.hold(hold_status text, expired_ago interval)
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
    ends_at, block_ends_at, status, hold_expires_at, contact, terms, created_by, overlap_ok)
  select stylists.id, (select id from public.services where stylist_id = stylists.id order by sort limit 1), '{}',
    '{"service_name": "Silk press"}', 5000, 0, 60, now() + interval '5 days', now() + interval '5 days 1 hour',
    now() + interval '5 days 1 hour', hold_status, now() - expired_ago, '{"first": "Ada"}', '{"mode": "none"}',
    'client', true
  from public.stylists where slug = 'purge-test'
  returning id
$$;

create temp table b as
select
  pg_temp.hold('expired', interval '2 days') as old_expired,
  pg_temp.hold('held', interval '2 days') as old_held,
  pg_temp.hold('expired', interval '1 hour') as recent,
  pg_temp.hold('expired', interval '2 days') as paid;

insert into public.payments (booking_id, kind, amount_pence, platform_fee_pence) select paid, 'booking', 5000, 0 from b;

insert into public.account_codes (user_id, code_hash, expires_at, created_at)
values
  ('ca222222-2222-2222-2222-222222222222', '\x01', now() - interval '2 days', now() - interval '2 days'),
  ('ca222222-2222-2222-2222-222222222222', '\x02', now() + interval '10 minutes', now());

select public.purge_expired_booking_tokens();

select is(
  (select count(*) from public.bookings where id in ((select old_expired from b), (select old_held from b))),
  0::bigint, 'holds a day past their expiry are removed'
);
select ok(exists (select 1 from public.bookings where id = (select recent from b)), 'a hold that just ran out stays');
select ok(exists (select 1 from public.bookings where id = (select paid from b)), 'one with a payment stays');
select is(
  (select count(*) from public.account_codes where user_id = 'ca222222-2222-2222-2222-222222222222'),
  1::bigint, 'account codes over a day old are removed'
);
select ok(
  exists (select 1 from public.account_codes where code_hash = '\x02'), 'and a fresh one stays'
);

select * from finish();
rollback;
