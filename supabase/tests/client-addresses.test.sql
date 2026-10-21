begin;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('e1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'nia@addresses.test', '{"first_name": "Nia"}', '{}'),
  ('e2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'kemi@addresses.test', '{"first_name": "Kemi"}', '{}');

create function pg_temp.sign_in(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true)
$$;

create function pg_temp.address(label text, is_default boolean default false)
returns jsonb
language sql
as $$
  select jsonb_build_object('label', label, 'line1', '12 Dickenson Road', 'line2', '', 'town', 'Manchester',
    'postcode', 'm14 5tq', 'lat', 53.45, 'lng', -2.22, 'is_default', is_default)
$$;

create temp table saved (name text primary key, id uuid);
grant select, insert on saved to authenticated;

select pg_temp.sign_in('e1111111-1111-1111-1111-111111111111');
set local role authenticated;

insert into saved values ('home', public.save_client_address(pg_temp.address('Home')));
insert into saved values ('mum', public.save_client_address(pg_temp.address('Mum’s')));

select is((select is_default from public.client_addresses where id = (select id from saved where name = 'home')),
  true, 'the first address is the default');

select is((select postcode from public.client_addresses where id = (select id from saved where name = 'home')),
  'M14 5TQ', 'the postcode is saved in capitals');

select public.save_client_address(pg_temp.address('Mum’s', true), (select id from saved where name = 'mum'));

select results_eq($$ select label from public.client_addresses where is_default $$, $$ values ('Mum’s') $$,
  'making another the default leaves just one');

select public.save_client_address(pg_temp.address('Spare ' || n)) from generate_series(1, 8) as n;

select throws_ok($$ select public.save_client_address(pg_temp.address('Eleventh')) $$,
  'too_many_addresses', 'a client keeps at most 10 addresses');

select throws_ok($$ select public.save_client_address(pg_temp.address('Short') || '{"postcode": "M1"}') $$,
  'invalid_address', 'an address the table can''t hold is refused by name');

-- one transaction gives every row the same now(): spread them out so "newest" means something
reset role;
update public.client_addresses set created_at = created_at + (coalesce(nullif(split_part(label, ' ', 2), '')::int, 0) * interval '1 minute')
where label like 'Spare %';
select pg_temp.sign_in('e1111111-1111-1111-1111-111111111111');
set local role authenticated;

select public.delete_client_address((select id from saved where name = 'mum'));

select results_eq($$ select label from public.client_addresses where is_default $$, $$ values ('Spare 8') $$,
  'deleting the default makes the newest address the default');

select throws_ok($$ insert into public.client_addresses (client_id, label, line1, town, postcode)
  values ('e1111111-1111-1111-1111-111111111111', 'Direct', '1 Road', 'Manchester', 'M1 1AA') $$,
  '42501', null, 'addresses are only written through the functions');

reset role;
select pg_temp.sign_in('e2222222-2222-2222-2222-222222222222');
set local role authenticated;

select is((select count(*) from public.client_addresses), 0::bigint, 'another client sees none of them');

select throws_ok($$ select public.save_client_address(pg_temp.address('Mine'), (select id from saved where name = 'home')) $$,
  'address_not_found', 'another client can''t edit them');

select public.delete_client_address((select id from saved where name = 'home'));

reset role;

select is((select count(*) from public.client_addresses where client_id = 'e1111111-1111-1111-1111-111111111111'),
  9::bigint, 'or delete them');

delete from auth.users where id = 'e1111111-1111-1111-1111-111111111111';

select is((select count(*) from public.client_addresses), 0::bigint, 'deleting the account deletes its addresses');

select * from finish();
rollback;
