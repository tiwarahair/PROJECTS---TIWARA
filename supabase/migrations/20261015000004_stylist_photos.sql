-- Profile photos in Storage: <stylist id>/cover, <stylist id>/avatar, <stylist id>/portfolio/<id>. Anyone can view; owners write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stylist-photos', 'stylist-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create table public.portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  path text not null unique,
  sort smallint not null,
  created_at timestamptz not null default now()
);

create index portfolio_photos_stylist_id_idx on public.portfolio_photos (stylist_id);

create function public.limit_portfolio()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.portfolio_photos where stylist_id = new.stylist_id) >= 20 then
    raise exception 'a portfolio holds up to 20 photos';
  end if;

  return new;
end;
$$;

create trigger portfolio_photos_limit
  before insert on public.portfolio_photos
  for each row execute function public.limit_portfolio();

alter table public.portfolio_photos enable row level security;

create policy "Owners manage their portfolio" on public.portfolio_photos
  for all to authenticated
  using (public.is_stylist_owner(stylist_id))
  with check (public.is_stylist_owner(stylist_id));

grant select, insert, update, delete on public.portfolio_photos to authenticated;

-- the first folder of the object path is the stylist id
create function public.owns_photo_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stylists
    where id::text = (storage.foldername(object_name))[1] and owner_id = auth.uid()
  )
$$;

-- for all: upsert and remove also need select on the owner's own files
create policy "Owners manage stylist photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'stylist-photos' and public.owns_photo_path(name))
  with check (bucket_id = 'stylist-photos' and public.owns_photo_path(name));
