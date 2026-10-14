begin;
select plan(3);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('d1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'apps@studio.test', jsonb_build_object('account_type', 'client', 'first_name', 'App', 'last_name', 'Check',
    'phone', '07700900457', 'terms_version', '2026-10'), '{}');

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values ('d2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', 'test', 'totp', 'unverified',
  now(), now());

select is(
  (select count(*)::int from public.notifications where to_address = 'apps@studio.test'),
  0,
  'starting to add an app sends nothing'
);

update auth.mfa_factors set status = 'verified' where id = 'd2222222-2222-2222-2222-222222222222';

select is(
  (select template from public.notifications where to_address = 'apps@studio.test'),
  'authenticator_added',
  'confirming an app queues the added email'
);

delete from auth.mfa_factors where id = 'd2222222-2222-2222-2222-222222222222';

select is(
  (select template from public.notifications where to_address = 'apps@studio.test' order by created_at desc, template desc limit 1),
  'authenticator_removed',
  'removing it queues the removed email'
);

select * from finish();
rollback;
