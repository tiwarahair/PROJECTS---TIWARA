begin;
select plan(4);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('c1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'nia@photo.test', '{"first_name": "Nia"}', '{}'),
  ('c2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'kemi@photo.test', '{"first_name": "Kemi"}', '{}');

select set_config('request.jwt.claims', json_build_object('sub', 'c1111111-1111-1111-1111-111111111111',
  'role', 'authenticated')::text, true);
set local role authenticated;

select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('account-photos', 'c1111111-1111-1111-1111-111111111111/photo.jpg', 'c1111111-1111-1111-1111-111111111111') $$,
  'a client can save their own photo');

select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('account-photos', 'c2222222-2222-2222-2222-222222222222/photo.jpg', 'c1111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'but not someone else''s');

select throws_ok($$ update public.profiles set photo_path = 'c2222222-2222-2222-2222-222222222222/photo.jpg'
  where id = 'c1111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'and their profile can only point at their own photo');

reset role;
select set_config('request.jwt.claims', json_build_object('sub', 'c2222222-2222-2222-2222-222222222222',
  'role', 'authenticated')::text, true);
set local role authenticated;

select is((select count(*) from storage.objects where bucket_id = 'account-photos'), 0::bigint,
  'nobody else can see it');

select * from finish();
rollback;
