-- Capability flags live in app_metadata, which only the service role can write.
create function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
$$;

-- True when the user completed 2FA in this session.
create function public.is_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal' = 'aal2', false)
$$;
