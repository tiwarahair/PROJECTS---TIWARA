-- "An authenticator app was added / removed" emails, so an unexpected change doesn't go unnoticed
create function public.on_authenticator_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_added boolean := tg_op = 'UPDATE' and new.status = 'verified' and old.status <> 'verified';
  is_removed boolean := tg_op = 'DELETE' and old.status = 'verified';
  owner_email text;
begin
  if not (is_added or is_removed) then
    return null;
  end if;

  select email into owner_email from auth.users where id = old.user_id;

  if owner_email is not null then
    perform public.queue_email(
      owner_email,
      case when is_added then 'authenticator_added' else 'authenticator_removed' end,
      jsonb_build_object('changed_at', now()),
      old.user_id
    );
  end if;

  return null;
end;
$$;

create trigger mfa_factors_notify
  after update of status or delete on auth.mfa_factors
  for each row execute function public.on_authenticator_change();

revoke execute on function public.on_authenticator_change() from public, anon, authenticated;
