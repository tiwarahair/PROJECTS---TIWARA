begin;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('b1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'twofactor@studio.test', jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Two', 'last_name', 'Factor', 'phone', '07700900456', 'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Two Factor Test', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'twofactor@studio.test')
  ), '{}');

create temp table ids as
select (select id from public.stylists where owner_id = 'b1111111-1111-1111-1111-111111111111') as stylist;
grant select on ids to authenticated;

create function pg_temp.act_as(aal text, totp_age interval)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', 'b1111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', aal,
    'amr', case when totp_age is null then '[]'::json
      else json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now() - totp_age)::bigint)) end
  )::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('aal1', null);
select ok(not public.has_second_factor(), 'no app set up yet');
select lives_ok(
  $$insert into public.payment_policies (stylist_id, mode) values ((select stylist from ids), 'card')$$,
  'before 2FA is on, the policy saves freely'
);
select is_empty($$select ni_hint from public.stylist_tax_details$$, 'no tax details yet');
select throws_ok(
  $$insert into public.stylist_tax_details (stylist_id, kind, company_name, company_number) values ((select stylist from ids), 'ltd', 'Co', '12345678')$$,
  '42501', null, 'tax details are only written by the Edge Function'
);

reset role;
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values (gen_random_uuid(), 'b1111111-1111-1111-1111-111111111111', 'test', 'totp', 'verified', now(), now());

select pg_temp.act_as('aal1', null);
select ok(public.has_second_factor(), 'an app is set up');
select throws_ok(
  $$insert into public.payment_policies (stylist_id, mode) values ((select stylist from ids), 'card')$$,
  '42501', null, 'once 2FA is on, a session without it cannot change the policy'
);

reset role;
select pg_temp.act_as('aal2', interval '40 days');
select ok(not public.has_recent_second_factor(), 'a code from 40 days ago is too old');

reset role;
select pg_temp.act_as('aal2', interval '1 day');
select ok(public.has_recent_second_factor(), 'a code from yesterday counts');
select lives_ok(
  $$insert into public.payment_policies (stylist_id, mode) values ((select stylist from ids), 'card')$$,
  'with a recent code the policy saves'
);

select * from finish();
rollback;
