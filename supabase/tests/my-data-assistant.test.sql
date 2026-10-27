begin;
select plan(4);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data)
values
  ('e4444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'nia@dataassistant.test', now(), '{"first_name": "Nia"}', '{}'),
  ('e5555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'kemi@dataassistant.test', now(), '{"first_name": "Kemi"}', '{}');

insert into public.hair_profiles (user_id, current_style, sensitivities)
values
  ('e4444444-4444-4444-4444-444444444444', 'Box braids', 'Tender scalp'),
  ('e5555555-5555-5555-5555-555555555555', 'Silk press', null);

insert into public.assistant_conversations (id, user_id, title)
values
  ('a4444444-4444-4444-4444-444444444444', 'e4444444-4444-4444-4444-444444444444', 'Edges care'),
  ('a5555555-5555-5555-5555-555555555555', 'e5555555-5555-5555-5555-555555555555', 'Not Nia''s');

insert into public.assistant_messages (conversation_id, role, body, image_path, created_at)
values
  ('a4444444-4444-4444-4444-444444444444', 'user', 'How do I grow my edges back?',
    'e4444444-4444-4444-4444-444444444444/a4444444-4444-4444-4444-444444444444/edges.jpg', now() - interval '1 minute'),
  ('a4444444-4444-4444-4444-444444444444', 'assistant', 'Go easy on tight styles.', null, now());

select set_config('request.jwt.claims', json_build_object('sub', 'e4444444-4444-4444-4444-444444444444',
  'role', 'authenticated')::text, true);
set local role authenticated;

create temp table export as select public.get_my_data() as data;

select is(
  (select data -> 'hair_profile' ->> 'sensitivities' from export), 'Tender scalp',
  'the download has the client''s hair profile'
);

select is(
  (select jsonb_array_length(data -> 'assistant_conversations') from export), 1,
  'it has the client''s own assistant chats and no one else''s'
);

select is(
  (select data -> 'assistant_conversations' -> 0 -> 'messages' -> 0 ->> 'text' from export),
  'How do I grow my edges back?',
  'each chat has its messages, oldest first'
);

select is(
  (select (data -> 'assistant_conversations' -> 0 -> 'messages' -> 0 ->> 'has_photo')::boolean from export), true,
  'a photo is noted without exposing where it''s stored'
);

select * from finish();
rollback;
