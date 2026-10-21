-- A client deleting their own account (client-delete-account function). Bookings and money stay as the stylist's
-- and our records (6 years for tax), without the client's details. A booking paid in the last 120 days keeps the
-- client's name and email until then, in case a card payment is disputed; the nightly purge clears them after.

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
      where bookings.client_id = client and bookings.status in ('awaiting_confirmation', 'confirmed', 'arrived')
    ), '[]'),
    'owes_money', exists (
      select 1 from public.bookings
      where bookings.client_id = client
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
  where booking_id in (select id from public.bookings where client_id = client);

  delete from public.notifications
  where to_address = (select email from auth.users where id = client);

  update public.booking_events
  set data = data - 'from' - 'to'
  where kind = 'address_changed' and booking_id in (select id from public.bookings where client_id = client);

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
  where client_id = client;
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
  public.get_deletion_blockers(uuid),
  public.get_my_deletion_blockers(),
  public.has_recent_payment(uuid),
  public.anonymise_client_bookings(uuid),
  public.purge_deleted_client_contacts()
  from public, anon, authenticated;

grant execute on function public.get_my_deletion_blockers() to authenticated;

grant execute on function
  public.get_deletion_blockers(uuid),
  public.anonymise_client_bookings(uuid)
  to service_role;
