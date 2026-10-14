begin;
select plan(19);

create function pg_temp.open_business(user_id uuid, business text, business_type text, lat float8, radius int)
returns uuid
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', user_id || '@public.test',
    jsonb_build_object(
      'account_type', 'stylist', 'first_name', 'Pub', 'last_name', 'Lic', 'phone', '07700900456', 'terms_version', '2026-10',
      'stylist', jsonb_build_object('business_name', business, 'business_type', business_type, 'line1', '1 High St',
        'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', lat, 'lng', -2.24, 'travel_radius_miles', radius,
        'categories', jsonb_build_array('braids'), 'contact_email', 'pub@public.test', 'contact_phone', '07700900999')
    ), '{}');

  update public.services set status = 'active', price_pence = 5000, duration_min = 60
  where stylist_id = (select id from public.stylists where owner_id = user_id);

  update public.working_hours set is_open = true, start_time = '09:00', end_time = '18:00'
  where stylist_id = (select id from public.stylists where owner_id = user_id);

  select id from public.stylists where owner_id = user_id
$$;

create temp table ids as
select
  pg_temp.open_business('d1111111-1111-1111-1111-111111111111', 'Public Shop Test', 'shop', 53.48, null) as shop,
  pg_temp.open_business('d2222222-2222-2222-2222-222222222222', 'Public Mobile Test', 'mobile', 53.53, 5) as mobile,
  pg_temp.open_business('d3333333-3333-3333-3333-333333333333', 'Public Draft Test', 'shop', 53.48, null) as draft,
  ((now() at time zone 'Europe/London')::date + 3) as day;
grant select on ids to anon, authenticated;

update public.stylists set status = 'live' where id in ((select shop from ids), (select mobile from ids));

select is(public.booking_fee_pence(5000), 125, 'booking fee is 50p + 1.5%');
select is(public.booking_fee_pence(8033), 170, 'booking fee rounds to the penny');

set local role anon;

select is(
  (select array_agg(slug order by slug) from public.search_stylists(search_text => 'Public')),
  array['public-mobile-test', 'public-shop-test'],
  'search shows live stylists only'
);
select is(
  (select from_pence from public.search_stylists(search_text => 'Public Shop')),
  5125,
  'the from price includes the booking fee'
);
select is(
  (select count(*)::int from public.search_stylists(search_text => 'Public', max_price_pence => 5124)),
  0,
  'the price filter compares the fee-inclusive price'
);
select is(
  (select slug from public.search_stylists(lat => 53.47, lng => -2.24, radius_miles => 10, search_text => 'Public') limit 1),
  'public-mobile-test',
  'a mobile stylist whose radius covers the point sorts first'
);
select is(
  (select array_agg(slug) from public.search_stylists(lat => 53.45, lng => -2.24, radius_miles => 10, search_text => 'Public')),
  array['public-shop-test'],
  'a mobile stylist is hidden outside their travel radius'
);
select is(
  (select array_agg(slug) from public.search_stylists(venues => array['mobile'], search_text => 'Public')),
  array['public-mobile-test'],
  'venue filter'
);
select is(
  (select array_agg(slug order by slug) from (
    select slug from public.search_stylists(search_text => 'Public', page_size => 1, page => 0)
    union all
    select slug from public.search_stylists(search_text => 'Public', page_size => 1, page => 1)
  ) as pages),
  array['public-mobile-test', 'public-shop-test'],
  'pages never repeat or skip'
);
select is(
  (select total_count::int from public.search_stylists(search_text => 'Public', page_size => 1)),
  2,
  'each row carries the total'
);
select throws_ok(
  $$select public.get_next_start((select shop from ids), 60, null, null, null)$$,
  '42501', null, 'the slot helper is not callable directly'
);

reset role;

insert into public.time_blocks (stylist_id, starts_on, start_time, end_time)
values ((select shop from ids), (select day from ids), '09:00', '17:00');

select is(
  (select next_start at time zone 'Europe/London' from public.search_stylists(on_date => (select day from ids), search_text => 'Public Shop')),
  (select day from ids) + time '17:00',
  'blocked time pushes the next start back'
);

insert into public.closed_periods (stylist_id, starts_on, ends_on)
values ((select shop from ids), (select day from ids), (select day from ids));

select is(
  (select count(*)::int from public.search_stylists(on_date => (select day from ids), search_text => 'Public Shop')),
  0,
  'closed days have no openings'
);

update public.stylists set pause_on = true where id = (select mobile from ids);

select is(
  (select next_start from public.search_stylists(search_text => 'Public Mobile')),
  null,
  'no openings while online bookings are paused'
);
select is(
  (select count(*)::int from public.search_stylists(search_text => 'Public', page => -1, page_size => 0)),
  1,
  'a bad page or page size still returns the first row'
);

set local role anon;

select ok(
  not (public.get_stylist_profile('public-shop-test') ?| array['location', 'contact_phone', 'owner_id']),
  'a profile has no location, phone or owner'
);
select is(public.get_stylist_profile('public-draft-test'), null, 'a draft profile is hidden');

reset role;
insert into public.stylist_slug_history (slug, stylist_id) values ('old-public-shop', (select shop from ids));
set local role anon;

select is(
  public.get_stylist_profile('old-public-shop') ->> 'slug',
  'public-shop-test',
  'a retired slug finds the profile, with its current slug'
);

reset role;
select set_config('request.jwt.claims', json_build_object('sub', 'd3333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  public.get_stylist_profile('public-draft-test') ->> 'business_name',
  'Public Draft Test',
  'the owner previews their own draft'
);

select * from finish();
rollback;
