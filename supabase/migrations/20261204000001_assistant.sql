-- Client hair profile, assistant chats, and a private photo bucket.
-- Care notes are a stub: source text only. Chunk embeddings come later.

create table public.hair_profiles (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  current_style text,
  goals text,
  lifestyle text,
  sensitivities text,
  location text,
  budget_notes text,
  updated_at timestamptz not null default now()
);

create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create index assistant_conversations_user_id_idx on public.assistant_conversations (user_id, created_at desc);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations (id) on delete cascade,
  role text not null constraint assistant_messages_role_check check (role in ('user', 'assistant')),
  body text not null,
  -- path in the assistant-images bucket: {user_id}/{conversation_id}/{file}
  image_path text,
  safety text constraint assistant_messages_safety_check check (
    safety is null or safety in ('general', 'concerning', 'urgent')
  ),
  created_at timestamptz not null default now(),
  constraint assistant_messages_safety_role_check check (role = 'assistant' or safety is null)
);

create index assistant_messages_conversation_id_idx on public.assistant_messages (conversation_id, created_at);

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text not null,
  source text,
  reviewer text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index knowledge_chunks_document_id_idx on public.knowledge_chunks (document_id);

create function public.set_hair_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger hair_profiles_set_updated_at
  before update on public.hair_profiles
  for each row execute function public.set_hair_profile_updated_at();

revoke execute on function public.set_hair_profile_updated_at() from public, anon, authenticated;

alter table public.hair_profiles enable row level security;
alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

create policy "Users manage their hair profile" on public.hair_profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage their assistant conversations" on public.assistant_conversations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage their assistant messages" on public.assistant_messages
  for all to authenticated
  using (
    exists (
      select 1 from public.assistant_conversations
      where assistant_conversations.id = assistant_messages.conversation_id
        and assistant_conversations.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.assistant_conversations
      where assistant_conversations.id = assistant_messages.conversation_id
        and assistant_conversations.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.hair_profiles to authenticated;
grant select, insert, update, delete on public.assistant_conversations to authenticated;
grant select, insert, update, delete on public.assistant_messages to authenticated;

grant select, insert, update, delete on public.hair_profiles,
  public.assistant_conversations, public.assistant_messages,
  public.knowledge_documents, public.knowledge_chunks
  to service_role;

-- First folder of the object path is the signed-in user's id.
create function public.owns_assistant_image(object_name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (storage.foldername(object_name))[1] = (select auth.uid())::text
$$;

revoke execute on function public.owns_assistant_image(text) from public, anon;
grant execute on function public.owns_assistant_image(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assistant-images', 'assistant-images', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Users manage their assistant images" on storage.objects
  for all to authenticated
  using (bucket_id = 'assistant-images' and public.owns_assistant_image(name))
  with check (bucket_id = 'assistant-images' and public.owns_assistant_image(name));
