begin;
select plan(22);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values
  ('b1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'owner@profiles.test',
    jsonb_build_object(
      'account_type', 'stylist', 'first_name', 'Joy', 'last_name', 'Eze', 'phone', '07700911111',
      'terms_version', '2026-10',
      'stylist', jsonb_build_object(
        'business_name', 'Profiles Test', 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
        'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
        'contact_email', 'shop@profiles.test'
      )
    ), '{}'),
  ('b4444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'funmi@profiles.test',
    jsonb_build_object('account_type', 'client', 'first_name', 'Funmi', 'last_name', 'Lawal',
      'phone', '07700911114', 'terms_version', '2026-10'), '{"is_admin": true}');

create temp table shop as
select id as stylist, slug::text as slug from public.stylists where slug = 'profiles-test';

create function pg_temp.sign_in(user_id uuid, admin boolean default false, level text default 'aal1')
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', user_id, 'role', 'authenticated', 'aal', level,
    'app_metadata', json_build_object('is_admin', admin)
  )::text, true);
$$;

create temp table clock as select now() - interval '1 second' as started;

create function pg_temp.emails(template_name text)
returns bigint
language sql
as $$
  select count(*) from public.notifications
  where template = template_name and created_at >= (select started from clock)
$$;

create function pg_temp.ids(tab text)
returns setof uuid
language sql
as $$
  select (item ->> 'id')::uuid from jsonb_array_elements(public.admin_get_profiles(tab) -> 'items') as item
$$;

select is((select went_live_at from public.stylists join shop on id = stylist), null,
  'a draft business has no went-live date');

update public.stylists set status = 'live' from shop where id = stylist;

select isnt((select went_live_at from public.stylists join shop on id = stylist), null,
  'going live stamps the date');

select is(public.get_profile_flags((select stylist from shop)), array['stripe', 'photos'],
  'a new business without Stripe or photos is flagged for both');

select pg_temp.sign_in('b4444444-4444-4444-4444-444444444444', true, 'aal1');

select is((select count(*) from pg_temp.ids('all')), 0::bigint, 'admins see no profiles without two-step');

select throws_ok($$ select public.admin_suspend_stylist((select stylist from shop), 'Fake ID') $$,
  'not_allowed', 'admins cannot suspend without two-step');

select pg_temp.sign_in('b4444444-4444-4444-4444-444444444444', true, 'aal2');

select ok((select stylist from shop) in (select pg_temp.ids('not')), 'a new live business waits for a check');

select throws_ok($$ select public.admin_mark_profile_checked((select stylist from shop), '  ') $$,
  'note_required', 'marking as checked needs a note');

select public.admin_save_profile_note((select stylist from shop), 'Photos match Instagram');

select is(public.admin_get_profile((select stylist from shop)) ->> 'note', 'Photos match Instagram',
  'the shared note is saved');

select public.admin_mark_profile_checked((select stylist from shop), 'Photos match Instagram');

select ok((select stylist from shop) not in (select pg_temp.ids('not')), 'a checked business stops waiting');

select ok((select stylist from shop) not in (select pg_temp.ids('flags')),
  'flags seen at the check do not count as new');

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'copy@profiles.test',
  jsonb_build_object('account_type', 'client', 'first_name', 'Copy', 'last_name', 'Cat',
    'phone', '07700 911111', 'terms_version', '2026-10'), '{}');

select ok((select stylist from shop) in (select pg_temp.ids('flags')),
  'a new flag after the check shows it under Has flags');

select is(public.admin_get_profile((select stylist from shop)) -> 'contact_matches',
  '[{"kind": "phone", "name": "another account"}]'::jsonb, 'the matching phone is named');

select throws_ok($$ select public.admin_suspend_stylist((select stylist from shop), '') $$,
  'note_required', 'suspending needs a reason');

select public.admin_suspend_stylist((select stylist from shop), 'Same phone as another account');

select is((select status from public.stylists join shop on id = stylist), 'suspended', 'the business is suspended');

select is(pg_temp.emails('stylist_suspended'), 1::bigint, 'the stylist is emailed the reason');

select ok((select stylist from shop) in (select pg_temp.ids('suspended')), 'it shows under Suspended');

select set_config('request.jwt.claims', '{"role": "anon"}', true);

select is(public.get_stylist_profile((select slug from shop)), null, 'clients cannot open a suspended profile');

select throws_ok(
  $$ select public.price_booking((select id from public.services where stylist_id = (select stylist from shop) limit 1), '{}') $$,
  'not_bookable', 'clients cannot book a suspended business');

select pg_temp.sign_in('b1111111-1111-1111-1111-111111111111');
select public.close_business();
select public.reopen_business();

select is((select status from public.stylists join shop on id = stylist), 'suspended',
  'closing and reopening the business does not lift the suspension');

select pg_temp.sign_in('b4444444-4444-4444-4444-444444444444', true, 'aal2');

select public.admin_unsuspend_stylist((select stylist from shop), 'Sent photo ID');

select is((select status from public.stylists join shop on id = stylist), 'draft',
  'unsuspending re-runs go-live, which leaves it in draft until Stripe is done');

select is(pg_temp.emails('stylist_unsuspended'), 1::bigint, 'the stylist is told they are back');

select is(
  (select jsonb_agg(item ->> 'kind') from jsonb_array_elements(
    public.admin_get_actions(for_stylist => (select stylist from shop), kind_group => 'profiles') -> 'items') as item),
  '["stylist_unsuspended", "stylist_suspended", "profile_checked"]'::jsonb,
  'the log lists the stylist''s actions, newest first');

select * from finish();
rollback;
