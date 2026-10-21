-- A client deleting their own account (client-delete-account function). Bookings and money stay as the stylist's
-- and our records (6 years for tax), without the client's details. A booking paid in the last 120 days keeps the
-- client's name and email until then, in case a card payment is disputed; the nightly purge clears them after.

-- the client's bookings: those linked to their login, and ones they made as a guest with the same (verified) email
create function public.client_booking_ids(client uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select bookings.id from public.bookings where bookings.client_id = client
  union
  select bookings.id from public.bookings
  join auth.users on users.id = client and users.email_confirmed_at is not null
  where bookings.client_id is null and lower(bookings.contact ->> 'email') = lower(users.email)
$$;

-- what stops a client deleting their account: bookings still to happen, money they owe, a business of their own
-- (deleting a stylist's login would delete their business and its bookings)
create function public.get_deletion_blockers(client uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'bookings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ref', bookings.ref, 'stylist_name', stylists.business_name, 'starts_at', bookings.starts_at
      ) order by bookings.starts_at)
      from public.bookings
      join public.stylists on stylists.id = bookings.stylist_id
      where bookings.id in (select public.client_booking_ids(client))
        and bookings.status in ('awaiting_confirmation', 'confirmed', 'arrived')
    ), '[]'),
    'owes_money', exists (
      select 1 from public.bookings
      where bookings.id in (select public.client_booking_ids(client))
        and (bookings.unpaid_at is not null or exists (
          select 1 from public.booking_fees
          where booking_fees.booking_id = bookings.id and booking_fees.status in ('pending', 'charging', 'unpaid')
        ))
    ),
    'has_business', exists (select 1 from public.stylists where owner_id = client)
  )
$$;

create function public.get_my_deletion_blockers()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_deletion_blockers((select auth.uid()))
$$;

-- an anonymised booking keeps its stylist's client card, so the trigger leaves it alone
create or replace function public.set_booking_client()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.contact ->> 'account_deleted')::boolean then
    return new;
  end if;

  if new.contact is null then
    new.stylist_client_id := null;
  elsif new.status = 'held' then
    if exists (
      select 1 from public.stylist_clients
      where id in (select public.get_contact_clients(new.stylist_id, new.contact)) and blocked_at is not null
    ) then
      raise exception 'not_bookable_contact';
    end if;
  elsif new.status <> 'expired' and (
    new.stylist_client_id is null or (
      tg_op = 'UPDATE' and new.contact is distinct from old.contact and not exists (
        select 1 from public.stylist_clients as linked
        where linked.id = new.stylist_client_id
          and linked.email is not distinct from lower(nullif(trim(new.contact ->> 'email'), ''))
          and linked.phone is not distinct from nullif(public.normalise_phone(new.contact ->> 'phone'), '')
      )
    )
  ) then
    new.stylist_client_id := public.match_stylist_client(new.stylist_id, new.contact);
  end if;

  return new;
end;
$$;

create function public.has_recent_payment(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.payments where booking_id = target and created_at > now() - interval '120 days')
$$;

-- run just before the login is deleted (which clears client_id)
create function public.anonymise_client_bookings(client uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.booking_tokens
  where booking_id in (select public.client_booking_ids(client));

  delete from public.notifications
  where to_address = (select email from auth.users where id = client);

  update public.booking_events
  set data = data - 'from' - 'to'
  where kind = 'address_changed' and booking_id in (select public.client_booking_ids(client));

  update public.bookings
  set contact = case
      when public.has_recent_payment(id) then jsonb_build_object(
        'first', contact ->> 'first', 'last', contact ->> 'last', 'email', contact ->> 'email', 'account_deleted', true
      )
      else jsonb_build_object('account_deleted', true)
    end,
    notes = null,
    allergies = null,
    allergies_consented_at = null,
    address = null,
    location = null
  where id in (select public.client_booking_ids(client));
$$;

-- a session over 24 hours old needs an emailed code before the account can be deleted
create function public.is_recent_session(session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.sessions where id = session and created_at > now() - interval '24 hours')
$$;

create table public.account_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash bytea not null,
  attempts smallint not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index account_codes_user_idx on public.account_codes (user_id, created_at desc);

alter table public.account_codes enable row level security;

-- the same rules as booking codes: 10 minutes, one every 30 seconds, five an hour, five tries
create function public.send_account_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  client uuid := (select auth.uid());
  email text := (select users.email from auth.users where id = client);
  code text := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
begin
  if email is null then
    raise exception 'not_signed_in';
  end if;

  perform 1 from public.profiles where id = client for update;

  if exists (
    select 1 from public.account_codes
    where user_id = client and used_at is null and created_at > now() - interval '30 seconds'
  ) then
    return public.mask_email(email);
  end if;

  if (select count(*) from public.account_codes where user_id = client and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many_codes';
  end if;

  insert into public.account_codes (user_id, code_hash, expires_at)
  values (client, public.hash_booking_code(client, code), now() + interval '10 minutes');

  perform public.queue_email(email, 'account_code', jsonb_build_object('code', code), client);
  perform public.send_notifications_now();

  return public.mask_email(email);
end;
$$;

create function public.use_account_code(client uuid, code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest public.account_codes;
begin
  perform 1 from public.profiles where id = client for update;

  select * into latest from public.account_codes
  where user_id = client and used_at is null and expires_at > now()
  order by created_at desc
  limit 1;

  if latest.id is null then
    return 'expired';
  end if;

  if latest.attempts >= 5 then
    return 'too_many_attempts';
  end if;

  if not exists (
    select 1 from public.account_codes
    where user_id = client and used_at is null and expires_at > now()
      and code_hash = public.hash_booking_code(client, trim(coalesce(code, '')))
  ) then
    update public.account_codes set attempts = attempts + 1 where id = latest.id;

    return case when latest.attempts + 1 >= 5 then 'too_many_attempts' else 'wrong_code' end;
  end if;

  update public.account_codes set used_at = now() where user_id = client and used_at is null;

  return 'verified';
end;
$$;

create index bookings_deleted_contact_idx on public.bookings (id) where (contact ->> 'account_deleted') is not null;

-- nightly: a deleted client's name and email go once their last payment is 120 days old
create function public.purge_deleted_client_contacts()
returns integer
language sql
security definer
set search_path = ''
as $$
  with purged as (
    update public.bookings
    set contact = jsonb_build_object('account_deleted', true)
    where (contact ->> 'account_deleted') is not null
      and contact <> jsonb_build_object('account_deleted', true)
      and not public.has_recent_payment(id)
    returning 1
  )
  select count(*)::integer from purged
$$;

select cron.schedule(
  'purge-old-notifications',
  '45 3 * * *',
  $$select public.purge_old_notifications(); select public.purge_expired_booking_tokens();
    select public.purge_deleted_client_contacts()$$
);

revoke execute on function
  public.client_booking_ids(uuid),
  public.is_recent_session(uuid),
  public.send_account_code(),
  public.use_account_code(uuid, text),
  public.get_deletion_blockers(uuid),
  public.get_my_deletion_blockers(),
  public.has_recent_payment(uuid),
  public.anonymise_client_bookings(uuid),
  public.purge_deleted_client_contacts()
  from public, anon, authenticated;

grant execute on function public.get_my_deletion_blockers(), public.send_account_code() to authenticated;

grant execute on function
  public.get_deletion_blockers(uuid),
  public.anonymise_client_bookings(uuid),
  public.is_recent_session(uuid),
  public.use_account_code(uuid, text)
  to service_role;
