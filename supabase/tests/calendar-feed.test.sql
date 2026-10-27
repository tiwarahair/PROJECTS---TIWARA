begin;
select plan(6);

create function pg_temp.open_business(user_id uuid)
returns uuid
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', user_id || '@feed.test',
    jsonb_build_object(
      'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
      'terms_version', '2026-10',
      'stylist', jsonb_build_object('business_name', 'Feed ' || user_id, 'business_type', 'shop',
        'line1', '1 High St', 'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24,
        'categories', jsonb_build_array('braids'), 'contact_email', 'a@feed.test')
    ), '{}');

  select id from public.stylists where owner_id = user_id
$$;

create function pg_temp.book(stylist uuid, booking_status text, starts timestamptz)
returns void
language sql
as $$
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
    ends_at, block_ends_at, status, contact, terms, created_by, overlap_ok)
  select stylist, (select id from public.services where stylist_id = stylist order by sort limit 1), '{}',
    '{"service_name": "Silk press"}', 5000, 0, 60, starts, starts + interval '1 hour', starts + interval '1 hour',
    booking_status, '{"first": "Ada", "email": "ada@feed.test", "phone": "07700900123"}', '{"mode": "none"}', 'stylist',
    true
$$;

create temp table ids as
select
  pg_temp.open_business('c1111111-1111-1111-1111-111111111111') as mine,
  pg_temp.open_business('c2222222-2222-2222-2222-222222222222') as other;

select pg_temp.book((select mine from ids), 'confirmed', now() + interval '2 days');
select pg_temp.book((select mine from ids), 'awaiting_confirmation', now() + interval '3 days');
select pg_temp.book((select mine from ids), 'cancelled', now() + interval '4 days');
select pg_temp.book((select mine from ids), 'completed', now() - interval '60 days');

create temp table feed as
select calendar_feed_key as feed_key from public.stylist_private where stylist_id = (select mine from ids);

select is(
  (select jsonb_agg(event ->> 'status' order by event ->> 'starts_at')
    from jsonb_array_elements(public.get_calendar_feed((select feed_key from feed))) event),
  '["confirmed", "awaiting_confirmation", "cancelled"]'::jsonb,
  'each booking with its status, not those over 30 days ago');

select ok(
  not (public.get_calendar_feed((select feed_key from feed)) -> 0 ?| array['email', 'phone', 'contact']),
  'only the client''s first name, no contact details');

select is(public.get_calendar_feed('not-a-key'), null, 'a wrong key gets nothing');

grant select on ids, feed to authenticated;

select set_config('request.jwt.claims',
  json_build_object('sub', 'c2222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
set local role authenticated;

select throws_ok($$ select public.reset_calendar_feed((select mine from ids)) $$, 'not_owner',
  'another stylist can''t reset it');

reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', 'c1111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

create temp table fresh as select public.reset_calendar_feed((select mine from ids)) as feed_key;

reset role;

select is(public.get_calendar_feed((select feed_key from feed)), null, 'after a reset the old link stops working');

select is(jsonb_array_length(public.get_calendar_feed((select feed_key from fresh))), 3, 'and the new one works');

select * from finish();
rollback;
