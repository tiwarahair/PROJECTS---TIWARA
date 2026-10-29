begin;
select plan(4);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('c8111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'owner@notice.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Notice', 'last_name', 'Owner', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Notice Test', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@notice.test')
  ), '{}');

create temp table shop as select id from public.stylists where slug = 'notice-test';

update public.working_hours set is_open = true, start_time = '00:00', end_time = '23:59'
where stylist_id = (select id from shop);

create function pg_temp.first_start()
returns timestamptz
language sql
as $$
  select min(slot) from generate_series(0, 1) as offsets (days)
  cross join lateral public.get_day_slots(
    (select id from shop), 30, 0, (now() at time zone 'Europe/London')::date + days
  ) as slot
$$;

update public.booking_rules set min_notice_minutes = 30 where stylist_id = (select id from shop);

select ok(
  pg_temp.first_start() >= now() + interval '30 minutes',
  'no start is sooner than 30 minutes away'
);
select ok(
  pg_temp.first_start() < now() + interval '1 hour',
  'and the first one is within the next half-hour slot after that'
);

select throws_ok(
  format('update public.booking_rules set min_notice_minutes = 20161 where stylist_id = %L', (select id from shop)),
  '23514', null, 'notice is two weeks at most'
);
select lives_ok(
  format('update public.booking_rules set min_notice_minutes = 20160 where stylist_id = %L', (select id from shop)),
  'two weeks is allowed'
);

select * from finish();
rollback;
