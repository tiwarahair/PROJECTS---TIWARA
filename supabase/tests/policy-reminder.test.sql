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
  ('ad111111-1111-1111-1111-111111111111'::uuid, 'owner@policy-reminder.test', 'Reminder Studio'),
  ('ad333333-3333-3333-3333-333333333333'::uuid, 'other@policy-reminder.test', 'Other Studio')
) as stylists (id, email, business);

create temp table studio as
select id from public.stylists where owner_id = 'ad111111-1111-1111-1111-111111111111';
grant select on studio to authenticated;

create function pg_temp.sign_in(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true)
$$;

create function pg_temp.reminded_at()
returns timestamptz
language sql
security definer
as $$
  select policy_reminded_at from public.stylist_private where stylist_id = (select id from studio)
$$;

create function pg_temp.nudged_at()
returns timestamptz
language sql
security definer
as $$
  select policy_nudged_at from public.stylist_private where stylist_id = (select id from studio)
$$;

set local role authenticated;
select pg_temp.sign_in('ad333333-3333-3333-3333-333333333333');
select public.mark_policy_nudged((select id from studio), true);

select is(pg_temp.nudged_at(), null, 'another stylist can''t mark it');

select pg_temp.sign_in('ad111111-1111-1111-1111-111111111111');
select public.mark_policy_nudged((select id from studio), false);

select ok(pg_temp.nudged_at() is not null and pg_temp.reminded_at() is null,
  'closing the first nudge records it without using up the reminder');

create temp table first_mark as select pg_temp.nudged_at() as at;
grant select on first_mark to authenticated;
select public.mark_policy_nudged((select id from studio), true);

select isnt(pg_temp.reminded_at(), null, 'closing the reminder records it');
select is(pg_temp.nudged_at(), (select at from first_mark), 'the first nudge keeps its time');

select * from finish();
rollback;
