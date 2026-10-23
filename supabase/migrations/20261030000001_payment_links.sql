-- Payment links for fees the card declined, disputes, refunds made in Stripe, fees waiting to reach the stylist,
-- and no new booking with a stylist while a fee to them is unpaid.
create table public.payment_links (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  fee_id uuid not null references public.booking_fees (id) on delete cascade,
  amount_pence integer not null check (amount_pence > 0),
  token_hash bytea not null unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'cancelled')),
  -- the first email and up to two resends
  sent_count smallint not null default 1 check (sent_count between 1 and 3),
  expires_at timestamptz not null,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index payment_links_one_pending_idx on public.payment_links (fee_id) where status = 'pending';
create index payment_links_booking_id_idx on public.payment_links (booking_id);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete set null,
  stripe_dispute_id text not null unique,
  stripe_payment_intent_id text,
  amount_pence integer not null,
  reason text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index disputes_booking_id_idx on public.disputes (booking_id);

alter table public.payments add column stripe_transfer_id text;

alter table public.payment_links enable row level security;
alter table public.disputes enable row level security;

create policy "Owners read their bookings' payment links" on public.payment_links
  for select to authenticated using (
    exists (select 1 from public.bookings where bookings.id = booking_id and public.is_stylist_owner(bookings.stylist_id))
  );
create policy "Owners read their bookings' disputes" on public.disputes
  for select to authenticated using (
    exists (select 1 from public.bookings where bookings.id = booking_id and public.is_stylist_owner(bookings.stylist_id))
  );

grant select on public.payment_links, public.disputes to authenticated;

/** A new link token for a fee's pending link (the old one stops working), emailed to the client. */
create function public.send_fee_link(fee public.booking_fees, link_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
  booking public.bookings;
  link public.payment_links;
begin
  update public.payment_links
  set token_hash = sha256(convert_to(token, 'UTF8')), expires_at = now() + interval '7 days'
  where id = link_id
  returning * into link;

  select * into booking from public.bookings where id = fee.booking_id;

  perform public.queue_email(
    booking.contact ->> 'email',
    'fee_declined',
    public.get_booking_details(booking.id) || jsonb_build_object(
      'kind', fee.kind,
      'fee_pence', fee.amount_pence,
      'amount_pence', link.amount_pence,
      'card_label', fee.card_label,
      'expires_at', link.expires_at,
      'pay_url', booking.site || '/pay?token=' || token
    ),
    booking.client_id
  );
end;
$$;

-- The first time a fee can't be charged, the client gets a link to pay it and the stylist is told; a waived,
-- recorded or paid fee cancels its link.
create function public.on_fee_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  link_id uuid;
  booking public.bookings;
  stylist public.stylists;
  owner_email text;
  preference public.notification_preferences;
  details jsonb;
begin
  if new.status = 'unpaid' and new.charge_pence > 0
    and not exists (select 1 from public.payment_links where fee_id = new.id) then
    insert into public.payment_links (booking_id, fee_id, amount_pence, token_hash, expires_at)
    values (new.booking_id, new.id, new.charge_pence, extensions.gen_random_bytes(32), now() + interval '7 days')
    returning id into link_id;

    perform public.send_fee_link(new, link_id);

    select * into booking from public.bookings where id = new.booking_id;
    select * into stylist from public.stylists where id = booking.stylist_id;
    select email into owner_email from auth.users where id = stylist.owner_id;
    select * into preference from public.notification_preferences where stylist_id = stylist.id and event = 'fee_failed';

    details := public.get_booking_details(booking.id) || jsonb_build_object(
      'kind', new.kind, 'amount_pence', new.charge_pence, 'card_label', new.card_label,
      'studio_url', booking.site || '/studio'
    );

    -- the stylist's "Fee failed" setting in Studio → Settings → Notifications
    if owner_email is not null and coalesce(preference.email, true) then
      perform public.queue_email(owner_email, 'fee_failed', details, stylist.owner_id);
    end if;

    if stylist.contact_phone is not null and coalesce(preference.sms, false) then
      perform public.queue_sms(stylist.contact_phone, 'fee_failed', details, stylist.owner_id);
    end if;
  end if;

  if new.status in ('paid', 'paid_offline', 'waived', 'void') or new.waived_at is not null then
    update public.payment_links set status = 'cancelled' where fee_id = new.id and status = 'pending';
  end if;

  return new;
end;
$$;

create trigger booking_fees_status_change
  after update of status, waived_at on public.booking_fees
  for each row execute function public.on_fee_status_change();

/** Studio's "Resend link": a fresh link by email, at most twice after the first. */
create function public.resend_payment_link(target_booking uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fee public.booking_fees := public.lock_own_fee(target_booking);
  link public.payment_links;
begin
  select * into link from public.payment_links where fee_id = fee.id and status = 'pending' for update;

  if link.id is null then
    -- an expired link is replaced by a new one
    select * into link from public.payment_links where fee_id = fee.id and status = 'expired'
    order by created_at desc limit 1 for update;

    if link.id is null or fee.status <> 'unpaid' then
      raise exception 'resend_not_allowed';
    end if;

    update public.payment_links set status = 'pending' where id = link.id;
  end if;

  if link.sent_count >= 3 then
    raise exception 'resend_not_allowed';
  end if;

  update public.payment_links set sent_count = sent_count + 1 where id = link.id;

  perform public.send_fee_link(fee, link.id);
end;
$$;

-- What the pay page shows for a link (null when the token is unknown).
create function public.get_payment_link(token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_booking_details(link.booking_id) - 'client_phone' - 'notes' - 'address_notes' || jsonb_build_object(
    'status', case when link.status = 'pending' and link.expires_at <= now() then 'expired' else link.status end,
    'amount_pence', link.amount_pence,
    'kind', fee.kind,
    'fee_pence', fee.amount_pence,
    'expires_at', link.expires_at,
    'stylist_slug', stylists.slug
  )
  from public.payment_links as link
  join public.booking_fees as fee on fee.id = link.fee_id
  join public.bookings on bookings.id = link.booking_id
  join public.stylists on stylists.id = bookings.stylist_id
  where link.token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8'))
$$;

-- Everything a payment for a pending link needs; raises link_not_valid, link_paid or link_expired.
create function public.start_link_payment(token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.payment_links;
  booking public.bookings;
  stylist public.stylists;
begin
  select * into link from public.payment_links
  where token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8'))
  for update;

  if link.id is null or link.status = 'cancelled' then
    raise exception 'link_not_valid';
  end if;

  if link.status = 'paid' then
    raise exception 'link_paid';
  end if;

  if link.status = 'expired' or link.expires_at <= now() then
    raise exception 'link_expired';
  end if;

  select * into booking from public.bookings where id = link.booking_id;
  select * into stylist from public.stylists where id = booking.stylist_id;

  return jsonb_build_object(
    'link_id', link.id,
    'booking_id', booking.id,
    'booking_ref', booking.ref,
    'amount_pence', link.amount_pence,
    'customer_id', booking.stripe_customer_id,
    'payment_intent_id', link.stripe_payment_intent_id,
    'stylist_account', stylist.stripe_account_id,
    'stylist_can_receive', stylist.charges_enabled
  );
end;
$$;

create function public.set_link_intent(link uuid, intent text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payment_links set stripe_payment_intent_id = intent where id = link and stripe_payment_intent_id is null
$$;

-- A link payment went through: the fee is paid. Returns 'refund' when the fee was settled some other way meanwhile.
create function public.confirm_link_payment(intent text, transfer_pending boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.payment_links;
  fee public.booking_fees;
begin
  select * into link from public.payment_links where stripe_payment_intent_id = intent for update;

  if link.id is null then
    raise exception 'link_not_found';
  end if;

  if link.status = 'paid' then
    return 'duplicate';
  end if;

  select * into fee from public.booking_fees where id = link.fee_id for update;

  if fee.status <> 'unpaid' then
    update public.payment_links set status = 'cancelled' where id = link.id;

    return 'refund';
  end if;

  update public.payment_links set status = 'paid', paid_at = now() where id = link.id;
  update public.booking_fees set status = 'paid', paid_at = now() where id = fee.id;

  insert into public.payments (booking_id, kind, amount_pence, fee_id, stripe_payment_intent_id, transfer_pending)
  values (link.booking_id, 'fee', link.amount_pence, fee.id, intent, confirm_link_payment.transfer_pending)
  on conflict (stripe_payment_intent_id) do nothing;

  insert into public.booking_events (booking_id, kind, data)
  values (link.booking_id, 'fee_paid_by_link', jsonb_build_object('fee_id', fee.id, 'payment_intent', intent));

  return 'paid';
end;
$$;

create function public.expire_payment_links()
returns void
language sql
set search_path = ''
as $$
  update public.payment_links set status = 'expired' where status = 'pending' and expires_at <= now()
$$;

select cron.schedule('expire-payment-links', '15 * * * *', 'select public.expire_payment_links()');

/** Does this client owe the stylist an unpaid fee (matched by account, email or phone)? */
create function public.has_unpaid_fee(target_stylist uuid, contact jsonb, client uuid)
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
        or lower(bookings.contact ->> 'email') = lower(nullif(has_unpaid_fee.contact ->> 'email', ''))
        or (
          length(regexp_replace(coalesce(has_unpaid_fee.contact ->> 'phone', ''), '\D', '', 'g')) >= 10
          and regexp_replace(bookings.contact ->> 'phone', '\D', '', 'g')
            = regexp_replace(has_unpaid_fee.contact ->> 'phone', '\D', '', 'g')
        )
      )
  )
$$;

create or replace function public.checkout_booking(
  target uuid, secret text, contact jsonb, notes text, address jsonb, client_lat double precision,
  client_lng double precision, client uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  held public.bookings;
  stylist public.stylists;
  policy public.payment_policies;
  point extensions.geography;
  deposit integer := 0;
  due integer;
begin
  select * into held from public.bookings
  where id = target
    and hold_secret_hash = sha256(convert_to(coalesce(secret, ''), 'UTF8'))
    and status = 'held' and hold_expires_at > now()
  for update;

  if held.id is null then
    -- paid already (a reload while the payment was confirming): say so rather than "not held"
    if exists (
      select 1 from public.bookings
      where id = target and status = 'confirmed'
        and hold_secret_hash = sha256(convert_to(coalesce(secret, ''), 'UTF8'))
    ) then
      raise exception 'already_paid';
    end if;

    raise exception 'hold_not_found';
  end if;

  select * into stylist from public.stylists where id = held.stylist_id;

  if public.has_unpaid_fee(stylist.id, checkout_booking.contact, client) then
    raise exception 'unpaid_fee';
  end if;

  if stylist.business_type = 'mobile' then
    if client_lat is null or client_lng is null or address is null then
      raise exception 'address_required';
    end if;

    point := extensions.st_setsrid(extensions.st_makepoint(client_lng, client_lat), 4326)::extensions.geography;

    if not extensions.st_dwithin(stylist.location, point, stylist.travel_radius_miles * 1609.344) then
      raise exception 'outside_area';
    end if;
  end if;

  select * into policy from public.payment_policies
  where stylist_id = stylist.id
  order by created_at desc
  limit 1;

  if policy.mode = 'deposit' then
    deposit := round(held.price_pence * policy.deposit_percent / 100.0);
  end if;

  due := case policy.mode
    when 'deposit' then deposit + held.fee_pence
    when 'full' then held.price_pence + held.fee_pence
    else held.fee_pence
  end;

  update public.bookings
  set contact = checkout_booking.contact,
    notes = nullif(checkout_booking.notes, ''),
    address = case when stylist.business_type = 'mobile' then checkout_booking.address end,
    location = coalesce(point, bookings.location),
    client_id = coalesce(client, bookings.client_id),
    policy_id = policy.id,
    terms = to_jsonb(policy) - 'id' - 'stylist_id' - 'created_at' || jsonb_build_object(
      'deposit_pence', deposit,
      'free_cancel_until', held.starts_at - make_interval(secs => policy.free_window_hours * 3600)
    ),
    due_today_pence = due
  where id = held.id
  returning * into held;

  return jsonb_build_object(
    'id', held.id,
    'ref', held.ref,
    'mode', policy.mode,
    'price_pence', held.price_pence,
    'fee_pence', held.fee_pence,
    'due_today_pence', due,
    'service_name', held.snapshot ->> 'service_name',
    'starts_at', held.starts_at,
    'stylist_account', stylist.stripe_account_id,
    'stylist_name', stylist.business_name,
    'customer_id', held.stripe_customer_id,
    'payment_intent_id', held.stripe_payment_intent_id
  );
end;
$$;

/** Frees the slot a client was holding when checkout turned them away (an unpaid fee). */
create function public.release_hold(target uuid, secret text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bookings set status = 'expired', hold_expires_at = now()
  where id = target and status = 'held' and hold_secret_hash = sha256(convert_to(coalesce(secret, ''), 'UTF8'))
$$;

-- A refund made in the Stripe dashboard, recorded once by its Stripe id (ours are recorded where they're made).
create function public.record_stripe_refund(intent text, refund_id text, amount integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.refunds (booking_id, amount_pence, reason, stripe_refund_id)
  select payments.booking_id, amount, 'manual', refund_id
  from public.payments
  where payments.stripe_payment_intent_id = intent and amount > 0
  on conflict (stripe_refund_id) do nothing
$$;

/** A dispute opened or changed; the stylist hears about a new one. */
create function public.record_dispute(dispute jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  disputed_booking uuid := (
    select payments.booking_id from public.payments
    where payments.stripe_payment_intent_id = dispute ->> 'payment_intent'
  );
  is_new boolean := not exists (select 1 from public.disputes where stripe_dispute_id = dispute ->> 'id');
  booking public.bookings;
  stylist public.stylists;
  owner_email text;
begin
  insert into public.disputes (booking_id, stripe_dispute_id, stripe_payment_intent_id, amount_pence, reason, status)
  values (
    disputed_booking, dispute ->> 'id', dispute ->> 'payment_intent', (dispute ->> 'amount')::integer,
    dispute ->> 'reason', dispute ->> 'status'
  )
  on conflict (stripe_dispute_id) do update set status = excluded.status, updated_at = now();

  if not is_new or disputed_booking is null then
    return;
  end if;

  select * into booking from public.bookings where id = disputed_booking;
  select * into stylist from public.stylists where id = booking.stylist_id;
  select email into owner_email from auth.users where id = stylist.owner_id;

  if owner_email is not null then
    perform public.queue_email(
      owner_email,
      'dispute_opened',
      public.get_booking_details(booking.id)
        || jsonb_build_object('amount_pence', (dispute ->> 'amount')::integer, 'reason', dispute ->> 'reason'),
      stylist.owner_id
    );
  end if;
end;
$$;

-- Fee charges made while the stylist's account couldn't receive money, now that it can.
create function public.claim_pending_transfers(batch_size integer)
returns table (payment_id uuid, payment_intent_id text, amount_pence integer, stylist_account text)
language sql
security definer
set search_path = ''
as $$
  select payments.id, payments.stripe_payment_intent_id, payments.amount_pence, stylists.stripe_account_id
  from public.payments
  join public.bookings on bookings.id = payments.booking_id
  join public.stylists on stylists.id = bookings.stylist_id
  where payments.transfer_pending and payments.stripe_payment_intent_id is not null
    and stylists.charges_enabled and stylists.stripe_account_id is not null
  order by payments.created_at
  limit batch_size
$$;

create function public.mark_transfer_sent(payment uuid, transfer text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments set transfer_pending = false, stripe_transfer_id = transfer where id = payment
$$;

-- every hour while any fee is waiting for an account that can now receive it
select cron.schedule(
  'send-transfers',
  '30 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/send-transfers',
    headers := jsonb_build_object(
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
    and exists (
      select 1 from public.payments
      join public.bookings on bookings.id = payments.booking_id
      join public.stylists on stylists.id = bookings.stylist_id
      where payments.transfer_pending and stylists.charges_enabled
    )
  $$
);

-- Card payments on a booking a refund can come from (fee charges first, then the booking's own payment).
create function public.get_refund_sources(target_booking uuid, owner uuid)
returns table (payment_intent_id text, amount_pence integer)
language sql
stable
security definer
set search_path = ''
as $$
  select payments.stripe_payment_intent_id, payments.amount_pence
  from public.payments
  join public.bookings on bookings.id = payments.booking_id
  join public.stylists on stylists.id = bookings.stylist_id
  where payments.booking_id = target_booking and stylists.owner_id = owner
    and payments.method = 'card' and payments.stripe_payment_intent_id is not null
  order by payments.kind = 'booking', payments.created_at desc
$$;

revoke execute on function
  public.send_fee_link(public.booking_fees, uuid),
  public.on_fee_status_change(),
  public.resend_payment_link(uuid),
  public.get_payment_link(text),
  public.start_link_payment(text),
  public.set_link_intent(uuid, text),
  public.confirm_link_payment(text, boolean),
  public.expire_payment_links(),
  public.has_unpaid_fee(uuid, jsonb, uuid),
  public.release_hold(uuid, text),
  public.record_stripe_refund(text, text, integer),
  public.record_dispute(jsonb),
  public.claim_pending_transfers(integer),
  public.mark_transfer_sent(uuid, text),
  public.get_refund_sources(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.resend_payment_link(uuid) to authenticated;

grant execute on function
  public.release_hold(uuid, text),
  public.get_payment_link(text),
  public.start_link_payment(text),
  public.set_link_intent(uuid, text),
  public.confirm_link_payment(text, boolean),
  public.record_stripe_refund(text, text, integer),
  public.record_dispute(jsonb),
  public.claim_pending_transfers(integer),
  public.mark_transfer_sent(uuid, text),
  public.get_refund_sources(uuid, uuid)
  to service_role;

-- once an email is sent or has finally failed, its links and codes aren't kept (now including pay links)
create or replace function public.scrub_sent_notification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.payload := new.payload - array['manage_url', 'save_details_url', 'secure_url', 'pay_url', 'code'];

  return new;
end;
$$;
