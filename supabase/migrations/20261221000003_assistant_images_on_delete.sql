create function public.get_assistant_image_paths(client uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select name from storage.objects
  where bucket_id = 'assistant-images' and (storage.foldername(name))[1] = client::text
$$;

revoke execute on function public.get_assistant_image_paths(uuid) from public, anon, authenticated;
grant execute on function public.get_assistant_image_paths(uuid) to service_role;
