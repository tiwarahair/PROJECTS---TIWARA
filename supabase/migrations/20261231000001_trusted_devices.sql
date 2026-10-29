create table public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash bytea not null unique,
  label text not null,
  kind text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  last_used_at timestamptz
);

create index trusted_devices_user_idx on public.trusted_devices (user_id, expires_at);

alter table public.trusted_devices enable row level security;

create policy "Users read their trusted devices" on public.trusted_devices
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Users remove their trusted devices" on public.trusted_devices
  for delete to authenticated using (user_id = (select auth.uid()));

grant select (id, user_id, label, kind, created_at, expires_at, last_used_at), delete
  on public.trusted_devices to authenticated;

create table public.trusted_device_checks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null default now(),
  attempts int not null default 1
);

alter table public.trusted_device_checks enable row level security;

create function public.trust_device()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  token text := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  user_agent text;
begin
  if caller is null or not public.is_aal2() then
    raise exception 'second_factor_required';
  end if;

  if public.is_admin() then
    raise exception 'admin_not_trusted';
  end if;

  select sessions.user_agent into user_agent
  from auth.sessions
  where sessions.id::text = auth.jwt() ->> 'session_id';

  insert into public.trusted_devices (user_id, token_hash, label, kind)
  values (caller, sha256(convert_to(token, 'UTF8')), public.get_device_label(user_agent),
    public.get_device_kind(user_agent));

  return token;
end;
$$;

create function public.check_trusted_device(token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  attempts int;
  found_id uuid;
begin
  if caller is null or public.is_admin() then
    return false;
  end if;

  insert into public.trusted_device_checks as checks (user_id) values (caller)
  on conflict (user_id) do update set
    attempts = case when checks.window_started_at < now() - interval '15 minutes' then 1 else checks.attempts + 1 end,
    window_started_at = case when checks.window_started_at < now() - interval '15 minutes' then now()
      else checks.window_started_at end
  returning checks.attempts into attempts;

  if attempts > 10 then
    return false;
  end if;

  update public.trusted_devices set last_used_at = now()
  where user_id = caller and expires_at > now() and token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8'))
  returning id into found_id;

  return found_id is not null;
end;
$$;

create function public.revoke_trusted_devices()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.trusted_devices where user_id = (select auth.uid())
$$;

create function public.revoke_trusted_devices_on_password()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.trusted_devices where user_id = new.id;

  return new;
end;
$$;

create trigger users_revoke_trusted_devices after update of encrypted_password on auth.users
for each row when (old.encrypted_password is distinct from new.encrypted_password)
execute function public.revoke_trusted_devices_on_password();

create function public.revoke_trusted_devices_on_factor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.trusted_devices where user_id = old.user_id;

  return old;
end;
$$;

create trigger mfa_factors_revoke_trusted_devices after delete on auth.mfa_factors
for each row when (old.status = 'verified') execute function public.revoke_trusted_devices_on_factor();

select cron.schedule('purge-trusted-devices', '50 3 * * *', $$delete from public.trusted_devices where expires_at <= now()$$);

revoke execute on function
  public.trust_device(),
  public.check_trusted_device(text),
  public.revoke_trusted_devices(),
  public.revoke_trusted_devices_on_password(),
  public.revoke_trusted_devices_on_factor()
  from public, anon, authenticated;

grant execute on function public.trust_device(), public.check_trusted_device(text), public.revoke_trusted_devices()
  to authenticated;
