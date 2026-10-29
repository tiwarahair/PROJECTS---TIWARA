begin;
select plan(23);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, encrypted_password)
values ('e1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@trusted.test', '{"first_name": "Owner"}', '{}', 'old-hash'),
  ('e2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'other@trusted.test', '{"first_name": "Other"}', '{}', 'old-hash');

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values ('f1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'main', 'totp', 'verified',
  now(), now());

insert into auth.sessions (id, user_id, created_at, updated_at, user_agent, aal)
values ('a1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', now(), now(),
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0 Safari/537.36',
  'aal2');

create temp table tokens (name text primary key, token text);
grant select, insert on tokens to authenticated;

create function pg_temp.act_as(user_id uuid, aal text, is_admin boolean default false)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated', 'aal', aal,
    'session_id', 'a1111111-1111-1111-1111-111111111111',
    'app_metadata', json_build_object('is_admin', is_admin))::text, true);
  set local role authenticated;
$$;

create function pg_temp.trusted_count(user_id uuid)
returns bigint
language sql
as $$
  select count(*) from public.trusted_devices where trusted_devices.user_id = trusted_count.user_id
$$;

create function pg_temp.trust_owner(name text)
returns void
language sql
as $$
  select pg_temp.act_as('e1111111-1111-1111-1111-111111111111', 'aal2');
  insert into tokens values (name, public.trust_device());
  reset role;
$$;

select pg_temp.act_as('e1111111-1111-1111-1111-111111111111', 'aal1');
select throws_ok($$ select public.trust_device() $$, 'second_factor_required', 'trusting needs a code in this session');
reset role;

select pg_temp.act_as('e1111111-1111-1111-1111-111111111111', 'aal2', true);
select throws_ok($$ select public.trust_device() $$, 'admin_not_trusted', 'admins can''t trust a device');
reset role;

select pg_temp.trust_owner('first');

select is(length((select token from tokens where name = 'first')), 43, 'the token is 32 random bytes');

select is(
  (select token_hash from public.trusted_devices),
  sha256(convert_to((select token from tokens where name = 'first'), 'UTF8')),
  'only the token''s hash is stored');

select is(
  (select array[label, kind] from public.trusted_devices),
  array['Mac · Chrome', 'laptop'],
  'named like the device list');

select pg_temp.act_as('e1111111-1111-1111-1111-111111111111', 'aal1');

select throws_ok($$ select token_hash from public.trusted_devices $$, '42501', null, 'the hash can''t be read back');
select is((select count(*) from public.trusted_devices), 1::bigint, 'owners see their trusted devices');
select ok(public.check_trusted_device((select token from tokens where name = 'first')), 'the owner''s token is trusted');
select ok(not public.check_trusted_device('not-a-token'), 'a wrong token isn''t');

reset role;

select isnt((select last_used_at from public.trusted_devices), null, 'a check marks the device as used');

select pg_temp.act_as('e2222222-2222-2222-2222-222222222222', 'aal1');
select ok(not public.check_trusted_device((select token from tokens where name = 'first')),
  'someone else''s token isn''t trusted');
select is((select count(*) from public.trusted_devices), 0::bigint, 'nor can they see it');
reset role;

select pg_temp.act_as('e1111111-1111-1111-1111-111111111111', 'aal1', true);
select ok(not public.check_trusted_device((select token from tokens where name = 'first')),
  'an admin session is never trusted');
reset role;

update public.trusted_devices set expires_at = now() - interval '1 minute';

select pg_temp.act_as('e1111111-1111-1111-1111-111111111111', 'aal1');
select ok(not public.check_trusted_device((select token from tokens where name = 'first')),
  'an expired token isn''t trusted');
reset role;

delete from public.trusted_device_checks;
update public.trusted_devices set expires_at = now() + interval '30 days';

select pg_temp.act_as('e1111111-1111-1111-1111-111111111111', 'aal1');
select public.check_trusted_device('guess') from generate_series(1, 10);
select is(public.check_trusted_device((select token from tokens where name = 'first')), null,
  'after 10 checks in 15 minutes the check is refused without calling the token wrong');
reset role;

update public.trusted_device_checks set window_started_at = now() - interval '16 minutes';

select pg_temp.act_as('e1111111-1111-1111-1111-111111111111', 'aal1');
select ok(public.check_trusted_device((select token from tokens where name = 'first')), 'and allowed again later');
reset role;

update auth.users set encrypted_password = 'new-hash' where id = 'e1111111-1111-1111-1111-111111111111';
select is(pg_temp.trusted_count('e1111111-1111-1111-1111-111111111111'), 0::bigint, 'a new password revokes them');

select pg_temp.trust_owner('second');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values ('f2222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', 'abandoned', 'totp',
  'unverified', now(), now());
delete from auth.mfa_factors where id = 'f2222222-2222-2222-2222-222222222222';
select is(pg_temp.trusted_count('e1111111-1111-1111-1111-111111111111'), 1::bigint,
  'an abandoned set-up leaves them alone');

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values ('f3333333-3333-3333-3333-333333333333', 'e1111111-1111-1111-1111-111111111111', 'new', 'totp', 'unverified',
  now(), now());
update auth.mfa_factors set status = 'verified' where id = 'f3333333-3333-3333-3333-333333333333';
select is(pg_temp.trusted_count('e1111111-1111-1111-1111-111111111111'), 1::bigint,
  'adding a backup authenticator leaves them alone');

delete from auth.mfa_factors where id = 'f1111111-1111-1111-1111-111111111111';
select is(pg_temp.trusted_count('e1111111-1111-1111-1111-111111111111'), 0::bigint,
  'removing an authenticator revokes them');

select pg_temp.trust_owner('fourth');
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111', 'aal1');
select public.revoke_trusted_devices();
reset role;
select is(pg_temp.trusted_count('e1111111-1111-1111-1111-111111111111'), 0::bigint,
  'signing out everywhere revokes them');

select pg_temp.trust_owner('fifth');
update public.trusted_devices set expires_at = now() - interval '1 minute';
select pg_temp.trust_owner('sixth');

do $$ begin execute (select command from cron.job where jobname = 'purge-trusted-devices'); end $$;

select is(pg_temp.trusted_count('e1111111-1111-1111-1111-111111111111'), 1::bigint,
  'the nightly purge removes only expired ones');

delete from auth.users where id = 'e1111111-1111-1111-1111-111111111111';
select is(pg_temp.trusted_count('e1111111-1111-1111-1111-111111111111'), 0::bigint, 'deleting the account removes them');

select * from finish();
rollback;
