-- A client's saved stylists. Kept by stylist id so a renamed link still counts; read and written by slug.
create table public.favourites (
  client_id uuid not null references auth.users (id) on delete cascade,
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, stylist_id)
);

create index favourites_stylist_idx on public.favourites (stylist_id);

alter table public.favourites enable row level security;
grant select on public.favourites to authenticated;

create policy "Clients see their own favourites" on public.favourites
  for select to authenticated using (client_id = (select auth.uid()));

/** The signed-in client's favourites with a public profile, newest first, as current slugs. */
create function public.get_my_favourites()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(stylists.slug::text order by favourites.created_at desc), '{}')
  from public.favourites
  join public.stylists on stylists.id = favourites.stylist_id
  where favourites.client_id = auth.uid() and stylists.status in ('live', 'paused')
$$;

/** Saves or removes a favourite by current or retired slug; an unknown slug does nothing. */
create function public.set_favourite(stylist_slug text, saved boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  target := coalesce(
    (select id from public.stylists where slug = stylist_slug::extensions.citext),
    (select stylist_id from public.stylist_slug_history where slug = stylist_slug::extensions.citext)
  );

  if target is null then
    return;
  end if;

  if saved then
    insert into public.favourites (client_id, stylist_id) values (auth.uid(), target) on conflict do nothing;
  else
    delete from public.favourites where client_id = auth.uid() and stylist_id = target;
  end if;
end;
$$;

revoke execute on function public.get_my_favourites(), public.set_favourite(text, boolean) from public, anon;
grant execute on function public.get_my_favourites(), public.set_favourite(text, boolean) to authenticated;
