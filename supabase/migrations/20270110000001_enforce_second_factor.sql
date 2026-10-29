create table public.trusted_sessions (
  session_id uuid primary key,
  device_id uuid not null references public.trusted_devices (id) on delete cascade
);

create index trusted_sessions_device_idx on public.trusted_sessions (device_id);

alter table public.trusted_sessions enable row level security;

create function public.is_second_factor_passed(target_user uuid, target_session text, session_aal text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user is not null and (
    session_aal = 'aal2'
    or not exists (select 1 from auth.mfa_factors where user_id = target_user and status = 'verified')
    or exists (
      select 1 from public.trusted_sessions
      join public.trusted_devices on trusted_devices.id = trusted_sessions.device_id
      where trusted_sessions.session_id::text = target_session
        and trusted_devices.user_id = target_user
        and trusted_devices.expires_at > now()
    )
  )
$$;

create function public.passed_second_factor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_second_factor_passed(auth.uid(), auth.jwt() ->> 'session_id', auth.jwt() ->> 'aal')
$$;

create or replace function public.trust_device()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  token text := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  user_agent text;
  device_id uuid;
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
    public.get_device_kind(user_agent))
  returning id into device_id;

  if auth.jwt() ->> 'session_id' is not null then
    insert into public.trusted_sessions (session_id, device_id)
    values ((auth.jwt() ->> 'session_id')::uuid, device_id)
    on conflict (session_id) do update set device_id = excluded.device_id;
  end if;

  return token;
end;
$$;

create function public.revoke_other_trusted_devices()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.trusted_devices
  where user_id = (select auth.uid())
    and id is distinct from (
      select device_id from public.trusted_sessions where session_id::text = auth.jwt() ->> 'session_id'
    )
$$;

create or replace function public.check_trusted_device(token text)
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

  if found_id is null or auth.jwt() ->> 'session_id' is null then
    return false;
  end if;

  insert into public.trusted_sessions (session_id, device_id)
  values ((auth.jwt() ->> 'session_id')::uuid, found_id)
  on conflict (session_id) do update set device_id = excluded.device_id;

  return true;
end;
$$;

create or replace function public.is_stylist_owner(target_stylist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.passed_second_factor() and exists (
    select 1 from public.stylists where id = target_stylist_id and owner_id = auth.uid()
  )
$$;

create or replace function public.is_service_owner(target_service_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.passed_second_factor() and exists (
    select 1
    from public.services
    join public.stylists on stylists.id = services.stylist_id
    where services.id = target_service_id and stylists.owner_id = auth.uid()
  )
$$;

create or replace function public.owns_photo_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.passed_second_factor() and exists (
    select 1 from public.stylists
    where id::text = (storage.foldername(object_name))[1] and owner_id = auth.uid()
  )
$$;

drop policy "Owners read their stylist" on public.stylists;
drop policy "Owners update their stylist" on public.stylists;

create policy "Owners read their stylist" on public.stylists
  for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.passed_second_factor()));

create policy "Owners update their stylist" on public.stylists
  for update to authenticated
  using (owner_id = (select auth.uid()) and (select public.passed_second_factor()))
  with check (owner_id = (select auth.uid()) and (select public.passed_second_factor()));

create or replace function public.change_slug(new_slug text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_stylist public.stylists;
  wanted text := lower(trim(new_slug));
begin
  if not public.passed_second_factor() then
    raise exception 'second_factor_required';
  end if;
  select * into current_stylist from public.stylists where owner_id = auth.uid();
  if current_stylist.id is null then
    raise exception 'no business on this account';
  end if;
  if wanted = current_stylist.slug::text then
    return wanted;
  end if;
  if current_stylist.slug_changed_at > now() - interval '30 days' then
    raise exception 'the booking link can change once every 30 days';
  end if;
  if not public.is_slug_free(wanted, current_stylist.id) then
    raise exception 'that booking link is not available';
  end if;
  -- reclaiming one of their own old slugs takes it out of history
  delete from public.stylist_slug_history
  where slug = wanted::extensions.citext and stylist_id = current_stylist.id;
  insert into public.stylist_slug_history (slug, stylist_id)
  values (current_stylist.slug, current_stylist.id);
  update public.stylists
  set slug = wanted::extensions.citext, slug_changed_at = now()
  where id = current_stylist.id;
  return wanted;
end;
$$;

create or replace function public.close_business()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.passed_second_factor() then
    raise exception 'second_factor_required';
  end if;
  if exists (
    select 1 from public.bookings
    join public.stylists on stylists.id = bookings.stylist_id
    where stylists.owner_id = auth.uid()
      and bookings.status in ('awaiting_confirmation', 'confirmed', 'arrived')
      and bookings.unpaid_at is null
      and bookings.starts_at >= date_trunc('day', now() at time zone 'Europe/London') at time zone 'Europe/London'
  ) then
    raise exception 'has_upcoming';
  end if;
  if exists (
    select 1 from public.disputes
    join public.stylists on stylists.id = disputes.stylist_id
    where stylists.owner_id = auth.uid()
      and disputes.status in ('needs_response', 'under_review', 'warning_needs_response', 'warning_under_review')
  ) then
    raise exception 'has_dispute';
  end if;
  if exists (
    select 1 from public.stylist_debts debts
    join public.stylists on stylists.id = debts.stylist_id
    where stylists.owner_id = auth.uid() and debts.recovered_pence < debts.amount_pence
  ) then
    raise exception 'has_debt';
  end if;
  update public.stylists
  set status = 'closed', closed_at = now()
  where owner_id = auth.uid() and status <> 'closed';
  if not found then
    raise exception 'no open business on this account';
  end if;
end;
$$;

create or replace function public.reopen_business()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.passed_second_factor() then
    raise exception 'second_factor_required';
  end if;
  update public.stylists
  set status = 'draft', closed_at = null
  where owner_id = auth.uid() and status = 'closed' and closed_at > now() - interval '15 days';
  if not found then
    raise exception 'this business can no longer be reopened';
  end if;
end;
$$;

revoke execute on function public.is_second_factor_passed(uuid, text, text), public.passed_second_factor()
  from public, anon, authenticated;

grant execute on function public.passed_second_factor() to authenticated;
grant execute on function public.is_second_factor_passed(uuid, text, text) to service_role;

revoke execute on function public.revoke_other_trusted_devices() from public, anon, authenticated;
grant execute on function public.revoke_other_trusted_devices() to authenticated;
