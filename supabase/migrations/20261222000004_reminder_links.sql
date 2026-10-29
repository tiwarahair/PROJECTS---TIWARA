-- a reminder's link works alongside the one first emailed; a stylist's resend still makes both stop working
alter table public.payment_links add column reminder_token_hash bytea unique;

create function public.find_payment_link(token text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.payment_links
  where token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8'))
    or reminder_token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8'))
$$;

create function public.drop_reminder_token()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reminder_token_hash is not distinct from old.reminder_token_hash then
    new.reminder_token_hash := null;
  end if;

  return new;
end;
$$;

create trigger payment_links_drop_reminder_token before update of token_hash on public.payment_links
for each row when (new.token_hash is distinct from old.token_hash) execute function public.drop_reminder_token();

-- the pay page knows a balance from a fee
create or replace function public.get_payment_link(token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_booking_details(link.booking_id) - 'client_phone' - 'notes' - 'address_notes' || jsonb_build_object(
    'status', case when link.status = 'pending' and link.expires_at <= now() then 'expired' else link.status end,
    'amount_pence', link.amount_pence,
    'kind', coalesce(fee.kind, 'balance'),
    'fee_pence', coalesce(fee.amount_pence, link.amount_pence),
    'expires_at', link.expires_at,
    'stylist_slug', stylists.slug
  )
  from public.payment_links as link
  left join public.booking_fees as fee on fee.id = link.fee_id
  join public.bookings on bookings.id = link.booking_id
  join public.stylists on stylists.id = bookings.stylist_id
  where link.id = public.find_payment_link(token)
$$;

create or replace function public.start_link_payment(token text)
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
  select * into link from public.payment_links where id = public.find_payment_link(token) for update;

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
    'purpose', link.purpose,
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

-- the same email as the link's own, with a second link that keeps the expiry; it isn't one of the stylist's resends
create or replace function public.remind_expiring_links()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.payment_links;
  token text;
  booking public.bookings;
  fee public.booking_fees;
  reminded integer := 0;
begin
  for link in
    select * from public.payment_links
    where status = 'pending' and reminded_at is null and expires_at > now() and expires_at <= now() + interval '2 days'
    for update skip locked
  loop
    token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');

    update public.payment_links set reminder_token_hash = sha256(convert_to(token, 'UTF8')), reminded_at = now()
    where id = link.id;

    select * into booking from public.bookings where id = link.booking_id;

    if link.purpose = 'fee' then
      select * into fee from public.booking_fees where id = link.fee_id;

      perform public.queue_email(
        booking.contact ->> 'email',
        'fee_declined',
        public.get_booking_details(booking.id) || jsonb_build_object(
          'kind', fee.kind,
          'fee_pence', fee.amount_pence,
          'amount_pence', link.amount_pence,
          'card_label', fee.card_label,
          'expires_at', link.expires_at,
          'pay_url', booking.site || '/pay?token=' || token,
          'is_reminder', true
        ),
        booking.client_id
      );
    else
      perform public.queue_email(
        booking.contact ->> 'email', 'balance_due',
        public.get_receipt_details(booking.id) || jsonb_build_object(
          'amount_pence', link.amount_pence,
          'expires_at', link.expires_at,
          'pay_url', booking.site || '/pay?token=' || token,
          'is_reminder', true
        ),
        booking.client_id
      );
    end if;

    reminded := reminded + 1;
  end loop;

  return reminded;
end;
$$;

revoke execute on function public.find_payment_link(text) from public, anon, authenticated;
