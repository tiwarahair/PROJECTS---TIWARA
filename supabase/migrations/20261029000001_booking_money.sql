-- Money records and fees. A late cancellation or no-show doesn't move money straight away: it schedules a
-- settlement 24 hours later (the stylist can waive it until then), and one job then refunds what's due back and
-- charges the card for any fee the payment didn't cover.
alter table public.bookings add column stripe_payment_method_id text;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind text not null check (kind in ('booking', 'fee')),
  method text not null default 'card' check (method in ('card', 'cash', 'bank', 'other')),
  amount_pence integer not null check (amount_pence > 0),
  -- the platform's booking fee inside a booking payment; fees carry none
  platform_fee_pence integer not null default 0 check (platform_fee_pence >= 0),
  fee_id uuid,
  stripe_payment_intent_id text unique,
  -- charged while the stylist's account couldn't receive it; sent on once it can
  transfer_pending boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  amount_pence integer not null check (amount_pence > 0),
  reason text not null check (reason in ('client_cancel', 'stylist_cancel', 'fee_settled', 'fee_waived', 'manual')),
  note text check (length(note) <= 500),
  stripe_refund_id text unique,
  created_at timestamptz not null default now()
);

create table public.booking_fees (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind text not null check (kind in ('late_cancel', 'no_show')),
  -- the fee under the policy (0 when the stylist chose no charge)
  amount_pence integer not null check (amount_pence >= 0),
  -- of the money already paid: what the stylist keeps, and what goes back to the client at settlement
  kept_pence integer not null check (kept_pence >= 0),
  refund_pence integer not null check (refund_pence >= 0),
  refunded_pence integer not null default 0,
  -- the part of the fee the payment didn't cover, charged to the saved card
  charge_pence integer not null check (charge_pence >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'charging', 'settled', 'paid', 'paid_offline', 'unpaid', 'waived', 'void')),
  charge_after timestamptz not null,
  claimed_at timestamptz,
  tries smallint not null default 0,
  last_tried_at timestamptz,
  hard_decline boolean not null default false,
  decline_message text,
  card_label text,
  waived_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payments add constraint payments_fee_id_fkey foreign key (fee_id) references public.booking_fees (id);

create index payments_booking_id_idx on public.payments (booking_id);
create index payments_fee_id_idx on public.payments (fee_id);
create index refunds_booking_id_idx on public.refunds (booking_id);
create index booking_fees_booking_id_idx on public.booking_fees (booking_id);
create index booking_fees_due_idx on public.booking_fees (charge_after) where status in ('pending', 'charging');

alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.booking_fees enable row level security;

create policy "Owners read their bookings' payments" on public.payments
  for select to authenticated using (
    exists (select 1 from public.bookings where bookings.id = booking_id and public.is_stylist_owner(bookings.stylist_id))
  );
create policy "Owners read their bookings' refunds" on public.refunds
  for select to authenticated using (
    exists (select 1 from public.bookings where bookings.id = booking_id and public.is_stylist_owner(bookings.stylist_id))
  );
create policy "Owners read their bookings' fees" on public.booking_fees
  for select to authenticated using (
    exists (select 1 from public.bookings where bookings.id = booking_id and public.is_stylist_owner(bookings.stylist_id))
  );

grant select on public.payments, public.refunds, public.booking_fees to authenticated;

-- every paid booking gets its payment row, and every cancellation refund its refund row
create function public.record_booking_money()
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

  if new.cancellation ->> 'refund_id' is not null and old.cancellation is null
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

create trigger bookings_record_money
  after update of paid_at, cancellation on public.bookings
  for each row execute function public.record_booking_money();

insert into public.payments (booking_id, kind, amount_pence, platform_fee_pence, stripe_payment_intent_id, created_at)
select id, 'booking', due_today_pence, fee_pence, stripe_payment_intent_id, paid_at
from public.bookings
where paid_at is not null and due_today_pence > 0
on conflict (stripe_payment_intent_id) do nothing;

insert into public.refunds (booking_id, amount_pence, reason, stripe_refund_id, created_at)
select id, (cancellation ->> 'refund_pence')::integer,
  case when cancelled_by = 'stylist' then 'stylist_cancel' else 'client_cancel' end,
  cancellation ->> 'refund_id', cancelled_at
from public.bookings
where cancellation ->> 'refund_id' is not null and (cancellation ->> 'refund_pence')::integer > 0
on conflict (stripe_refund_id) do nothing;

/** The fee a policy sets for a late cancellation or a no-show (0 when it's off). */
create function public.get_fee_amount(booking public.bookings, kind text)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when booking.terms ->> 'mode' = 'none' then 0
    when not coalesce((booking.terms ->> (case kind when 'no_show' then 'no_show_on' else 'late_on' end))::boolean, false)
      then 0
    when booking.terms ->> 'mode' = 'deposit'
      and booking.terms ->> (case kind when 'no_show' then 'no_show_kind' else 'late_kind' end) = 'keep'
      then coalesce((booking.terms ->> 'deposit_pence')::integer, 0)
    else round(
      booking.price_pence
        * (booking.terms ->> (case kind when 'no_show' then 'no_show_percent' else 'late_percent' end))::numeric / 100
    )::integer
  end
$$;

/** How a fee splits against what was paid: kept from the payment, refunded, and left to charge to the card. */
create function public.get_fee_split(booking public.bookings, fee integer)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  mode text := booking.terms ->> 'mode';
  price integer := booking.price_pence;
  deposit integer := coalesce((booking.terms ->> 'deposit_pence')::integer, 0);
  kept integer := 0;
  refund integer := 0;
  charge integer := 0;
begin
  if mode = 'deposit' then
    kept := case when (booking.terms ->> 'refundable')::boolean then least(fee, deposit) else deposit end;
    refund := deposit - kept;
    charge := greatest(fee - deposit, 0);
  elsif mode = 'full' then
    kept := least(fee, price);
    refund := price - kept;
  elsif mode = 'card' then
    charge := fee;
  end if;

  return jsonb_build_object('fee_pence', fee, 'kept_pence', kept, 'refund_pence', refund, 'charge_pence', charge);
end;
$$;

create or replace function public.get_cancellation_terms(booking public.bookings)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  is_late boolean := now() >= (booking.terms ->> 'free_cancel_until')::timestamptz;
begin
  return public.get_fee_split(booking, case when is_late then public.get_fee_amount(booking, 'late_cancel') else 0 end)
    || jsonb_build_object('is_late', is_late, 'free_cancel_until', booking.terms ->> 'free_cancel_until');
end;
$$;

/** Schedules the settlement for a late cancellation or no-show, and tells the client about any fee. */
create function public.schedule_booking_fee(booking public.bookings, kind text, split jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fee integer := (split ->> 'fee_pence')::integer;
begin
  if fee = 0 and (split ->> 'refund_pence')::integer = 0 then
    return;
  end if;

  insert into public.booking_fees (booking_id, kind, amount_pence, kept_pence, refund_pence, charge_pence, charge_after)
  values (
    booking.id, kind, fee, (split ->> 'kept_pence')::integer, (split ->> 'refund_pence')::integer,
    (split ->> 'charge_pence')::integer, now() + interval '24 hours'
  );

  if fee > 0 then
    perform public.queue_email(
      booking.contact ->> 'email',
      'fee_scheduled',
      public.get_booking_details(booking.id) || split
        || jsonb_build_object('kind', kind, 'charge_after', now() + interval '24 hours'),
      booking.client_id
    );
  end if;
end;
$$;

-- Cancelling with a fee refunds nothing straight away (the settlement does it); otherwise as before.
create or replace function public.cancel_managed_booking(token text, cancellation jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.get_booking_by_token(token);
begin
  if booking.id is null then
    raise exception 'link_not_valid';
  end if;

  update public.bookings
  set status = 'cancelled', cancelled_at = now(), cancelled_by = 'client',
    cancellation = cancel_managed_booking.cancellation
  where id = booking.id and status = 'confirmed';

  if not found then
    raise exception 'cannot_cancel';
  end if;

  if coalesce((cancellation ->> 'fee_pence')::integer, 0) > 0 then
    perform public.schedule_booking_fee(booking, 'late_cancel', cancellation);
  end if;

  insert into public.booking_events (booking_id, kind, data)
  values (booking.id, 'cancelled', cancel_managed_booking.cancellation || jsonb_build_object('by', 'client'));

  perform public.queue_booking_change(booking.id, 'booking_cancelled', 'client_cancelled');
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

create or replace function public.cancel_studio_booking(target uuid, owner uuid, who text, reason text, cancellation jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
begin
  update public.bookings
  set status = 'cancelled', cancelled_at = now(), cancelled_by = who,
    cancel_reason = nullif(trim(reason), ''), cancellation = cancel_studio_booking.cancellation
  where id = target
    and status in ('awaiting_confirmation', 'confirmed', 'arrived')
    and stylist_id in (select id from public.stylists where owner_id = owner)
  returning * into booking;

  if booking.id is null then
    raise exception 'cannot_cancel';
  end if;

  if coalesce((cancellation ->> 'fee_pence')::integer, 0) > 0 then
    perform public.schedule_booking_fee(booking, 'late_cancel', cancellation);
  end if;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'cancelled', cancel_studio_booking.cancellation || jsonb_build_object('by', who, 'recorded_by', 'stylist'));

  perform public.queue_booking_change(
    target, case when who = 'stylist' then 'booking_cancelled_by_stylist' else 'booking_cancelled' end, null
  );
end;
$$;

-- A no-show settles 24 hours later: the fee if the stylist charges one, otherwise everything paid goes back.
create or replace function public.mark_no_show(target uuid, charge_fee boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  grace integer := coalesce((booking.terms ->> 'grace_minutes')::integer, 0);
begin
  if booking.status <> 'confirmed'
    or now() < booking.starts_at + make_interval(mins => grace)
    or now() >= booking.starts_at + interval '24 hours' then
    raise exception 'no_show_not_allowed';
  end if;

  update public.bookings set status = 'no_show', no_show_at = now() where id = target;

  if booking.stripe_payment_intent_id is not null then
    perform public.schedule_booking_fee(
      booking, 'no_show', public.get_fee_split(booking, case when charge_fee then public.get_fee_amount(booking, 'no_show') else 0 end)
    );
  end if;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'no_show', jsonb_build_object('charge_fee', charge_fee, 'by', 'stylist'));
end;
$$;

create or replace function public.undo_no_show(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
begin
  if booking.status <> 'no_show' or booking.no_show_at <= now() - interval '24 hours'
    or exists (select 1 from public.booking_fees where booking_id = target and status not in ('pending', 'void')) then
    raise exception 'undo_not_allowed';
  end if;

  update public.bookings set status = 'confirmed', no_show_at = null where id = target;
  update public.booking_fees set status = 'void' where booking_id = target and status = 'pending';

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'no_show_undone', jsonb_build_object('by', 'stylist'));
end;
$$;

-- Studio acts on a booking's current fee (a voided one belongs to an undone no-show), so a waive straight after
-- marking a no-show finds the fee that marking made.

/** The signed-in stylist's booking's current fee, locked; raises not_found for anyone else's. */
create function public.lock_own_fee(target_booking uuid)
returns public.booking_fees
language plpgsql
security definer
set search_path = ''
as $$
declare
  fee public.booking_fees;
begin
  select booking_fees.* into fee
  from public.booking_fees
  join public.bookings on bookings.id = booking_fees.booking_id
  where booking_fees.booking_id = target_booking and booking_fees.status <> 'void'
    and public.is_stylist_owner(bookings.stylist_id)
  order by booking_fees.created_at desc
  limit 1
  for update of booking_fees;

  if fee.id is null then
    raise exception 'not_found';
  end if;

  return fee;
end;
$$;

-- Waiving before the fee settles, or after it couldn't be charged: nothing is charged and what was kept from the
-- payment goes back too. The settlement job makes the refund within a minute.
create function public.waive_fee(target_booking uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fee public.booking_fees := public.lock_own_fee(target_booking);
  booking public.bookings;
begin
  if fee.status not in ('pending', 'unpaid') or fee.amount_pence = 0 or fee.waived_at is not null then
    raise exception 'waive_not_allowed';
  end if;

  update public.booking_fees
  set status = 'pending', refund_pence = refund_pence + kept_pence, kept_pence = 0, charge_pence = 0,
    waived_at = now(), charge_after = now()
  where id = fee.id
  returning * into fee;

  select * into booking from public.bookings where id = fee.booking_id;

  perform public.queue_email(
    booking.contact ->> 'email',
    'fee_waived',
    public.get_booking_details(booking.id)
      || jsonb_build_object('kind', fee.kind, 'fee_pence', fee.amount_pence, 'refund_pence', fee.refund_pence),
    booking.client_id
  );

  insert into public.booking_events (booking_id, kind, data)
  values (fee.booking_id, 'fee_waived', jsonb_build_object('fee_id', fee.id));
end;
$$;

/** The client paid an unpaid fee some other way. */
create function public.record_fee_paid(target_booking uuid, method text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fee public.booking_fees := public.lock_own_fee(target_booking);
begin
  if fee.status <> 'unpaid' or method not in ('cash', 'bank', 'other') then
    raise exception 'record_not_allowed';
  end if;

  update public.booking_fees set status = 'paid_offline', paid_at = now() where id = fee.id;

  insert into public.payments (booking_id, kind, method, amount_pence, fee_id)
  values (fee.booking_id, 'fee', method, fee.charge_pence, fee.id);

  insert into public.booking_events (booking_id, kind, data)
  values (fee.booking_id, 'fee_recorded', jsonb_build_object('fee_id', fee.id, 'method', method));
end;
$$;

-- What the settlement needs to move the money, for a claimed fee.
create function public.get_fee_settlement(fee public.booking_fees)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(fee) || jsonb_build_object(
    'payment_intent_id', bookings.stripe_payment_intent_id,
    'customer_id', bookings.stripe_customer_id,
    'payment_method_id', bookings.stripe_payment_method_id,
    'booking_ref', bookings.ref,
    'stylist_account', stylists.stripe_account_id,
    'stylist_can_receive', stylists.charges_enabled
  )
  from public.bookings
  join public.stylists on stylists.id = bookings.stylist_id
  where bookings.id = fee.booking_id
$$;

-- Fees whose waive window has closed (and ones a crashed run left half-done; Stripe's idempotency keys make the
-- rerun safe, so its try isn't counted again).
create function public.claim_due_fees(batch_size integer)
returns setof jsonb
language sql
security definer
set search_path = ''
as $$
  with due as (
    select id from public.booking_fees
    where (status = 'pending' and charge_after <= now())
      or (status = 'charging' and claimed_at < now() - interval '15 minutes')
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

-- A retry from Studio: only for a fee the card declined, not after a hard decline, at most twice, a day apart.
create function public.claim_fee_retry(target_booking uuid, owner uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  fee public.booking_fees;
begin
  select booking_fees.* into fee
  from public.booking_fees
  join public.bookings on bookings.id = booking_fees.booking_id
  join public.stylists on stylists.id = bookings.stylist_id
  where booking_fees.booking_id = target_booking and booking_fees.status <> 'void' and stylists.owner_id = owner
  order by booking_fees.created_at desc
  limit 1
  for update of booking_fees;

  if fee.id is null then
    raise exception 'not_found';
  end if;

  if fee.status <> 'unpaid' or fee.hard_decline or fee.tries >= 3 or fee.last_tried_at > now() - interval '24 hours' then
    raise exception 'retry_not_allowed';
  end if;

  update public.booking_fees set status = 'charging', claimed_at = now(), tries = tries + 1
  where id = fee.id
  returning * into fee;

  return public.get_fee_settlement(fee);
end;
$$;

-- The settlement's outcome: the refund made, then the charge's result (paid, unpaid with the decline, or nothing
-- to charge).
create function public.finish_fee_settlement(target uuid, result jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fee public.booking_fees;
  refunded integer := coalesce((result ->> 'refunded_pence')::integer, 0);
  outcome text := result ->> 'outcome';
begin
  select * into fee from public.booking_fees where id = target and status = 'charging' for update;

  if fee.id is null then
    return;
  end if;

  if refunded > 0 then
    insert into public.refunds (booking_id, amount_pence, reason, stripe_refund_id)
    values (
      fee.booking_id, refunded, case when fee.waived_at is null then 'fee_settled' else 'fee_waived' end,
      result ->> 'refund_id'
    )
    on conflict (stripe_refund_id) do nothing;
  end if;

  if outcome = 'paid' then
    insert into public.payments (booking_id, kind, amount_pence, fee_id, stripe_payment_intent_id, transfer_pending)
    values (
      fee.booking_id, 'fee', fee.charge_pence, target, result ->> 'payment_intent_id',
      coalesce((result ->> 'transfer_pending')::boolean, false)
    )
    on conflict (stripe_payment_intent_id) do nothing;
  end if;

  update public.booking_fees
  set status = case
      when outcome = 'paid' then 'paid'
      when outcome = 'unpaid' then 'unpaid'
      when waived_at is not null then 'waived'
      else 'settled'
    end,
    refund_pence = refund_pence - refunded,
    refunded_pence = refunded_pence + refunded,
    last_tried_at = case when outcome in ('paid', 'unpaid') then now() else last_tried_at end,
    paid_at = case when outcome = 'paid' then now() else paid_at end,
    hard_decline = hard_decline or coalesce((result ->> 'hard_decline')::boolean, false),
    decline_message = case when outcome = 'unpaid' then result ->> 'decline_message' else decline_message end,
    card_label = coalesce(result ->> 'card_label', card_label),
    claimed_at = null
  where id = target;

  insert into public.booking_events (booking_id, kind, data)
  values (fee.booking_id, 'fee_settled', result || jsonb_build_object('fee_id', target));
end;
$$;

-- every minute while a fee is due: the Edge Function settles it
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
    and exists (
      select 1 from public.booking_fees
      where (status = 'pending' and charge_after <= now())
        or (status = 'charging' and claimed_at < now() - interval '15 minutes')
    )
  $$
);

revoke execute on function
  public.record_booking_money(),
  public.get_fee_amount(public.bookings, text),
  public.get_fee_split(public.bookings, integer),
  public.schedule_booking_fee(public.bookings, text, jsonb),
  public.lock_own_fee(uuid),
  public.waive_fee(uuid),
  public.record_fee_paid(uuid, text),
  public.get_fee_settlement(public.booking_fees),
  public.claim_due_fees(integer),
  public.claim_fee_retry(uuid, uuid),
  public.finish_fee_settlement(uuid, jsonb)
  from public, anon, authenticated;

grant execute on function public.waive_fee(uuid), public.record_fee_paid(uuid, text) to authenticated;

grant execute on function
  public.claim_due_fees(integer),
  public.claim_fee_retry(uuid, uuid),
  public.finish_fee_settlement(uuid, jsonb)
  to service_role;
