begin;
select plan(3);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values
  ('e6666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'nia@assistantimages.test', '{"first_name": "Nia"}', '{}'),
  ('e7777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'kemi@assistantimages.test', '{"first_name": "Kemi"}', '{}');

insert into storage.objects (bucket_id, name)
values
  ('assistant-images', 'e6666666-6666-6666-6666-666666666666/chat-1/edges.jpg'),
  ('assistant-images', 'e6666666-6666-6666-6666-666666666666/chat-2/deep/crown.png'),
  ('assistant-images', 'e7777777-7777-7777-7777-777777777777/chat-3/braids.jpg'),
  ('account-photos', 'e6666666-6666-6666-6666-666666666666/photo.jpg');

select results_eq(
  $$select * from public.get_assistant_image_paths('e6666666-6666-6666-6666-666666666666') order by 1$$,
  array[
    'e6666666-6666-6666-6666-666666666666/chat-1/edges.jpg',
    'e6666666-6666-6666-6666-666666666666/chat-2/deep/crown.png'
  ],
  'lists every assistant photo in the client''s folder, however deep'
);

select is_empty(
  $$select * from public.get_assistant_image_paths('e8888888-8888-8888-8888-888888888888')$$,
  'a client with no photos has nothing to remove'
);

select function_privs_are(
  'public', 'get_assistant_image_paths', array['uuid'], 'authenticated', array[]::text[],
  'signed-in users can''t list anyone''s photos'
);

select * from finish();
rollback;
