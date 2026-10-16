begin;
select plan(53);

create function pg_temp.open_business(user_id uuid, business text, business_type text, lat float8, radius int)
returns uuid
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', user_id || '@book.test',
    jsonb_build_object(
      'account_type', 'stylist', 'first_name', 'Book', 'last_name', 'Ing', 'phone', '07700900456', 'terms_version', '2026-10',
      'stylist', jsonb_build_object('business_name', business, 'business_type', business_type, 'line1', '1 High St',
        'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', lat, 'lng', -2.24, 'travel_radius_miles', radius,
        'categories', jsonb_build_array('braids'), 'contact_email', 'book@book.test', 'contact_phone', '07700900999')
    ), '{}');

  update public.services set status = 'active', price_pence = 5000, duration_min = 60
  where stylist_id = (select id from public.stylists where owner_id = user_id);

  update public.working_hours set is_open = true, start_time = '09:00', end_time = '18:00'
  where stylist_id = (select id from public.stylists where owner_id = user_id);

  select id from public.stylists where owner_id = user_id
$$;

create function pg_temp.service_of(stylist uuid, place int)
returns uuid
language sql
as $$ select id from public.services where stylist_id = stylist order by sort offset place limit 1 $$;

create function pg_temp.times(service uuid, day date, choices jsonb default '{}')
returns text[]
language sql
as $$
  select array_agg(to_char(slot at time zone 'Europe/London', 'HH24:MI') order by slot)
  from public.get_available_slots(service, choices, day, day) as slot
$$;

create function pg_temp.hold(
  service uuid, day date, at_time text, hold uuid default null, secret text default null,
  lat float8 default null, lng float8 default null
)
returns jsonb
language sql
as $$
  select public.hold_booking(service, '{}', (day + at_time::time) at time zone 'Europe/London', lat, lng, hold, secret)
$$;

-- the next last-Sunday-of-<month> at least 2 days away
create function pg_temp.next_change(month int)
returns date
language sql
as $$
  select min(candidate)
  from (
    select max(listed)::date as candidate
    from generate_series(extract(year from now())::int, extract(year from now())::int + 1) as years (year)
    cross join lateral generate_series(make_date(year, month, 25), make_date(year, month, 31), interval '1 day') as listed
    where extract(isodow from listed) = 7
    group by year
  ) as sundays
  where candidate >= (now() at time zone 'Europe/London')::date + 2
$$;

create temp table ids as
select
  pg_temp.open_business('e1111111-1111-1111-1111-111111111111', 'Book Shop Test', 'shop', 53.48, null) as shop,
  pg_temp.open_business('e2222222-2222-2222-2222-222222222222', 'Book Second Test', 'shop', 53.48, null) as second,
  pg_temp.open_business('e3333333-3333-3333-3333-333333333333', 'Book Mobile Test', 'mobile', 53.53, 5) as mobile,
  pg_temp.open_business('e4444444-4444-4444-4444-444444444444', 'Book Draft Test', 'shop', 53.48, null) as draft,
  ((now() at time zone 'Europe/London')::date + 3) as day;

update public.stylists set status = 'live' where id in ((select shop from ids), (select second from ids), (select mobile from ids));

create temp table svc as
select
  pg_temp.service_of((select shop from ids), 0) as shop,
  pg_temp.service_of((select shop from ids), 1) as priced,
  pg_temp.service_of((select second from ids), 0) as second,
  pg_temp.service_of((select second from ids), 1) as long,
  pg_temp.service_of((select mobile from ids), 0) as mobile,
  pg_temp.service_of((select draft from ids), 0) as draft;

-- open times
select is(array_length(pg_temp.times((select shop from svc), (select day from ids)), 1), 17, '30-minute grid: 17 starts for an hour in 9–6');
select is((pg_temp.times((select shop from svc), (select day from ids)))[1], '09:00', 'the first start is opening time');
select is((pg_temp.times((select shop from svc), (select day from ids)))[17], '17:00', 'the last start still ends by closing');

update public.services set duration_min = 180 where id = (select long from svc);
select is(
  (select times[array_length(times, 1)] from pg_temp.times((select long from svc), (select day from ids)) as times),
  '15:00', 'a 3-hour service never ends after closing'
);

select is(pg_temp.times((select shop from svc), (now() at time zone 'Europe/London')::date), null, 'nothing inside the 24-hour notice');
select is(pg_temp.times((select shop from svc), (select day from ids) + 120), null, 'nothing past the booking window');

insert into public.closed_periods (stylist_id, starts_on, ends_on)
values ((select shop from ids), (select day from ids) + 4, (select day from ids) + 4);
select is(pg_temp.times((select shop from svc), (select day from ids) + 4), null, 'closed days have no starts');

insert into public.time_blocks (stylist_id, starts_on, start_time, end_time)
values ((select shop from ids), (select day from ids) + 5, '12:00', '13:00');
select ok(
  not pg_temp.times((select shop from svc), (select day from ids) + 5) && array['11:30', '12:00', '12:30']
    and pg_temp.times((select shop from svc), (select day from ids) + 5) @> array['11:00', '13:00'],
  'blocked time is skipped, including starts that would run into it'
);

insert into public.time_blocks (stylist_id, starts_on, all_day, repeat)
values ((select shop from ids), (select day from ids) + 6, true, 'weekly');
select is(pg_temp.times((select shop from svc), (select day from ids) + 13), null, 'a weekly all-day block repeats');

update public.stylists set pause_on = true where id = (select second from ids);
select is(pg_temp.times((select second from svc), (select day from ids)), null, 'paused online bookings have no starts');
update public.stylists set pause_on = false where id = (select second from ids);

-- clock changes (London)
update public.booking_rules set max_notice_months = 12 where stylist_id = (select mobile from ids);
select is(array_length(pg_temp.times((select mobile from svc), pg_temp.next_change(10)), 1), 17, 'clocks going back: the same 17 starts');
select is(
  (select extract(hour from min(slot) at time zone 'UTC')::int
   from public.get_available_slots((select mobile from svc), '{}', pg_temp.next_change(10), pg_temp.next_change(10)) as slot),
  9, 'after clocks go back, 9:00 in London is 9:00 UTC'
);
select is(
  (select extract(hour from min(slot) at time zone 'UTC')::int
   from public.get_available_slots((select mobile from svc), '{}', pg_temp.next_change(3), pg_temp.next_change(3)) as slot),
  8, 'after clocks go forward, 9:00 in London is 8:00 UTC'
);

-- holding a start
create temp table holds as select pg_temp.hold((select shop from svc), (select day from ids), '10:00') as first;

select ok((select first ->> 'secret' from holds) is not null, 'a hold returns its secret');
select is(
  (select hold_expires_at from public.bookings where id = (select (first ->> 'id')::uuid from holds)),
  now() + interval '10 minutes', 'a hold lasts 10 minutes'
);
select throws_ok($$select pg_temp.hold((select shop from svc), (select day from ids), '10:00')$$, 'slot_taken', 'the same start can''t be held twice');
select throws_ok($$select pg_temp.hold((select shop from svc), (select day from ids), '10:30')$$, 'slot_taken', 'an overlapping start can''t be held');
select ok(not pg_temp.times((select shop from svc), (select day from ids)) && array['09:30', '10:00', '10:30'], 'held times leave the list');
select ok(
  (select array_agg(to_char(slot at time zone 'Europe/London', 'HH24:MI'))
   from public.get_available_slots((select shop from svc), '{}', (select day from ids), (select day from ids), (select (first ->> 'id')::uuid from holds)) as slot)
    @> array['09:30', '10:00', '10:30'],
  'the client''s own hold keeps its times in their list'
);
select lives_ok($$select pg_temp.hold((select second from svc), (select day from ids), '10:00')$$, 'another stylist can be booked at the same time');

alter table holds add column later jsonb;
update holds set later = pg_temp.hold((select shop from svc), (select day from ids), '11:00');
select ok((select later ->> 'id' from holds) is not null, 'the next free start can be held');

select is(
  (pg_temp.hold((select shop from svc), (select day from ids), '14:00', (select (first ->> 'id')::uuid from holds), (select first ->> 'secret' from holds))) ->> 'id',
  (select first ->> 'id' from holds), 'holding again with the secret moves the same hold'
);
select ok('10:00' = any (pg_temp.times((select shop from svc), (select day from ids))), 'the old start is free again after a move');
select is(
  (select count(*)::int from public.bookings where stylist_id = (select shop from ids) and status = 'held'), 2,
  'moving doesn''t stack holds'
);
select throws_ok(
  $$select pg_temp.hold((select shop from svc), (select day from ids), '15:00', (select (first ->> 'id')::uuid from holds), 'wrong')$$,
  'hold_not_found', 'a wrong secret can''t move a hold'
);

update public.booking_rules set default_extra_minutes = 30 where stylist_id = (select second from ids);
select lives_ok($$select pg_temp.hold((select second from svc), (select day from ids) + 1, '10:00')$$, 'buffer: hold 10:00');
select ok(
  not pg_temp.times((select second from svc), (select day from ids) + 1) && array['09:00', '11:00']
    and '11:30' = any (pg_temp.times((select second from svc), (select day from ids) + 1)),
  'the buffer after each booking (theirs and the new one) is kept free'
);
select is(
  public.get_next_start((select second from ids), 60, (select day from ids) + 1, null, null),
  (select min(slot) from public.get_available_slots((select second from svc), '{}', (select day from ids) + 1, (select day from ids) + 1) as slot),
  'search''s next start is the first bookable start'
);

-- lapsed holds
update public.bookings set hold_expires_at = now() - interval '1 minute' where id = (select (later ->> 'id')::uuid from holds);
select ok('11:00' = any (pg_temp.times((select shop from svc), (select day from ids))), 'a lapsed hold no longer blocks');
select lives_ok($$select pg_temp.hold((select shop from svc), (select day from ids), '11:00')$$, 'someone else can hold a lapsed start');
select is((select status from public.bookings where id = (select (later ->> 'id')::uuid from holds)), 'expired', 'holding clears the stylist''s lapsed holds');

update public.bookings set hold_expires_at = now() - interval '1 minute' where id = (select (first ->> 'id')::uuid from holds);
select public.expire_booking_holds();
select is((select status from public.bookings where id = (select (first ->> 'id')::uuid from holds)), 'expired', 'the minute job expires lapsed holds');

select throws_ok(
  $$insert into public.bookings (stylist_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at, ends_at, block_ends_at, status)
    select (select shop from ids), '{}', '{}', 5000, 125, 60, starts_at, ends_at, block_ends_at, 'confirmed'
    from public.bookings where stylist_id = (select shop from ids) and status = 'held' limit 1$$,
  '23P01', null, 'the database itself refuses overlapping bookings'
);

-- mobile stylists and drafts
select lives_ok($$select pg_temp.hold((select mobile from svc), (select day from ids) + 1, '16:00')$$, 'a mobile hold can come before the address');
select ok(public.is_in_travel_area((select mobile from svc), 53.52, -2.24), 'an address inside the radius is in the travel area');
select ok(not public.is_in_travel_area((select mobile from svc), 53.40, -2.24), 'one outside it isn''t');
select throws_ok($$select pg_temp.hold((select mobile from svc), (select day from ids), '16:00', null, null, 53.40, -2.24)$$, 'outside_area', 'outside the travel radius is refused');
select lives_ok($$select pg_temp.hold((select mobile from svc), (select day from ids), '16:00', null, null, 53.52, -2.24)$$, 'inside the radius is held');
select throws_ok($$select pg_temp.hold((select draft from svc), (select day from ids), '10:00')$$, 'not_bookable', 'draft businesses can''t be booked');

-- price from the picks
update public.services set sizes_on = true, lengths_on = true where id = (select priced from svc);
insert into public.service_variations (service_id, kind, group_name, label, offered, price_delta_pence, minutes_delta, sort) values
  ((select priced from svc), 'size', null, 'Small', true, 4500, 60, 0),
  ((select priced from svc), 'size', null, 'Medium', true, 0, 0, 1),
  ((select priced from svc), 'size', null, 'Huge', false, 9900, 90, 2),
  ((select priced from svc), 'length', null, 'Waist', true, 5000, 60, 0),
  ((select priced from svc), 'length', null, 'Shoulder', true, 0, 0, 1),
  ((select priced from svc), 'own', 'Parting', 'Straight', true, 0, 0, 0),
  ((select priced from svc), 'own', 'Parting', 'Zig-zag', true, 1000, 20, 1);
insert into public.addons (stylist_id, name, price_pence, minutes) values
  ((select shop from ids), 'Beads', 1000, 15),
  ((select shop from ids), 'Unlinked', 500, 5);
insert into public.service_addons (service_id, addon_id, price_override_pence)
select (select priced from svc), id, 800 from public.addons where stylist_id = (select shop from ids) and name = 'Beads';

create function pg_temp.picks(labels text[], addon_names text[] default '{}')
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'variations', coalesce((select jsonb_agg(id) from public.service_variations where service_id = (select priced from svc) and label = any (labels)), '[]'),
    'addons', coalesce((select jsonb_agg(id) from public.addons where stylist_id = (select shop from ids) and name = any (addon_names)), '[]')
  )
$$;

select is(
  public.price_booking((select priced from svc), pg_temp.picks(array['Small', 'Waist', 'Zig-zag'], array['Beads'])) ->> 'price_pence',
  '16300', 'price adds the picked size, length, own option and the add-on''s override'
);
select is(
  public.price_booking((select priced from svc), pg_temp.picks(array['Small', 'Waist', 'Zig-zag'], array['Beads'])) ->> 'minutes',
  '215', 'length adds the picks'' extra minutes'
);
select is(
  (public.price_booking((select priced from svc), pg_temp.picks(array['Small', 'Waist', 'Zig-zag'], array['Beads'])) ->> 'fee_pence')::int,
  public.booking_fee_pence(16300), 'the booking fee is worked out from that price'
);
select throws_ok($$select public.price_booking((select priced from svc), pg_temp.picks(array['Waist', 'Zig-zag']))$$, 'invalid_choices', 'a switched-on size must be picked');
select throws_ok($$select public.price_booking((select priced from svc), pg_temp.picks(array['Huge', 'Waist', 'Zig-zag']))$$, 'invalid_choices', 'options not offered can''t be picked');
select throws_ok($$select public.price_booking((select priced from svc), pg_temp.picks(array['Small', 'Medium', 'Waist', 'Zig-zag']))$$, 'invalid_choices', 'only one size');
select throws_ok($$select public.price_booking((select priced from svc), pg_temp.picks(array['Small', 'Waist', 'Zig-zag'], array['Unlinked']))$$, 'invalid_choices', 'add-ons must belong to the service');

-- who can do what
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('e5555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'client@book.test', jsonb_build_object('account_type', 'client', 'first_name', 'Cli', 'last_name', 'Ent', 'phone', '07700900123', 'terms_version', '2026-10'), '{}');
update public.bookings set client_id = 'e5555555-5555-5555-5555-555555555555'
where id = (select (later ->> 'id')::uuid from holds);

grant select on ids, svc to anon, authenticated;

set local role anon;
select lives_ok($$select public.get_available_slots((select shop from svc), '{}', (select day from ids), (select day from ids))$$, 'anyone can see open times');
select throws_ok($$select * from public.bookings$$, '42501', null, 'guests can''t read bookings');
select throws_ok($$select pg_temp.hold((select shop from svc), (select day from ids), '16:00')$$, '42501', null, 'guests can''t hold directly (only through the function)');

reset role;
select set_config('request.jwt.claims', json_build_object('sub', 'e5555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*)::int from public.bookings), 1, 'a client reads only their own bookings');

reset role;
select set_config('request.jwt.claims', json_build_object('sub', 'e1111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select ok(
  (select bool_and(stylist_id = (select shop from ids)) and count(*) > 0 from public.bookings),
  'an owner reads only their own business''s bookings'
);
select throws_ok(
  $$insert into public.bookings (stylist_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at, ends_at, block_ends_at)
    values ((select shop from ids), '{}', '{}', 0, 0, 60, now(), now() + interval '1 hour', now() + interval '1 hour')$$,
  '42501', null, 'nobody writes bookings directly'
);

-- a clashing random reference is drawn again
reset role;
create sequence public.test_ref_draws;
alter table public.bookings alter column ref
  set default ('TH-CLASH' || case when nextval('public.test_ref_draws') = 1 then '' else 'ED' end);
update public.bookings set ref = 'TH-CLASH' where id = (select (later ->> 'id')::uuid from holds);
select is(
  pg_temp.hold((select second from svc), (select day from ids) + 2, '10:00') ->> 'ref',
  'TH-CLASHED', 'a reference already in use is drawn again'
);

select * from finish();
rollback;
