begin;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('f1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@favourites.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Crown Studio', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@favourites.test')
  ), '{}'),
  ('f2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'nia@favourites.test', '{"first_name": "Nia"}', '{}'),
  ('f3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'kemi@favourites.test', '{"first_name": "Kemi"}', '{}');

create temp table shop as
select id, slug::text from public.stylists where owner_id = 'f1111111-1111-1111-1111-111111111111';

update public.stylists set status = 'live' where id = (select id from shop);
insert into public.stylist_slug_history (slug, stylist_id) values ('old-crown-studio', (select id from shop));
grant select on shop to authenticated;

create function pg_temp.sign_in(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true)
$$;

select pg_temp.sign_in('f2222222-2222-2222-2222-222222222222');
set local role authenticated;

select public.set_favourite('old-crown-studio', true);
select public.set_favourite((select slug from shop), true);

select is(public.get_my_favourites(), array[(select slug from shop)],
  'a favourite saved by an old link counts once, under the current one');

select public.set_favourite('nobody-here', true);
select is(cardinality(public.get_my_favourites()), 1, 'an unknown stylist is ignored');

select pg_temp.sign_in('f3333333-3333-3333-3333-333333333333');

select is(public.get_my_favourites(), '{}'::text[], 'another client doesn''t see them');
select is((select count(*) from public.favourites), 0::bigint, 'not even in the table');

select throws_ok($$ insert into public.favourites (client_id, stylist_id)
  values ('f2222222-2222-2222-2222-222222222222', (select id from shop)) $$,
  '42501', null, 'and can''t write them directly');

select pg_temp.sign_in('f2222222-2222-2222-2222-222222222222');
reset role;
update public.stylists set status = 'draft' where id = (select id from shop);
set local role authenticated;

select is(public.get_my_favourites(), '{}'::text[], 'a stylist without a public profile drops out');

reset role;
update public.stylists set status = 'live' where id = (select id from shop);
set local role authenticated;

select is(cardinality(public.get_my_favourites()), 1, 'and comes back when they reopen');

select public.set_favourite((select slug from shop), false);
select is(public.get_my_favourites(), '{}'::text[], 'removing it deletes it');

select * from finish();
rollback;
