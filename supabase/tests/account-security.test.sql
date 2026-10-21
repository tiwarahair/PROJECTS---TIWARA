begin;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('d1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@security.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object(
      'business_name', 'Security Test', 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
      'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@security.test'
    )
  ), '{}'),
  ('d2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'other@security.test', '{"first_name": "Other"}', '{}');

create function pg_temp.sign_in(session uuid, user_id uuid, user_agent text, active_at timestamptz default now())
returns void
language sql
as $$
  insert into auth.sessions (id, user_id, created_at, updated_at, user_agent, aal)
  values (session, user_id, active_at, active_at, user_agent, 'aal1');

  insert into auth.refresh_tokens (instance_id, token, user_id, session_id)
  values ('00000000-0000-0000-0000-000000000000', session::text, user_id::text, session)
$$;

create function pg_temp.alerts()
returns bigint
language sql
as $$
  select count(*) from public.notifications where template = 'login_alert' and to_address = 'owner@security.test'
$$;

-- signs up on a Mac, then an iPhone, then the Mac again after a Chrome update
select pg_temp.sign_in('a0000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0 Safari/537.36', now() - interval '3 days');

select is(pg_temp.alerts(), 0::bigint, 'the first sign-in sends no alert');

select pg_temp.sign_in('a0000000-0000-0000-0000-000000000002', 'd1111111-1111-1111-1111-111111111111',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Version/19.0 Mobile Safari/604.1', now() - interval '2 days');

select is(
  (select payload ->> 'device' from public.notifications where template = 'login_alert'
    and to_address = 'owner@security.test'),
  'iPhone · Safari', 'a new device is emailed, named by device and browser');

select pg_temp.sign_in('a0000000-0000-0000-0000-000000000003', 'd1111111-1111-1111-1111-111111111111',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0 Safari/537.36');

select is(pg_temp.alerts(), 1::bigint, 'a known device isn''t, even on a newer browser version');

update public.profiles set login_alerts = false where id = 'd1111111-1111-1111-1111-111111111111';

select pg_temp.sign_in('a0000000-0000-0000-0000-000000000004', 'd1111111-1111-1111-1111-111111111111',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0', now() - interval '1 day');

select is(pg_temp.alerts(), 1::bigint, 'nothing is sent with alerts off');

select pg_temp.sign_in('a0000000-0000-0000-0000-000000000005', 'd2222222-2222-2222-2222-222222222222', null);

select set_config('request.jwt.claims', json_build_object('sub', 'd1111111-1111-1111-1111-111111111111',
  'role', 'authenticated', 'session_id', 'a0000000-0000-0000-0000-000000000003')::text, true);
set local role authenticated;

select is(
  (select jsonb_agg(jsonb_build_array(item ->> 'device', item ->> 'kind', item ->> 'is_current'))
    from jsonb_array_elements(public.get_account_security() -> 'sessions') as item),
  '[["Mac · Chrome", "laptop", "true"], ["Windows · Firefox", "laptop", "false"], ["iPhone · Safari", "phone", "false"],
    ["Mac · Chrome", "laptop", "false"]]'::jsonb,
  'only their own sessions, the current one first, then the most recently active');

select is((public.get_account_security() ->> 'login_alerts')::boolean, false, 'with their alerts setting');

select throws_ok($$ select public.sign_out_session('a0000000-0000-0000-0000-000000000003') $$,
  'current_session', 'this session signs out from the account menu, not here');

select public.sign_out_session('a0000000-0000-0000-0000-000000000002');
select public.sign_out_session('a0000000-0000-0000-0000-000000000005');

reset role;

select is(
  (select count(*) from auth.refresh_tokens where session_id = 'a0000000-0000-0000-0000-000000000002'), 0::bigint,
  'signing out a session ends it and its refresh tokens');

select is((select count(*) from auth.sessions where id = 'a0000000-0000-0000-0000-000000000005'), 1::bigint,
  'another account''s session can''t be signed out');

select * from finish();
rollback;
