-- the "set a policy" nudge shows once after setup, then once more 2 days later (counted from going live or that
-- first nudge, whichever is later) if there's still no policy, on whichever device the stylist uses
alter table public.stylist_private
  add column policy_nudged_at timestamptz,
  add column policy_reminded_at timestamptz;

create function public.mark_policy_nudged(target uuid, is_reminder boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.stylist_private
  set policy_nudged_at = coalesce(policy_nudged_at, now()),
    policy_reminded_at = case when is_reminder then coalesce(policy_reminded_at, now()) else policy_reminded_at end
  where stylist_id = target and public.is_stylist_owner(target)
$$;

revoke execute on function public.mark_policy_nudged(uuid, boolean) from public, anon, authenticated;
grant execute on function public.mark_policy_nudged(uuid, boolean) to authenticated;
