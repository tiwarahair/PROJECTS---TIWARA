begin;
select plan(20);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email,
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object(
      'business_name', business, 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
      'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', email
    )
  ), app_metadata
from (values
  ('c1111111-1111-1111-1111-111111111111'::uuid, 'secured@enforce.test', 'Secured Studio', '{}'::jsonb),
  ('c2222222-2222-2222-2222-222222222222'::uuid, 'new@enforce.test', 'New Studio', '{}'::jsonb),
  ('c3333333-3333-3333-3333-333333333333'::uuid, 'admin@enforce.test', 'Admin Studio', '{"is_admin": true}'::jsonb)
) as accounts (id, email, business, app_metadata);

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values ('c1111111-0000-0000-0000-000000000001', 'c1111111-1111-1111-1111-111111111111', 'main', 'totp', 'verified',
  now(), now()),
  ('c3333333-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333333', 'main', 'totp', 'verified',
  now(), now());

insert into auth.sessions (id, user_id, created_at, updated_at, user_agent, aal)
values ('a1111111-0000-0000-0000-000000000001', 'c1111111-1111-1111-1111-111111111111', now(), now(), 'Macintosh Chrome',
  'aal1'),
  ('a1111111-0000-0000-0000-000000000002', 'c1111111-1111-1111-1111-111111111111', now(), now(), 'Macintosh Chrome',
  'aal2'),
  ('a3333333-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333333', now(), now(), 'Macintosh Chrome',
  'aal1');

create temp table ids as
select owner_id, id as stylist from public.stylists
where owner_id in ('c1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222');
grant select on ids to authenticated;

create temp table tokens (token text);
grant select, insert on tokens to authenticated;

create function pg_temp.act_as(user_id uuid, session uuid, aal text, is_admin boolean default false)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated', 'aal', aal,
    'session_id', session, 'app_metadata', json_build_object('is_admin', is_admin))::text, true);
  set local role authenticated;
$$;

create function pg_temp.studio_reads()
returns bigint
language sql
as $$
  select (select count(*) from public.stylists) + (select count(*) from public.stylist_private)
$$;

create function pg_temp.rename_services()
returns bigint
language sql
as $$
  with renamed as (update public.services set name = name returning 1)
  select count(*) from renamed
$$;

create function pg_temp.secured_stylist()
returns uuid
language sql
as $$
  select stylist from ids where owner_id = 'c1111111-1111-1111-1111-111111111111'
$$;

select pg_temp.act_as('c1111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000001', 'aal1');

select is(pg_temp.studio_reads(), 0::bigint, 'a password alone can''t read Studio');
select ok(not public.is_stylist_owner(pg_temp.secured_stylist()), 'nor own the business');
select is(pg_temp.rename_services(), 0::bigint, 'nor write to it');
select throws_ok($$ select public.close_business() $$, 'second_factor_required', 'nor close it');
select is((select count(*) from public.profiles), 1::bigint, 'their own account details still load');

reset role;

select pg_temp.act_as('c1111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000002', 'aal2');

select is(pg_temp.studio_reads(), 2::bigint, 'after the code, Studio reads');
select ok(pg_temp.rename_services() > 0, 'and writes');
insert into tokens select public.trust_device();

reset role;

select pg_temp.act_as('c1111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000001', 'aal1');

select ok(public.check_trusted_device((select token from tokens)), 'a trusted device skips the code');
select is(pg_temp.studio_reads(), 2::bigint, 'and that session reads Studio');
select ok((select count(*) from public.services) > 0, 'including its services');

reset role;

update public.trusted_devices set expires_at = now() - interval '1 minute';
select pg_temp.act_as('c1111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000001', 'aal1');
select is(pg_temp.studio_reads(), 0::bigint, 'until the trust expires');
reset role;

update public.trusted_devices set expires_at = now() + interval '30 days';
select pg_temp.act_as('c1111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000001', 'aal1');
select is(pg_temp.studio_reads(), 2::bigint, 'the same session is trusted again while the device is');
delete from public.trusted_devices;
select is(pg_temp.studio_reads(), 0::bigint, 'and not once the device stops being trusted');
reset role;

select pg_temp.act_as('c1111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000001', 'aal1');
select ok(not public.check_trusted_device((select token from tokens)), 'a removed device''s token no longer works');
reset role;

select is((select count(*) from public.trusted_sessions), 0::bigint, 'removing the device ends its trusted sessions');

select pg_temp.act_as('c2222222-2222-2222-2222-222222222222', 'a1111111-0000-0000-0000-000000000009', 'aal1');
select is(pg_temp.studio_reads(), 2::bigint, 'a stylist without an authenticator still reaches Studio to set one up');
select ok(public.passed_second_factor(), 'so they pass the check');
reset role;

select pg_temp.act_as('c3333333-3333-3333-3333-333333333333', 'a3333333-0000-0000-0000-000000000001', 'aal1', true);
select ok(not public.passed_second_factor(), 'an admin at aal1 doesn''t pass the check');
reset role;
select ok(not public.is_admin_session(), 'nor has admin access');

select pg_temp.act_as('c3333333-3333-3333-3333-333333333333', 'a3333333-0000-0000-0000-000000000001', 'aal2', true);
reset role;
select ok(public.is_admin_session(), 'admin access needs aal2');

select * from finish();
rollback;
