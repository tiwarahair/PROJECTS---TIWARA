-- Allergies or sensitivities a signed-in client shares with each stylist they've booked: set when they book (the
-- booking's opt-in is the consent), edited or removed in their account. Stylists see them on linked client records.
create table public.client_sensitivities (
  client_id uuid not null references public.profiles (id) on delete cascade,
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  text text not null check (length(trim(text)) between 1 and 1000),
  consent_wording text not null,
  consented_at timestamptz not null default now(),
  booking_id uuid references public.bookings (id) on delete set null,
  primary key (client_id, stylist_id)
);

alter table public.client_sensitivities enable row level security;

/** The exact consent the client sees: the tick they agree with (the booking's opt-in or the account's), then the
    allergy field's line. */
create function public.get_allergy_consent_wording(target_stylist uuid, is_booking boolean)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when is_booking then 'I have allergies or sensitivities to share with ' else 'I agree to share this with ' end
    || business_name || '. By sharing this, you agree to Tiwára''s House and ' || business_name
    || ' storing this health information to keep you safe.'
  from public.stylists where id = target_stylist
$$;

/** A signed-in client's booking going through saves what they shared with that stylist. A booking without a note
    leaves it alone: removing it at booking is checkout's job, as only the form knows the client cleared it. */
create function public.share_booking_allergies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.client_id is null or new.created_by <> 'client' or new.status not in ('awaiting_confirmation', 'confirmed')
    or (tg_op = 'UPDATE' and old.status <> 'held') then
    return new;
  end if;

  if nullif(trim(new.allergies), '') is null then
    return new;
  end if;

  insert into public.client_sensitivities (client_id, stylist_id, text, consent_wording, consented_at, booking_id)
  values (new.client_id, new.stylist_id, trim(new.allergies), public.get_allergy_consent_wording(new.stylist_id, true),
    coalesce(new.allergies_consented_at, now()), new.id)
  on conflict (client_id, stylist_id) do update
  set text = excluded.text, consent_wording = excluded.consent_wording, consented_at = excluded.consented_at,
    booking_id = excluded.booking_id;

  return new;
end;
$$;

create trigger bookings_share_allergies
  after insert or update of status on public.bookings
  for each row execute function public.share_booking_allergies();

/** Account → Shared with stylists: every stylist the client is linked to, with what they share, if anything. */
create function public.get_my_sensitivities()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'stylist_id', stylists.id, 'stylist_name', stylists.business_name, 'text', shared.text,
    'consented_at', shared.consented_at
  ) order by stylists.business_name), '[]')
  from public.stylist_clients as linked
  join public.stylists on stylists.id = linked.stylist_id
  left join public.client_sensitivities as shared
    on shared.client_id = linked.client_id and shared.stylist_id = linked.stylist_id
  where linked.client_id = (select auth.uid()) and linked.deleted_at is null
$$;

/** What the client shares with one stylist (by their booking-page slug), to fill the booking form. */
create function public.get_my_sensitivity(stylist_slug text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select shared.text from public.client_sensitivities as shared
  join public.stylists on stylists.id = shared.stylist_id
  where shared.client_id = (select auth.uid()) and stylists.slug = stylist_slug::extensions.citext
$$;

/** Saves (with the account's consent line) or, when empty, removes what the client shares with a stylist they're
    linked to. Their upcoming bookings with that stylist show the same. */
create function public.save_my_sensitivity(target_stylist uuid, sensitivity text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shared text := nullif(trim(sensitivity), '');
begin
  if not exists (
    select 1 from public.stylist_clients
    where client_id = auth.uid() and stylist_id = target_stylist and deleted_at is null
  ) then
    raise exception 'not_found';
  end if;

  if length(shared) > 1000 then
    raise exception 'too_long';
  end if;

  if shared is null then
    delete from public.client_sensitivities where client_id = auth.uid() and stylist_id = target_stylist;
  else
    insert into public.client_sensitivities (client_id, stylist_id, text, consent_wording)
    values (auth.uid(), target_stylist, shared, public.get_allergy_consent_wording(target_stylist, false))
    on conflict (client_id, stylist_id) do update
    set text = excluded.text, consent_wording = excluded.consent_wording, consented_at = now(), booking_id = null;
  end if;

  update public.bookings
  set allergies = shared, allergies_consented_at = case when shared is null then null else now() end
  where client_id = auth.uid() and stylist_id = target_stylist and starts_at > now()
    and status in ('awaiting_confirmation', 'confirmed');
end;
$$;

-- linked clients show what they share now; clients only ever seen as guests keep their latest booking's note
create or replace function public.get_studio_clients(target_stylist uuid)
returns table(id uuid, first text, last text, phone text, email text, photo_path text, hair_notes text, blocked boolean, created_at timestamp with time zone, visits integer, last_visit timestamp with time zone, upcoming integer, no_shows integer, late_cancels integer, paid_pence integer, booking_paid_pence integer, fee_paid_pence integer, refund_pence integer, last_payment_at timestamp with time zone, allergies text, allergies_at timestamp with time zone, allergies_by text)
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
    select shared.text as allergies, shared.consented_at as allergies_consented_at, profiles.first_name as first
    from public.client_sensitivities as shared
    join public.profiles on profiles.id = shared.client_id
    where shared.client_id = clients.client_id and shared.stylist_id = clients.stylist_id
    union all
    select latest.allergies, latest.allergies_consented_at, latest.contact ->> 'first'
    from public.bookings as latest
    where clients.client_id is null and latest.stylist_client_id = clients.id and latest.allergies is not null
    order by allergies_consented_at desc nulls last
    limit 1
  ) as allergy on true
  where clients.stylist_id = target_stylist and clients.deleted_at is null and public.is_stylist_owner(target_stylist)
  group by clients.id, allergy.allergies, allergy.allergies_consented_at, allergy.first
$$;

-- the download includes what the client shares with stylists
create or replace function public.get_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'account', jsonb_build_object(
      'email', users.email,
      'created_at', users.created_at,
      'email_confirmed_at', users.email_confirmed_at,
      'last_sign_in_at', users.last_sign_in_at,
      'sign_in_methods', coalesce((
        select jsonb_agg(jsonb_build_object(
          'provider', provider, 'email', identities.email, 'created_at', created_at, 'last_sign_in_at', last_sign_in_at
        ) order by created_at)
        from auth.identities where user_id = users.id
      ), '[]')
    ),
    'profile', (
      select jsonb_build_object(
        'first_name', first_name, 'last_name', last_name, 'phone', phone, 'marketing_emails', marketing_opt_in,
        'login_alerts', login_alerts, 'terms_version', client_terms_version,
        'terms_accepted_at', client_terms_accepted_at, 'created_at', created_at, 'has_photo', photo_path is not null
      )
      from public.profiles where id = users.id
    ),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'created_at', created_at, 'refreshed_at', refreshed_at, 'user_agent', user_agent, 'ip', host(ip)
      ) order by created_at)
      from auth.sessions where user_id = users.id
    ), '[]'),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('device', device, 'last_seen_at', last_seen_at) order by last_seen_at)
      from public.login_devices where user_id = users.id
    ), '[]'),
    'addresses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', label, 'line1', line1, 'line2', line2, 'town', town, 'postcode', postcode, 'is_default', is_default,
        'created_at', created_at
      ) order by created_at)
      from public.client_addresses where client_id = users.id
    ), '[]'),
    'favourites', coalesce((
      select jsonb_agg(jsonb_build_object('stylist', stylists.business_name, 'saved_at', favourites.created_at)
        order by favourites.created_at)
      from public.favourites join public.stylists on stylists.id = favourites.stylist_id
      where favourites.client_id = users.id
    ), '[]'),
    'shared_with_stylists', coalesce((
      select jsonb_agg(jsonb_build_object(
        'stylist', stylists.business_name, 'text', shared.text, 'consent', shared.consent_wording,
        'consented_at', shared.consented_at
      ) order by shared.consented_at)
      from public.client_sensitivities as shared join public.stylists on stylists.id = shared.stylist_id
      where shared.client_id = users.id
    ), '[]'),
    'bookings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ref', bookings.ref,
        'stylist', stylists.business_name,
        'service', bookings.snapshot,
        'status', bookings.status,
        'starts_at', bookings.starts_at,
        'ends_at', bookings.ends_at,
        'booked_at', bookings.created_at,
        'contact', bookings.contact,
        'notes', bookings.notes,
        'allergies', bookings.allergies,
        'allergies_shared_at', bookings.allergies_consented_at,
        'address', bookings.address,
        'price_pence', coalesce(bookings.final_price_pence, bookings.price_pence),
        'booking_fee_pence', bookings.fee_pence,
        'tip_pence', bookings.tip_pence,
        'terms', bookings.terms,
        'policy_accepted_at', bookings.policy_accepted_at,
        'cancelled_at', bookings.cancelled_at,
        'cancelled_by', bookings.cancelled_by,
        'cancel_reason', bookings.cancel_reason,
        'payments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kind', kind, 'method', method, 'amount_pence', amount_pence, 'paid_at', created_at
          ) order by created_at)
          from public.payments where booking_id = bookings.id
        ), '[]'),
        'refunds', coalesce((
          select jsonb_agg(jsonb_build_object(
            'amount_pence', amount_pence, 'reason', reason, 'refunded_at', created_at
          ) order by created_at)
          from public.refunds where booking_id = bookings.id
        ), '[]'),
        'fees', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kind', kind, 'amount_pence', amount_pence, 'refund_pence', refund_pence, 'charge_pence', charge_pence,
            'status', status, 'card', card_label, 'paid_at', paid_at, 'waived_at', waived_at, 'created_at', created_at
          ) order by created_at)
          from public.booking_fees where booking_id = bookings.id
        ), '[]')
      ) order by bookings.starts_at)
      from public.bookings join public.stylists on stylists.id = bookings.stylist_id
      where bookings.id in (select public.client_booking_ids(users.id)) and bookings.status not in ('held', 'expired')
    ), '[]'),
    'emails_and_texts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'channel', channel, 'template', template, 'status', status, 'created_at', created_at, 'sent_at', sent_at
      ) order by created_at)
      from public.notifications
      where notifications.user_id = users.id or lower(notifications.to_address) = lower(users.email)
    ), '[]')
  )
  from auth.users where users.id = (select auth.uid())
$$;

revoke execute on function
  public.get_allergy_consent_wording(uuid, boolean),
  public.share_booking_allergies(),
  public.get_my_sensitivities(),
  public.get_my_sensitivity(text),
  public.save_my_sensitivity(uuid, text)
  from public, anon, authenticated;
grant execute on function
  public.get_my_sensitivities(), public.get_my_sensitivity(text), public.save_my_sensitivity(uuid, text)
  to authenticated;
