-- A stylist's client record linked to the client's own account, through bookings made while signed in. Linked
-- records keep the account's email and mobile, and its name until the stylist renames them.
alter table public.stylist_clients add column client_id uuid references public.profiles (id) on delete set null;

create unique index stylist_clients_client_idx on public.stylist_clients (stylist_id, client_id)
  where client_id is not null and deleted_at is null;

-- each account is linked to the record its latest signed-in booking with that stylist used
update public.stylist_clients
set client_id = latest.client_id
from (
  select distinct on (bookings.stylist_id, bookings.client_id) bookings.stylist_client_id, bookings.client_id
  from public.bookings
  join public.stylist_clients on stylist_clients.id = bookings.stylist_client_id and stylist_clients.deleted_at is null
  where bookings.client_id is not null
  order by bookings.stylist_id, bookings.client_id, bookings.created_at desc
) as latest
where stylist_clients.id = latest.stylist_client_id and stylist_clients.client_id is null;

/** After a client's phone or email changes, upcoming bookings take the new details. Those whose email changes lose
    links sent to the old address, and one waiting for confirmation is sent to the new email. */
create function public.push_client_contact(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.stylist_clients;
  changed uuid[];
  awaiting uuid;
begin
  select * into saved from public.stylist_clients where id = target;

  select coalesce(array_agg(id), '{}') into changed from public.bookings
  where stylist_client_id = saved.id and starts_at > now() and status in ('awaiting_confirmation', 'confirmed')
    and lower(nullif(trim(contact ->> 'email'), '')) is distinct from saved.email;

  update public.bookings
  set contact = contact || jsonb_build_object('phone', saved.phone, 'email', saved.email)
  where stylist_client_id = saved.id and starts_at > now() and status in ('awaiting_confirmation', 'confirmed');

  delete from public.booking_tokens where booking_id = any(changed);

  if saved.email is null then
    return;
  end if;

  for awaiting in
    select id from public.bookings
    where id = any(changed) and status = 'awaiting_confirmation' and protection_status = 'pending'
      and confirm_by > now()
  loop
    perform public.send_confirm_link(awaiting, 'confirm_booking', false);
  end loop;
end;
$$;

-- MERGE based on email - double check
/** Folds a record into the linked one when they turn out to be the same person: bookings move across, the kept record
    takes the other's photo if it has none, both sets of hair notes, and a block on either. */
create function public.merge_stylist_clients(keep uuid, other uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bookings set stylist_client_id = keep where stylist_client_id = other;

  update public.stylist_clients as kept
  set photo_path = coalesce(kept.photo_path, merged.photo_path),
    hair_notes = nullif(concat_ws(E'\n\n', kept.hair_notes, merged.hair_notes), ''),
    blocked_at = coalesce(kept.blocked_at, merged.blocked_at)
  from public.stylist_clients as merged
  where kept.id = keep and merged.id = other;

  delete from public.stylist_clients where id = other;
$$;

/** A new account name reaches linked records the stylist hasn't renamed; a new mobile reaches all of them. */
create function public.sync_linked_client_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked public.stylist_clients;
begin
  update public.stylist_clients
  set first = coalesce(nullif(trim(new.first_name), ''), first), last = nullif(trim(new.last_name), '')
  where client_id = new.id and deleted_at is null
    and first is not distinct from trim(old.first_name) and last is not distinct from nullif(trim(old.last_name), '');

  if new.phone is distinct from old.phone then
    for linked in
      select * from public.stylist_clients where client_id = new.id and deleted_at is null
    loop
      update public.stylist_clients set phone = nullif(public.normalise_phone(new.phone), '') where id = linked.id;
      perform public.push_client_contact(linked.id);
    end loop;
  end if;

  return new;
end;
$$;

create trigger profiles_sync_linked_clients
  after update of first_name, last_name, phone on public.profiles
  for each row execute function public.sync_linked_client_profile();

/** A confirmed new account email reaches every linked record, folding in another record that already has it. */
create function public.sync_linked_client_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked public.stylist_clients;
  other public.stylist_clients;
begin
  for linked in
    select * from public.stylist_clients where client_id = new.id and deleted_at is null
  loop
    select * into other from public.stylist_clients
    where stylist_id = linked.stylist_id and email = lower(new.email) and id <> linked.id and deleted_at is null;

    -- a record linked to another account can't be merged, so this stylist keeps the old email for now
    continue when other.client_id is not null;

    -- MERGE based on email - double check
    if other.id is not null then
      perform public.merge_stylist_clients(linked.id, other.id);
    end if;

    update public.stylist_clients set email = lower(new.email) where id = linked.id;
    perform public.push_client_contact(linked.id);
  end loop;

  return new;
end;
$$;

create trigger users_sync_linked_clients
  after update of email on auth.users
  for each row when (new.email is distinct from old.email and new.email is not null)
  execute function public.sync_linked_client_email();

-- a signed-in booking uses the record linked to that account, else matches by email or phone and links it
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
      where blocked_at is not null and (
        id in (select public.get_contact_clients(new.stylist_id, new.contact))
        or (client_id = new.client_id and stylist_id = new.stylist_id and deleted_at is null)
      )
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
    new.stylist_client_id := coalesce(
      (
        select id from public.stylist_clients
        where stylist_id = new.stylist_id and client_id = new.client_id and deleted_at is null
      ),
      public.match_stylist_client(new.stylist_id, new.contact)
    );

    if new.client_id is not null and not exists (
      select 1 from public.stylist_clients
      where stylist_id = new.stylist_id and client_id = new.client_id and deleted_at is null
    ) then
      update public.stylist_clients set client_id = new.client_id
      where id = new.stylist_client_id and client_id is null;
    end if;
  end if;

  return new;
end;
$$;

-- the stylist's own edits share the contact push with account changes
create or replace function public.save_stylist_client(target_stylist uuid, details jsonb, target uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.stylist_clients;
  previous public.stylist_clients;
  new_phone text := nullif(public.normalise_phone(details ->> 'phone'), '');
  new_email text := lower(nullif(trim(details ->> 'email'), ''));
begin
  if not public.is_stylist_owner(target_stylist) then
    raise exception 'not_found';
  end if;

  if new_phone is null and new_email is null then
    raise exception 'contact_required';
  end if;

  if new_phone is not null and new_phone !~ '^07\d{9}$' then
    raise exception 'invalid_phone';
  end if;

  if new_email is not null and new_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;

  select * into previous from public.stylist_clients
  where id = target and stylist_id = target_stylist and deleted_at is null
  for update;

  if target is not null and previous.id is null then
    raise exception 'not_found';
  end if;

  begin
    if previous.id is null then
      insert into public.stylist_clients (stylist_id, first, last, phone, email, photo_path, hair_notes)
      values (target_stylist, trim(details ->> 'first'), nullif(trim(details ->> 'last'), ''), new_phone, new_email,
        nullif(details ->> 'photo_path', ''), nullif(trim(details ->> 'hair_notes'), ''))
      returning * into saved;
    else
      update public.stylist_clients
      set first = trim(details ->> 'first'), last = nullif(trim(details ->> 'last'), ''), phone = new_phone,
        email = new_email, photo_path = nullif(details ->> 'photo_path', ''),
        hair_notes = nullif(trim(details ->> 'hair_notes'), '')
      where id = target
      returning * into saved;
    end if;
  exception when unique_violation then
    raise exception 'duplicate_email';
  end;

  if previous.id is not null
    and (saved.phone is distinct from previous.phone or saved.email is distinct from previous.email) then
    perform public.push_client_contact(saved.id);
  end if;

  return saved.id;
end;
$$;

-- a deleted client record drops its account link, so nothing the client shares reaches it any more
create or replace function public.delete_stylist_client(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  client public.stylist_clients;
begin
  select * into client from public.stylist_clients
  where id = target and deleted_at is null and public.is_stylist_owner(stylist_id)
  for update;

  if client.id is null then
    raise exception 'not_found';
  end if;

  if exists (
    select 1 from public.bookings
    where stylist_client_id = target and status in ('awaiting_confirmation', 'confirmed', 'arrived')
  ) then
    raise exception 'has_upcoming';
  end if;

  if exists (
    select 1 from public.booking_fees join public.bookings on bookings.id = booking_fees.booking_id
    where bookings.stylist_client_id = target and booking_fees.status in ('pending', 'charging', 'unpaid')
  ) then
    raise exception 'unpaid_fee';
  end if;

  -- payments can still be disputed for 120 days
  if exists (
    select 1 from public.payments join public.bookings on bookings.id = payments.booking_id
    where bookings.stylist_client_id = target and payments.created_at > now() - interval '120 days'
  ) then
    raise exception 'recent_payment';
  end if;

  update public.stylist_clients
  set first = 'Deleted client', last = null, phone = null, email = null, photo_path = null, hair_notes = null,
    blocked_at = null, client_id = null, deleted_at = now()
  where id = target;
end;
$$;

revoke execute on function
  public.push_client_contact(uuid),
  public.merge_stylist_clients(uuid, uuid),
  public.sync_linked_client_profile(),
  public.sync_linked_client_email()
  from public, anon, authenticated;
