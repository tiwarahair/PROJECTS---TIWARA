-- A client's own account photo: private, one per account at <user id>/photo.jpg, shown to them with signed URLs.
alter table public.profiles
  add column photo_path text check (photo_path is null or photo_path = id::text || '/photo.jpg');

grant update (photo_path) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('account-photos', 'account-photos', false, 2097152, array['image/jpeg']);

create policy "Users manage their account photo" on storage.objects
  for all to authenticated
  using (bucket_id = 'account-photos' and name = (select auth.uid())::text || '/photo.jpg')
  with check (bucket_id = 'account-photos' and name = (select auth.uid())::text || '/photo.jpg');
