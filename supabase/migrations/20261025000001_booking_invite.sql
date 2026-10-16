create function public.get_invite_token(token text)
returns public.booking_tokens
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.booking_tokens
  where token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8')) and purpose = 'invite'
$$;

create function public.get_booking_invite(token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  invite public.booking_tokens := public.get_invite_token(token);
  contact jsonb;
  state text;
begin
  if invite.id is null then
    raise exception 'link_not_valid';
  end if;

  select bookings.contact into contact from public.bookings where id = invite.booking_id;

  state := case
    when exists (select 1 from auth.users where lower(email) = lower(contact ->> 'email')) then 'account_exists'
    when invite.used_at is not null or invite.expires_at <= now() then 'expired'
    else 'valid'
  end;

  return jsonb_build_object('state', state) || contact;
end;
$$;

create function public.claim_booking_invite(token text, user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.booking_tokens := public.get_invite_token(token);
  contact_email text;
  linked integer;
begin
  select bookings.contact ->> 'email' into contact_email from public.bookings where id = invite.booking_id;

  if invite.id is null or invite.used_at is not null or invite.expires_at <= now()
    or not exists (select 1 from auth.users where id = claim_booking_invite.user_id and lower(email) = lower(contact_email)) then
    raise exception 'link_not_valid';
  end if;

  update public.booking_tokens set used_at = now() where id = invite.id;

  update public.bookings set client_id = claim_booking_invite.user_id
  where client_id is null and lower(bookings.contact ->> 'email') = lower(contact_email);

  get diagnostics linked = row_count;

  return linked;
end;
$$;

create function public.renew_booking_invite(token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.booking_tokens := public.get_invite_token(token);
  booking public.bookings;
begin
  if (public.get_booking_invite(token) ->> 'state') <> 'expired' then
    raise exception 'cannot_renew';
  end if;

  select * into booking from public.bookings where id = invite.booking_id for update;

  update public.booking_tokens set used_at = now() where id = invite.id;

  -- a link sent less than 24 hours ago still works, so pressing again doesn't send another
  if exists (
    select 1 from public.booking_tokens
    where booking_id = booking.id and purpose = 'invite' and used_at is null and expires_at > now()
  ) then
    return;
  end if;

  perform public.queue_email(
    booking.contact ->> 'email',
    'booking_invite',
    jsonb_build_object(
      'first', booking.contact ->> 'first',
      'save_details_url', booking.site || '/save-details?token='
        || public.create_booking_token(booking.id, 'invite', now() + interval '24 hours')
    )
  );
end;
$$;

create function public.get_owner_manage_token(ref text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  token text;
begin
  select id into target from public.bookings
  where bookings.ref = get_owner_manage_token.ref and client_id = auth.uid() and status not in ('held', 'expired');

  if target is null then
    raise exception 'link_not_valid';
  end if;

  token := public.create_booking_token(target, 'manage', now() + interval '1 day');

  update public.booking_tokens set verified_until = expires_at where token_hash = sha256(convert_to(token, 'UTF8'));

  return token;
end;
$$;

create function public.purge_expired_booking_tokens()
returns integer
language sql
security definer
set search_path = ''
as $$
  with purged as (
    delete from public.booking_tokens where expires_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::integer from purged
$$;

select cron.schedule(
  'purge-old-notifications',
  '45 3 * * *',
  $$select public.purge_old_notifications(); select public.purge_expired_booking_tokens()$$
);

revoke execute on function
  public.purge_expired_booking_tokens(),
  public.get_invite_token(text),
  public.get_booking_invite(text),
  public.claim_booking_invite(text, uuid),
  public.renew_booking_invite(text),
  public.get_owner_manage_token(text)
  from public, anon, authenticated;

grant execute on function
  public.get_booking_invite(text),
  public.claim_booking_invite(text, uuid),
  public.renew_booking_invite(text)
  to service_role;

grant execute on function public.get_owner_manage_token(text) to authenticated;
