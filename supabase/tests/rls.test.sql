begin;
select plan(14);

-- Every public table must have RLS on.
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'RLS is enabled on every public table'
);

select is((select count(*)::int from public.service_groups), 6, 'service groups are seeded');
select is((select count(*)::int from public.service_types), 72, 'service types are seeded');

set local role anon;

select isnt_empty('select * from public.service_groups', 'anon can read service groups');
select isnt_empty('select * from public.service_types', 'anon can read service types');
select isnt_empty('select * from public.customisation_options', 'anon can read customisation options');
select isnt_empty('select * from public.default_addons', 'anon can read default add-ons');

select throws_ok(
  $$insert into public.service_groups (id, name, icon, description, image, sort) values ('x', 'x', 'x', 'x', 'x', 9)$$,
  '42501',
  null,
  'anon cannot insert service groups'
);

select throws_ok(
  $$update public.service_types set name = 'x'$$,
  '42501',
  null,
  'anon cannot update service types'
);

set local role authenticated;

select throws_ok(
  $$delete from public.default_addons$$,
  '42501',
  null,
  'authenticated users cannot delete default add-ons'
);

select throws_ok(
  $$insert into public.service_types (id, group_id, name) values ('x', 'braids', 'x')$$,
  '42501',
  null,
  'authenticated users cannot insert service types'
);

reset role;

select is(
  (select public.is_admin()),
  false,
  'is_admin is false without the claim'
);

set local request.jwt.claims = '{"aal": "aal2", "app_metadata": {"is_admin": true}}';

select ok(public.is_admin() and public.is_aal2(), 'is_admin and is_aal2 read the JWT claims');

reset role;

create table public.grants_probe (id int);

select ok(
  not has_table_privilege('anon', 'public.grants_probe', 'select')
    and not has_table_privilege('authenticated', 'public.grants_probe', 'select'),
  'new tables are not exposed to anon or authenticated by default'
);

select * from finish();
rollback;
