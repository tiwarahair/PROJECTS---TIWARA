
alter table public.booking_fees add column failed_runs smallint not null default 0;

-- a cancellation's refund row is recorded when its refund id arrives, which is now after the cancellation itself
create or replace function public.record_booking_money()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.paid_at is not null and old.paid_at is null and coalesce(new.due_today_pence, 0) > 0 then
    insert into public.payments (booking_id, kind, amount_pence, platform_fee_pence, stripe_payment_intent_id)
    values (new.id, 'booking', new.due_today_pence, new.fee_pence, new.stripe_payment_intent_id)
    on conflict (stripe_payment_intent_id) do nothing;
  end if;

  if new.cancellation ->> 'refund_id' is not null and old.cancellation ->> 'refund_id' is null
    and coalesce((new.cancellation ->> 'refunded_pence')::integer, 0) > 0 then
    insert into public.refunds (booking_id, amount_pence, reason, stripe_refund_id)
    values (
      new.id, (new.cancellation ->> 'refunded_pence')::integer,
      case when new.cancelled_by = 'stylist' then 'stylist_cancel' else 'client_cancel' end,
      new.cancellation ->> 'refund_id'
    )
    on conflict (stripe_refund_id) do nothing;
  end if;

  return new;
end;
$$;

/** Is this a cancellation still waiting for its refund (the refund failed after the booking was cancelled)? */
create function public.is_refund_unfinished(booking public.bookings, who text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select booking.status = 'cancelled' and booking.cancelled_by = who
    and booking.cancellation ->> 'refund_id' is null
    and coalesce((booking.cancellation ->> 'refund_now_pence')::integer, 0) > 0
$$;

-- The manage page's cancel: as before, or the cancellation still waiting for its refund (marked "resume").
create or replace function public.get_cancellation(token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.get_booking_by_token(token);
begin
  if booking.id is null then
    raise exception 'link_not_valid';
  end if;

  if public.is_refund_unfinished(booking, 'client') then
    return booking.cancellation || jsonb_build_object(
      'id', booking.id, 'payment_intent_id', booking.stripe_payment_intent_id, 'resume', true
    );
  end if;

  if booking.status <> 'confirmed' or booking.starts_at <= now() then
    raise exception 'cannot_cancel';
  end if;

  if not public.is_manage_verified(token) then
    raise exception 'confirm_needed';
  end if;

  return public.get_cancellation_terms(booking) || jsonb_build_object(
    'id', booking.id,
    'payment_intent_id', booking.stripe_payment_intent_id
  );
end;
$$;

create or replace function public.get_studio_cancellation(target uuid, owner uuid, who text, waive_fee boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  paid integer;
  terms jsonb;
begin
  select bookings.* into booking
  from public.bookings
  join public.stylists on stylists.id = bookings.stylist_id
  where bookings.id = target and stylists.owner_id = owner;

  if booking.id is null then
    raise exception 'not_found';
  end if;

  if public.is_refund_unfinished(booking, who) then
    return booking.cancellation || jsonb_build_object(
      'id', booking.id, 'payment_intent_id', booking.stripe_payment_intent_id, 'resume', true
    );
  end if;

  if booking.status not in ('awaiting_confirmation', 'confirmed', 'arrived') then
    raise exception 'cannot_cancel';
  end if;

  -- only money taken through Stripe can go back
  paid := case
    when booking.paid_at is null or booking.stripe_payment_intent_id is null then 0
    else coalesce(booking.due_today_pence, 0)
  end;

  if who = 'stylist' then
    terms := jsonb_build_object(
      'is_late', false, 'fee_pence', 0, 'refund_pence', paid, 'kept_pence', 0, 'charge_pence', 0,
      'fee_recovery_pence', case when paid > 0 then booking.fee_pence else 0 end
    );
  else
    terms := public.get_cancellation_terms(booking);

    if waive_fee then
      terms := terms || jsonb_build_object(
        'fee_pence', 0,
        'refund_pence', (terms ->> 'refund_pence')::integer + (terms ->> 'kept_pence')::integer,
        'kept_pence', 0,
        'charge_pence', 0,
        'waived', true
      );
    end if;

    if booking.stripe_payment_intent_id is null then
      terms := terms || jsonb_build_object('refund_pence', 0);
    end if;
  end if;

  return terms || jsonb_build_object('id', booking.id, 'payment_intent_id', booking.stripe_payment_intent_id);
end;
$$;

/** The refund a cancellation made, recorded once it's gone through. */
create function public.set_cancel_refund(target uuid, refund_id text, refunded integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bookings
  set cancellation = cancellation || jsonb_build_object('refund_id', refund_id, 'refunded_pence', refunded)
  where id = target and status = 'cancelled' and cancellation ->> 'refund_id' is null
$$;

-- Card payments a Studio refund can come from: fee charges first, then the booking's own payment. Only the
-- stylist's share can be refunded (never the platform's booking fee), and a fee sent on to them later says so.
drop function public.get_refund_sources(uuid, uuid);

create function public.get_refund_sources(target_booking uuid, owner uuid)
returns table (payment_intent_id text, stylist_share_pence integer, stripe_transfer_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select payments.stripe_payment_intent_id, payments.amount_pence - payments.platform_fee_pence,
    payments.stripe_transfer_id
  from public.payments
  join public.bookings on bookings.id = payments.booking_id
  join public.stylists on stylists.id = bookings.stylist_id
  where payments.booking_id = target_booking and stylists.owner_id = owner
    and payments.method = 'card' and payments.stripe_payment_intent_id is not null
    and payments.amount_pence > payments.platform_fee_pence
  order by payments.kind = 'booking', payments.created_at desc
$$;

-- a link's payment is replaced when a new one is needed (the old one was cancelled or ran out)
create or replace function public.set_link_intent(link uuid, intent text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payment_links set stripe_payment_intent_id = intent where id = link and status = 'pending'
$$;

-- A link payment went through, found by its link. Returns 'refund' when the fee was settled some other way
-- meanwhile, or the link was already paid by another payment.
drop function public.confirm_link_payment(text, boolean);

create function public.confirm_link_payment(intent text, transfer_pending boolean, target_link uuid)
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

-- Studio's "Resend link": a fresh link by email, at most twice after the first; an expired link, or one cancelled
-- while a retry was running, is reopened while the fee is still unpaid.
create or replace function public.resend_payment_link(target_booking uuid)
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
    select * into link from public.payment_links where fee_id = fee.id and status in ('expired', 'cancelled')
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

-- a fee whose settlement failed five times in a row is left for us to look at (booking_events 'settlement_stuck')
create or replace function public.claim_due_fees(batch_size integer)
returns setof jsonb
language sql
security definer
set search_path = ''
as $$
  with due as (
    select id from public.booking_fees
    where failed_runs < 5 and (
      (status = 'pending' and charge_after <= now())
      or (status = 'charging' and claimed_at < now() - interval '15 minutes')
    )
    order by charge_after
    limit batch_size
    for update skip locked
  )
  update public.booking_fees as fee
  set tries = case when fee.status = 'pending' and fee.charge_pence > 0 then fee.tries + 1 else fee.tries end,
    status = 'charging', claimed_at = now()
  from due
  where fee.id = due.id
  returning public.get_fee_settlement(fee)
$$;

create function public.note_settlement_failure(target uuid, message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fee public.booking_fees;
begin
  update public.booking_fees set failed_runs = failed_runs + 1 where id = target returning * into fee;

  if fee.failed_runs >= 5 then
    insert into public.booking_events (booking_id, kind, data)
    values (fee.booking_id, 'settlement_stuck', jsonb_build_object('fee_id', fee.id, 'error', message));
  end if;
end;
$$;

-- a settlement that goes through starts the count again
create or replace function public.reset_settlement_failures()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.failed_runs := 0;

  return new;
end;
$$;

create trigger booking_fees_reset_failures
  before update of status on public.booking_fees
  for each row
  when (new.status <> 'charging' and old.status = 'charging')
  execute function public.reset_settlement_failures();

revoke execute on function
  public.is_refund_unfinished(public.bookings, text),
  public.set_cancel_refund(uuid, text, integer),
  public.get_refund_sources(uuid, uuid),
  public.confirm_link_payment(text, boolean, uuid),
  public.note_settlement_failure(uuid, text),
  public.reset_settlement_failures()
  from public, anon, authenticated;

grant execute on function
  public.set_cancel_refund(uuid, text, integer),
  public.get_refund_sources(uuid, uuid),
  public.confirm_link_payment(text, boolean, uuid),
  public.note_settlement_failure(uuid, text)
  to service_role;

-- Cancellations whose refund failed after the booking was cancelled: the settlement job finishes them (the refund
-- is keyed to the booking, so doing it twice makes one refund).
create function public.get_unfinished_refunds(batch_size integer)
returns table (booking_id uuid, payment_intent_id text, amount_pence integer, cancelled_by text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, stripe_payment_intent_id, (cancellation ->> 'refund_now_pence')::integer, cancelled_by
  from public.bookings
  where status = 'cancelled' and cancellation ->> 'refund_id' is null
    and coalesce((cancellation ->> 'refund_now_pence')::integer, 0) > 0
    and cancelled_at < now() - interval '5 minutes'
  order by cancelled_at
  limit batch_size
$$;

/** For us, from the SQL editor: try a stuck settlement again once whatever broke it is fixed. */
create function public.retry_stuck_fee(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.booking_fees set failed_runs = 0, status = 'pending', charge_after = now(), claimed_at = null
  where id = target and status = 'charging' and failed_runs >= 5
$$;

-- every minute while a fee is due or a cancellation's refund is unfinished
select cron.schedule(
  'charge-fees',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/charge-fees',
    headers := jsonb_build_object(
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
    and (
      exists (
        select 1 from public.booking_fees
        where failed_runs < 5 and (
          (status = 'pending' and charge_after <= now())
          or (status = 'charging' and claimed_at < now() - interval '15 minutes')
        )
      )
      or exists (select 1 from public.get_unfinished_refunds(1))
    )
  $$
);

revoke execute on function public.get_unfinished_refunds(integer), public.retry_stuck_fee(uuid)
  from public, anon, authenticated;
grant execute on function public.get_unfinished_refunds(integer), public.retry_stuck_fee(uuid) to service_role;
