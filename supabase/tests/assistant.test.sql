begin;
select plan(16);

create function pg_temp.sign_up(user_id uuid, user_email text)
returns void
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  values (
    user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    user_email,
    jsonb_build_object(
      'account_type', 'client', 'first_name', 'Ada', 'last_name', 'Obi',
      'phone', '07700900123', 'terms_version', '2026-10'
    ),
    '{}'
  )
$$;

create function pg_temp.act_as(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.sign_up('a1111111-1111-1111-1111-111111111111', 'ada@assistant.test');
select pg_temp.sign_up('a2222222-2222-2222-2222-222222222222', 'kemi@assistant.test');

select pg_temp.act_as('a1111111-1111-1111-1111-111111111111');

select lives_ok(
  $$insert into public.hair_profiles (current_style, lifestyle)
    values ('shoulder-length locs', 'swims twice a week')$$,
  'a user saves their own hair profile'
);

select results_eq(
  $$select current_style, lifestyle from public.hair_profiles$$,
  $$values ('shoulder-length locs'::text, 'swims twice a week'::text)$$,
  'the saved profile is readable by its owner'
);

select lives_ok(
  $$insert into public.assistant_conversations (id, title)
    values ('c1111111-1111-1111-1111-111111111111', 'After swimming')$$,
  'a user opens a conversation'
);

select lives_ok(
  $$insert into public.assistant_messages (conversation_id, role, body)
    values ('c1111111-1111-1111-1111-111111111111', 'user', 'What should I do after swimming?')$$,
  'a user saves a question'
);

select lives_ok(
  $$insert into public.assistant_messages (conversation_id, role, body, safety)
    values ('c1111111-1111-1111-1111-111111111111', 'assistant', 'Rinse with water.', 'general')$$,
  'an assistant reply can carry a safety value'
);

select throws_ok(
  $$insert into public.assistant_messages (conversation_id, role, body, safety)
    values ('c1111111-1111-1111-1111-111111111111', 'user', 'My scalp hurts.', 'urgent')$$,
  '23514',
  null,
  'a user message cannot store a safety value'
);

select throws_ok(
  $$insert into public.assistant_messages (conversation_id, role, body, safety)
    values ('c1111111-1111-1111-1111-111111111111', 'assistant', 'no', 'diagnose')$$,
  '23514',
  null,
  'safety must be general, concerning, or urgent'
);

select throws_ok(
  $$insert into public.assistant_conversations (user_id) values ('a2222222-2222-2222-2222-222222222222')$$,
  '42501',
  null,
  'a user cannot open a conversation for someone else'
);

select is(
  public.owns_assistant_image('a1111111-1111-1111-1111-111111111111/c1111111-1111-1111-1111-111111111111/photo.jpg'),
  true,
  'a user owns an image path in their own folder'
);

select is(
  public.owns_assistant_image('a2222222-2222-2222-2222-222222222222/c1111111-1111-1111-1111-111111111111/photo.jpg'),
  false,
  'a user does not own an image path in someone else''s folder'
);

select throws_ok(
  $$select * from public.knowledge_documents$$,
  '42501',
  null,
  'signed-in users cannot read care notes'
);

reset role;
select pg_temp.act_as('a2222222-2222-2222-2222-222222222222');

select is_empty($$select * from public.hair_profiles$$, 'another user cannot see the hair profile');
select is_empty($$select * from public.assistant_conversations$$, 'another user cannot see the conversation');
select is_empty($$select * from public.assistant_messages$$, 'another user cannot see the messages');

select throws_ok(
  $$insert into public.assistant_messages (conversation_id, role, body)
    values ('c1111111-1111-1111-1111-111111111111', 'user', 'hello')$$,
  '42501',
  null,
  'another user cannot write into the conversation'
);

reset role;
set local role anon;

select throws_ok(
  $$select * from public.hair_profiles$$,
  '42501',
  null,
  'anonymous visitors cannot read hair profiles'
);

select * from finish();
rollback;
