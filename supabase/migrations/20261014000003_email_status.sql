-- Counts a hit in the current fixed window; true while the key is within its limit.
create function public.hit_rate_limit(limit_key text, max_hits integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  hits integer;
begin
  delete from public.rate_limits where rate_limits.window_start < now() - interval '1 day';

  insert into public.rate_limits as limits (key, window_start)
  values (limit_key, current_window)
  on conflict (key, window_start) do update set count = limits.count + 1
  returning count into hits;

  return hits <= max_hits;
end;
$$;

-- 'stylist' | 'customer' | 'none' for an email address (email-first log in).
create function public.get_account_kind(lookup_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when users.id is null then 'none'
    when exists (select 1 from public.stylists where owner_id = users.id) then 'stylist'
    else 'customer'
  end
  from (select 1) as one
  left join auth.users on lower(users.email) = lower(trim(lookup_email))
$$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.get_account_kind(text) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
grant execute on function public.get_account_kind(text) to service_role;
