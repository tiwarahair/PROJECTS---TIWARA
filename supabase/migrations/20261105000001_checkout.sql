-- Checkout in Studio: the final price, the balance (saved card, payment link or recorded), tips, receipts, and the card fee the stylist pays on every card payment they receive.

/** stripe's fee on a UK card payment (1.5% + 20p), paid by the stylist on their part of a card payment. */
create function public.get_card_fee_pence(amount integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when amount > 0 then round(amount * 0.015)::integer + 20 else 0 end
$$;

alter table public.payments drop constraint payments_kind_check;
alter table public.payments add constraint payments_kind_check check (kind in ('booking', 'fee', 'balance'));
alter table public.payments drop constraint payments_method_check;
alter table public.payments add constraint payments_method_check check (method in ('card', 'cash', 'bank', 'reader', 'other'));
alter table public.payments add column tip_pence integer not null default 0 check (tip_pence >= 0);
alter table public.payments add column card_fee_pence integer generated always as (
  case when method = 'card' then public.get_card_fee_pence(amount_pence - platform_fee_pence) else 0 end
) stored;
alter table public.payments add column corrected_at timestamptz;

alter table public.refunds drop constraint refunds_reason_check;
alter table public.refunds add constraint refunds_reason_check
  check (reason in ('client_cancel', 'stylist_cancel', 'fee_settled', 'fee_waived', 'manual', 'price_lowered'));

alter table public.bookings
  add column final_price_pence integer check (final_price_pence >= 0),
  add column tip_pence integer not null default 0 check (tip_pence >= 0),
  add column checkout jsonb,
  add column checkout_tries smallint not null default 0,
  -- a card charge under way; another checkout waits until it's finished or two minutes have passed
  add column checkout_started_at timestamptz,
  add column card_label text,
  -- completed with the balance still to collect and no link out: back in Studio's "Due for checkout"
  add column unpaid_at timestamptz;

alter table public.payment_links alter column fee_id drop not null;
alter table public.payment_links add column purpose text not null default 'fee' check (purpose in ('fee', 'balance'));
alter table public.payment_links add constraint payment_links_purpose_fee_check check ((purpose = 'fee') = (fee_id is not null));
create unique index payment_links_one_balance_idx on public.payment_links (booking_id)
  where purpose = 'balance' and status = 'pending';

/** What the client has paid towards the price: online at booking and at checkout, less a lower final price's refund. */
create function public.get_paid_pence(target uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    coalesce((
      select sum(case when kind = 'booking' then amount_pence - platform_fee_pence else amount_pence - tip_pence end)
      from public.payments where booking_id = target and kind in ('booking', 'balance')
    ), 0)
    - coalesce((select sum(amount_pence) from public.refunds where booking_id = target and reason = 'price_lowered'), 0),
    0
  )::integer
$$;

create function public.get_balance_due(booking public.bookings)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(coalesce(booking.final_price_pence, booking.price_pence) - public.get_paid_pence(booking.id), 0)
$$;

-- the receipt's lines, payments and refund, for the receipt emails
create function public.get_receipt_details(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_booking_details(bookings.id) || jsonb_build_object(
    'lines', bookings.checkout -> 'lines',
    'final_pence', coalesce(bookings.final_price_pence, bookings.price_pence),
    'tip_pence', bookings.tip_pence,
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', kind, 'method', method, 'amount_pence', amount_pence - platform_fee_pence, 'tip_pence', tip_pence,
        'paid_at', created_at
      ) order by created_at)
      from public.payments where booking_id = bookings.id and kind in ('booking', 'balance')
    ), '[]'),
    'refunded_pence', coalesce((
      select sum(amount_pence) from public.refunds where booking_id = bookings.id and reason = 'price_lowered'
    ), 0)
  )
  from public.bookings
  where bookings.id = target
$$;

create function public.queue_receipt(target uuid, corrected boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  select public.queue_email(
    bookings.contact ->> 'email', 'checkout_receipt',
    public.get_receipt_details(bookings.id) || jsonb_build_object('corrected', corrected),
    bookings.client_id
  )
  from public.bookings
  where bookings.id = target
$$;

/** A new link token for a booking's balance link (the old one stops working), emailed to the client. */
create function public.send_balance_link(target uuid, link_id uuid)
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

  select * into booking from public.bookings where id = target;

  perform public.queue_email(
    booking.contact ->> 'email', 'balance_due',
    public.get_receipt_details(booking.id) || jsonb_build_object(
      'amount_pence', link.amount_pence,
      'expires_at', link.expires_at,
      'pay_url', booking.site || '/pay?token=' || token
    ),
    booking.client_id
  );
end;
$$;

/**
 * Checks a checkout and works out its money, for studio-checkout before it charges anything. The card is only for
 * up to the agreed balance and a tip of at most a quarter of the final price; links have no tip.
 */
create function public.claim_checkout(target uuid, owner uuid, input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  stylist public.stylists;
  line jsonb;
  method text := input ->> 'method';
  tip integer := coalesce((input ->> 'tip_pence')::integer, 0);
  final integer := 0;
  paid integer;
  due integer;
begin
  select bookings.* into booking from public.bookings
  join public.stylists on stylists.id = bookings.stylist_id
  where bookings.id = target and stylists.owner_id = owner
  for update of bookings;

  if booking.id is null then
    raise exception 'not_found';
  end if;

  if booking.status = 'completed' and booking.unpaid_at is null then
    raise exception 'already_completed';
  end if;

  if booking.status not in ('confirmed', 'arrived', 'completed') or booking.starts_at > now() then
    raise exception 'checkout_not_allowed';
  end if;

  if jsonb_typeof(input -> 'lines') <> 'array' or jsonb_array_length(input -> 'lines') not between 1 and 30 then
    raise exception 'invalid_lines';
  end if;

  for line in select * from jsonb_array_elements(input -> 'lines') loop
    if coalesce((line ->> 'base_pence')::integer, -1) < 0
      or (line ->> 'base_pence')::integer + coalesce((line ->> 'adjustment_pence')::integer, 0) < 0
      or char_length(coalesce(line ->> 'name', '')) not between 1 and 120 then
      raise exception 'invalid_lines';
    end if;

    if coalesce((line ->> 'adjustment_pence')::integer, 0) <> 0 and nullif(trim(line ->> 'reason'), '') is null then
      raise exception 'reason_required';
    end if;

    final := final + (line ->> 'base_pence')::integer + coalesce((line ->> 'adjustment_pence')::integer, 0);
  end loop;

  paid := public.get_paid_pence(booking.id);
  due := greatest(final - paid, 0);

  if tip < 0 then
    raise exception 'invalid_lines';
  end if;

  if method = 'none' and (due > 0 or tip > 0)
    or method in ('card', 'record') and due + tip = 0
    or method = 'link' and due = 0
    or method = 'card' and booking.stripe_payment_method_id is null
    or method = 'record' and coalesce(input ->> 'via', '') not in ('cash', 'bank', 'reader')
    or method not in ('none', 'card', 'record', 'link') then
    raise exception 'method_not_allowed';
  end if;

  if method = 'card' and final > booking.price_pence then
    raise exception 'card_over_agreed';
  end if;

  if method = 'card' and tip > round(final * 0.25) then
    raise exception 'tip_too_high';
  end if;

  if method = 'link' and tip > 0 then
    raise exception 'tip_not_allowed';
  end if;

  if method = 'link' and nullif(booking.contact ->> 'email', '') is null then
    raise exception 'no_contact_email';
  end if;

  if method = 'card' and booking.checkout_started_at > now() - interval '2 minutes' then
    raise exception 'checkout_in_progress';
  end if;

  if method = 'card' then
    update public.bookings set checkout_started_at = now() where id = booking.id;
  end if;

  select * into stylist from public.stylists where id = booking.stylist_id;

  return jsonb_build_object(
    'id', booking.id,
    'ref', booking.ref,
    'service_name', booking.snapshot ->> 'service_name',
    'final_pence', final,
    'paid_pence', paid,
    'due_pence', due,
    'tip_pence', tip,
    'charge_pence', case when method in ('card', 'record') then due + tip else 0 end,
    'refund_pence', greatest(paid - final, 0),
    'customer_id', booking.stripe_customer_id,
    'payment_method_id', booking.stripe_payment_method_id,
    'payment_intent_id', booking.stripe_payment_intent_id,
    'stylist_account', stylist.stripe_account_id,
    'stylist_can_receive', stylist.charges_enabled,
    'tries', booking.checkout_tries
  );
end;
$$;

/** Completes a checkout studio-checkout has charged (or that took no card), recording what was paid and refunded. */
create function public.finish_checkout(target uuid, result jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  method text := result ->> 'method';
  charge integer := coalesce((result ->> 'charge_pence')::integer, 0);
  tip integer := coalesce((result ->> 'tip_pence')::integer, 0);
  refund integer := coalesce((result ->> 'refund_pence')::integer, 0);
  link_id uuid;
begin
  select * into booking from public.bookings where id = target for update;

  if booking.status = 'completed' and booking.unpaid_at is null then
    return 'duplicate';
  end if;

  update public.bookings
  set status = 'completed', completed_at = coalesce(completed_at, now()), unpaid_at = null, checkout_started_at = null,
    final_price_pence = (result ->> 'final_pence')::integer, tip_pence = tip,
    checkout = jsonb_build_object(
      'lines', result -> 'lines', 'method', method, 'via', result ->> 'via', 'from_status', booking.status
    ),
    card_label = coalesce(result ->> 'card_label', card_label)
  where id = target
  returning * into booking;

  if method = 'card' then
    insert into public.payments (booking_id, kind, method, amount_pence, tip_pence, stripe_payment_intent_id,
      transfer_pending)
    values (target, 'balance', 'card', charge, tip, result ->> 'payment_intent_id',
      coalesce((result ->> 'transfer_pending')::boolean, false))
    on conflict (stripe_payment_intent_id) do nothing;
  elsif method = 'record' then
    insert into public.payments (booking_id, kind, method, amount_pence, tip_pence)
    values (target, 'balance', result ->> 'via', charge, tip);
  end if;

  if refund > 0 then
    insert into public.refunds (booking_id, amount_pence, reason, stripe_refund_id)
    values (target, refund, 'price_lowered', result ->> 'refund_id')
    on conflict (stripe_refund_id) do nothing;
  end if;

  if method = 'link' then
    insert into public.payment_links (booking_id, purpose, amount_pence, token_hash, expires_at)
    values (target, 'balance', public.get_balance_due(booking), extensions.gen_random_bytes(32),
      now() + interval '7 days')
    returning id into link_id;

    perform public.send_balance_link(target, link_id);
  else
    perform public.queue_receipt(target, false);
  end if;

  insert into public.booking_events (booking_id, kind, data) values (target, 'checked_out', result - 'lines');

  return 'completed';
end;
$$;

-- the card was declined: the next try is a new charge
create function public.note_checkout_declined(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bookings set checkout_tries = checkout_tries + 1, checkout_started_at = null where id = target
$$;

/** Takes back a checkout where no money moved through us (recorded, or nothing due), within ten minutes. */
create function public.undo_checkout(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
begin
  if booking.status <> 'completed' or booking.checkout ->> 'method' not in ('record', 'none')
    or booking.checkout ->> 'from_status' not in ('confirmed', 'arrived')
    or booking.completed_at < now() - interval '10 minutes'
    or exists (select 1 from public.refunds where booking_id = target and reason = 'price_lowered') then
    raise exception 'undo_not_allowed';
  end if;

  delete from public.payments where booking_id = target and kind = 'balance' and method <> 'card';

  -- a receipt that hasn't gone yet isn't sent
  delete from public.notifications
  where status = 'pending' and template = 'checkout_receipt' and payload ->> 'ref' = booking.ref;

  update public.bookings
  set status = booking.checkout ->> 'from_status', completed_at = null, final_price_pence = null, tip_pence = 0,
    checkout = null
  where id = target;

  insert into public.booking_events (booking_id, kind) values (target, 'checkout_undone');
end;
$$;

/** The balance of a completed booking paid in cash, by bank transfer or on the stylist's own card reader. */
create function public.record_balance_paid(target uuid, via text, tip integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  due integer := public.get_balance_due(booking);
begin
  if booking.status <> 'completed' or due = 0 then
    raise exception 'nothing_due';
  end if;

  if via not in ('cash', 'bank', 'reader') or coalesce(tip, 0) < 0 then
    raise exception 'method_not_allowed';
  end if;

  update public.payment_links set status = 'cancelled'
  where booking_id = target and purpose = 'balance' and status in ('pending', 'expired');

  insert into public.payments (booking_id, kind, method, amount_pence, tip_pence)
  values (target, 'balance', via, due + coalesce(tip, 0), coalesce(tip, 0));

  update public.bookings set tip_pence = tip_pence + coalesce(tip, 0), unpaid_at = null where id = target;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'balance_recorded', jsonb_build_object('via', via, 'amount_pence', due, 'tip_pence', tip));

  perform public.queue_receipt(target, false);
end;
$$;

/** Fixes a recorded payment (amount, method, tip) until the end of the month after it was taken. */
create function public.correct_recorded_payment(target uuid, amount integer, via text, tip integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment public.payments;
  booking public.bookings;
begin
  select * into payment from public.payments where id = target for update;

  if payment.id is null then
    raise exception 'not_found';
  end if;

  booking := public.lock_own_booking(payment.booking_id);

  if payment.kind <> 'balance' or payment.method = 'card'
    or date_trunc('month', payment.created_at at time zone 'Europe/London') + interval '2 months'
      <= now() at time zone 'Europe/London' then
    raise exception 'correction_not_allowed';
  end if;

  if amount <= 0 or coalesce(tip, 0) < 0 or tip > amount or via not in ('cash', 'bank', 'reader') then
    raise exception 'invalid_amount';
  end if;

  update public.payments
  set amount_pence = amount, method = via, tip_pence = coalesce(tip, 0), corrected_at = now()
  where id = target;

  update public.bookings set tip_pence = tip_pence - payment.tip_pence + coalesce(tip, 0) where id = booking.id
  returning * into booking;

  -- less was taken than was due: it's back in "Due for checkout" to collect the rest
  if public.get_balance_due(booking) > 0 then
    update public.bookings set unpaid_at = now() where id = booking.id;
  end if;

  insert into public.booking_events (booking_id, kind, data)
  values (booking.id, 'payment_corrected', jsonb_build_object(
    'payment_id', target,
    'from', jsonb_build_object('amount_pence', payment.amount_pence, 'method', payment.method, 'tip_pence', payment.tip_pence),
    'to', jsonb_build_object('amount_pence', amount, 'method', via, 'tip_pence', tip)
  ));

  if amount <> payment.amount_pence then
    perform public.queue_receipt(booking.id, true);
  end if;
end;
$$;

/** Studio's "Resend link" for a balance: a fresh link by email, at most twice after the first. */
create function public.resend_balance_link(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  link public.payment_links;
begin
  select * into link from public.payment_links
  where booking_id = target and purpose = 'balance' and status in ('pending', 'expired')
  order by created_at desc limit 1
  for update;

  if link.id is null or link.sent_count >= 3 or public.get_balance_due(booking) = 0 then
    raise exception 'resend_not_allowed';
  end if;

  update public.payment_links set status = 'pending', sent_count = sent_count + 1 where id = link.id;
  update public.bookings set unpaid_at = null where id = target;

  perform public.send_balance_link(target, link.id);
end;
$$;

/** Stops a balance link; the booking goes back to "Due for checkout" to collect another way. */
create function public.cancel_balance_link(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.lock_own_booking(target);

  update public.payment_links set status = 'cancelled'
  where booking_id = target and purpose = 'balance' and status in ('pending', 'expired');

  if not found then
    raise exception 'link_not_pending';
  end if;

  update public.bookings set unpaid_at = now() where id = target;
end;
$$;

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
  where link.token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8'))
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

-- A link payment went through: the fee or balance is paid. Returns 'refund' when it was settled some other way
-- meanwhile, or the link was already paid by another payment.
create or replace function public.confirm_link_payment(intent text, transfer_pending boolean, target_link uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.payment_links;
  fee public.booking_fees;
begin
  select * into link from public.payment_links
  where id = target_link or (target_link is null and stripe_payment_intent_id = intent)
  for update;

  if link.id is null then
    raise exception 'link_not_found';
  end if;

  if link.status = 'paid' then
    return case when link.stripe_payment_intent_id = intent then 'duplicate' else 'refund' end;
  end if;

  if link.purpose = 'balance' then
    if link.status = 'cancelled' then
      return 'refund';
    end if;

    update public.payment_links set status = 'paid', paid_at = now(), stripe_payment_intent_id = intent
    where id = link.id;

    insert into public.payments (booking_id, kind, amount_pence, stripe_payment_intent_id, transfer_pending)
    values (link.booking_id, 'balance', link.amount_pence, intent, confirm_link_payment.transfer_pending)
    on conflict (stripe_payment_intent_id) do nothing;

    insert into public.booking_events (booking_id, kind, data)
    values (link.booking_id, 'balance_paid_by_link', jsonb_build_object('payment_intent', intent));

    perform public.queue_receipt(link.booking_id, false);

    return 'paid';
  end if;

  select * into fee from public.booking_fees where id = link.fee_id for update;

  if fee.status <> 'unpaid' then
    update public.payment_links set status = 'cancelled' where id = link.id;

    return 'refund';
  end if;

  update public.payment_links set status = 'paid', paid_at = now(), stripe_payment_intent_id = intent
  where id = link.id;

  update public.booking_fees set status = 'paid', paid_at = now() where id = fee.id;

  insert into public.payments (booking_id, kind, amount_pence, fee_id, stripe_payment_intent_id, transfer_pending)
  values (link.booking_id, 'fee', link.amount_pence, fee.id, intent, confirm_link_payment.transfer_pending)
  on conflict (stripe_payment_intent_id) do nothing;

  insert into public.booking_events (booking_id, kind, data)
  values (link.booking_id, 'fee_paid_by_link', jsonb_build_object('fee_id', fee.id, 'payment_intent', intent));

  return 'paid';
end;
$$;

revoke execute on function
  public.get_paid_pence(uuid),
  public.get_balance_due(public.bookings),
  public.get_receipt_details(uuid),
  public.queue_receipt(uuid, boolean),
  public.send_balance_link(uuid, uuid),
  public.claim_checkout(uuid, uuid, jsonb),
  public.finish_checkout(uuid, jsonb),
  public.note_checkout_declined(uuid),
  public.undo_checkout(uuid),
  public.record_balance_paid(uuid, text, integer),
  public.correct_recorded_payment(uuid, integer, text, integer),
  public.resend_balance_link(uuid),
  public.cancel_balance_link(uuid)
  from public, anon, authenticated;

grant execute on function
  public.undo_checkout(uuid),
  public.record_balance_paid(uuid, text, integer),
  public.correct_recorded_payment(uuid, integer, text, integer),
  public.resend_balance_link(uuid),
  public.cancel_balance_link(uuid)
  to authenticated;

grant execute on function
  public.claim_checkout(uuid, uuid, jsonb),
  public.finish_checkout(uuid, jsonb),
  public.note_checkout_declined(uuid)
  to service_role;
