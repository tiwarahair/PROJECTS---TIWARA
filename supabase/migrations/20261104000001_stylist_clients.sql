-- Each stylist's own client list: matched from bookings, edited, blocked and deleted in Studio.

-- every way a UK mobile is written (07…, 7…, +44 7…, +44 07…) becomes 07…
create or replace function public.normalise_phone(phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when digits ~ '^(44)?0?7\d{9}$' then '0' || right(digits, 10) else regexp_replace(digits, '^44', '0') end
  from (select regexp_replace(coalesce(phone, ''), '\D', '', 'g') as digits) as cleaned
$$;
create table public.stylist_clients (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  first text not null check (char_length(first) between 1 and 80),
  last text check (char_length(last) <= 80),
  phone text check (char_length(phone) <= 20),
  email text check (char_length(email) <= 254),
  photo_path text,
  hair_notes text check (char_length(hair_notes) <= 1000),
  blocked_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index stylist_clients_email_idx on public.stylist_clients (stylist_id, email) where email is not null;
create index stylist_clients_phone_idx on public.stylist_clients (stylist_id, phone) where phone is not null;

alter table public.stylist_clients enable row level security;

create policy "Owners read their clients" on public.stylist_clients
  for select to authenticated using (public.is_stylist_owner(stylist_id));

grant select on public.stylist_clients to authenticated;

alter table public.bookings add column stylist_client_id uuid references public.stylist_clients (id);

create index bookings_stylist_client_idx on public.bookings (stylist_client_id);

/** The stylist's client for a booking's contact: by email, or with no email by phone (the most recently booked). */
create function public.find_stylist_client(target_stylist uuid, contact jsonb)
returns public.stylist_clients
language sql
stable
security definer
set search_path = ''
as $$
  select clients.*
  from public.stylist_clients as clients
  where clients.stylist_id = target_stylist and clients.deleted_at is null
    and case
      when nullif(trim(contact ->> 'email'), '') is not null then clients.email = lower(trim(contact ->> 'email'))
      else length(public.normalise_phone(contact ->> 'phone')) >= 10
        and clients.phone = public.normalise_phone(contact ->> 'phone')
    end
  order by greatest(
    clients.created_at,
    (select max(bookings.created_at) from public.bookings where bookings.stylist_client_id = clients.id)
  ) desc
  limit 1
$$;

/** Clients a contact could be, for blocks and unpaid fees: their email's, or by phone when the email isn't known. */
create function public.get_contact_clients(target_stylist uuid, contact jsonb)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select clients.id
  from public.stylist_clients as clients
  where clients.stylist_id = target_stylist and clients.deleted_at is null
    and (
      clients.email = lower(nullif(trim(contact ->> 'email'), ''))
      or (
        length(public.normalise_phone(contact ->> 'phone')) >= 10
        and clients.phone = public.normalise_phone(contact ->> 'phone')
        and not exists (
          select 1 from public.stylist_clients as other
          where other.stylist_id = target_stylist and other.deleted_at is null
            and other.email = lower(nullif(trim(contact ->> 'email'), ''))
        )
      )
    )
$$;

create function public.match_stylist_client(target_stylist uuid, contact jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.stylist_clients := public.find_stylist_client(target_stylist, contact);
  created uuid;
begin
  if found.id is not null then
    return found.id;
  end if;

  insert into public.stylist_clients (stylist_id, first, last, phone, email)
  values (
    target_stylist,
    coalesce(nullif(trim(contact ->> 'first'), ''), 'Client'),
    nullif(trim(contact ->> 'last'), ''),
    nullif(public.normalise_phone(contact ->> 'phone'), ''),
    lower(nullif(trim(contact ->> 'email'), ''))
  )
  on conflict (stylist_id, email) where email is not null do nothing
  returning id into created;

  return coalesce(created, (public.find_stylist_client(target_stylist, contact)).id);
end;
$$;

-- Online checkout turns a blocked contact away; a booking that's happening gets its client.
create function public.set_booking_client()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

create trigger bookings_set_client
  before insert or update of contact, status on public.bookings
  for each row execute function public.set_booking_client();

do $$
declare
  booking record;
begin
  for booking in
    select id, stylist_id, contact, created_at from public.bookings
    where contact is not null and status not in ('held', 'expired')
    order by created_at
  loop
    update public.bookings set stylist_client_id = public.match_stylist_client(booking.stylist_id, booking.contact)
    where id = booking.id;

    -- a client made here dates from their first booking, so "most recently booked" still holds
    update public.stylist_clients set created_at = booking.created_at
    where id = (select stylist_client_id from public.bookings where id = booking.id) and created_at > booking.created_at;
  end loop;
end;
$$;

-- An unpaid fee also blocks by phone only when the email isn't one of the stylist's clients.
create or replace function public.has_unpaid_fee(target_stylist uuid, contact jsonb, client uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.booking_fees as fee
    join public.bookings on bookings.id = fee.booking_id
    where bookings.stylist_id = target_stylist
      and fee.status = 'unpaid'
      and (
        (has_unpaid_fee.client is not null and bookings.client_id = has_unpaid_fee.client)
        or bookings.stylist_client_id in (select public.get_contact_clients(target_stylist, has_unpaid_fee.contact))
        or lower(bookings.contact ->> 'email') = lower(nullif(has_unpaid_fee.contact ->> 'email', ''))
      )
  )
$$;

/** Studio's client list, with what each client has booked and paid. */
create function public.get_studio_clients(target_stylist uuid)
returns table (
  id uuid, first text, last text, phone text, email text, photo_path text, hair_notes text, blocked boolean,
  created_at timestamptz, visits integer, last_visit timestamptz, upcoming integer, no_shows integer,
  late_cancels integer, paid_pence integer, booking_paid_pence integer, fee_paid_pence integer, refund_pence integer,
  last_payment_at timestamptz, allergies text, allergies_at timestamptz, allergies_by text
)
language sql
stable
security definer
set search_path = ''
as $$
  select clients.id, clients.first, clients.last, clients.phone, clients.email, clients.photo_path, clients.hair_notes,
    clients.blocked_at is not null, clients.created_at,
    count(*) filter (where bookings.status = 'completed')::integer,
    max(bookings.starts_at) filter (where bookings.status = 'completed'),
    count(*) filter (where bookings.status in ('awaiting_confirmation', 'confirmed', 'arrived'))::integer,
    count(*) filter (where bookings.status = 'no_show')::integer,
    count(*) filter (where bookings.status = 'cancelled' and exists (
      select 1 from public.booking_fees as fee
      where fee.booking_id = bookings.id and fee.kind = 'late_cancel' and fee.status not in ('waived', 'void')
    ))::integer,
    coalesce(sum(money.paid), 0)::integer - coalesce(sum(money.refunded), 0)::integer,
    coalesce(sum(money.booking_paid), 0)::integer,
    coalesce(sum(money.fee_paid), 0)::integer,
    coalesce(sum(money.refunded), 0)::integer,
    max(money.last_payment_at),
    allergy.allergies, allergy.allergies_consented_at, allergy.first
  from public.stylist_clients as clients
  left join public.bookings on bookings.stylist_client_id = clients.id
  left join lateral (
    select
      (select sum(amount_pence) from public.payments where booking_id = bookings.id) as paid,
      (select sum(amount_pence) from public.payments where booking_id = bookings.id and kind = 'booking') as booking_paid,
      (select sum(amount_pence) from public.payments where booking_id = bookings.id and kind = 'fee') as fee_paid,
      (select sum(amount_pence) from public.refunds where booking_id = bookings.id) as refunded,
      (select max(created_at) from public.payments where booking_id = bookings.id) as last_payment_at
  ) as money on true
  left join lateral (
    select latest.allergies, latest.allergies_consented_at, latest.contact ->> 'first' as first
    from public.bookings as latest
    where latest.stylist_client_id = clients.id and latest.allergies is not null
    order by latest.allergies_consented_at desc nulls last
    limit 1
  ) as allergy on true
  where clients.stylist_id = target_stylist and clients.deleted_at is null and public.is_stylist_owner(target_stylist)
  group by clients.id, allergy.allergies, allergy.allergies_consented_at, allergy.first
$$;

/** Adds or edits a client; a new phone or email also goes on their bookings still to come. */
create function public.save_stylist_client(target_stylist uuid, details jsonb, target uuid default null)
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
  awaiting uuid;
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
    update public.bookings
    set contact = contact || jsonb_build_object('phone', saved.phone, 'email', saved.email)
    where stylist_client_id = saved.id and starts_at > now()
      and status in ('awaiting_confirmation', 'confirmed');

    -- links sent to the old email stop working
    if saved.email is distinct from previous.email then
      delete from public.booking_tokens
      where booking_id in (
        select id from public.bookings
        where stylist_client_id = saved.id and starts_at > now() and status in ('awaiting_confirmation', 'confirmed')
      );
    end if;

    if saved.email is distinct from previous.email and saved.email is not null then
      for awaiting in
        select bookings.id from public.bookings
        where stylist_client_id = saved.id and status = 'awaiting_confirmation' and protection_status = 'pending'
          and confirm_by > now()
      loop
        perform public.send_confirm_link(awaiting, 'confirm_booking', false);
      end loop;
    end if;
  end if;

  return saved.id;
end;
$$;

create function public.set_client_blocked(target uuid, blocked boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stylist_clients
  set blocked_at = case when blocked then coalesce(blocked_at, now()) end
  where id = target and deleted_at is null and public.is_stylist_owner(stylist_id);

  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

/** Deletes a client by clearing their details; their bookings keep the contact they were made with. */
create function public.delete_stylist_client(target uuid)
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
    blocked_at = null, deleted_at = now()
  where id = target;
end;
$$;

-- Client photos are private: <stylist id>/<client id>/<file>, read with signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-photos', 'client-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Owners manage client photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'client-photos' and public.owns_photo_path(name))
  with check (bucket_id = 'client-photos' and public.owns_photo_path(name));

revoke execute on function
  public.find_stylist_client(uuid, jsonb),
  public.get_contact_clients(uuid, jsonb),
  public.match_stylist_client(uuid, jsonb),
  public.set_booking_client(),
  public.get_studio_clients(uuid),
  public.save_stylist_client(uuid, jsonb, uuid),
  public.set_client_blocked(uuid, boolean),
  public.delete_stylist_client(uuid)
  from public, anon, authenticated;

grant execute on function
  public.get_studio_clients(uuid),
  public.save_stylist_client(uuid, jsonb, uuid),
  public.set_client_blocked(uuid, boolean),
  public.delete_stylist_client(uuid)
  to authenticated;
