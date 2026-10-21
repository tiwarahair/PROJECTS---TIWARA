-- a new stylist's card payments stay with us until their appointment is over (see claim_pending_transfers)
alter table public.payments add column held boolean not null default false;

-- new until five completed bookings were paid by card through us (the booking being paid doesn't count)
create function public.is_payout_held(target uuid, except_booking uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct bookings.id) < 5
  from public.bookings
  join public.payments on payments.booking_id = bookings.id
  where bookings.stylist_id = target and bookings.status = 'completed'
    and bookings.id is distinct from except_booking
    and payments.method = 'card' and payments.stripe_payment_intent_id is not null
$$;

create function public.is_payout_held_for_account(account text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select public.is_payout_held(id) from public.stylists where stripe_account_id = account), false)
$$;

create function public.set_payment_held()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- a late-cancel or no-show fee is only charged once the waiver window has closed, so it isn't held
  new.held := new.method = 'card' and new.kind <> 'fee' and public.is_payout_held(
    (select stylist_id from public.bookings where id = new.booking_id), new.booking_id
  );

  return new;
end;
$$;

create trigger payments_set_held before insert on public.payments
for each row execute function public.set_payment_held();

-- a booking payment charged without a transfer (a new stylist's) is sent on later; never one Stripe already sent
create function public.mark_payment_untransferred(intent text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments set transfer_pending = true
  where stripe_payment_intent_id = intent and stripe_transfer_id is null and method = 'card'
$$;

-- a held payment goes once its booking finished a day ago with no fee still to settle, or after 85 days
drop function public.claim_pending_transfers(integer);

create function public.claim_pending_transfers(batch_size integer)
returns table (
  payment_id uuid, payment_intent_id text, amount_pence integer, platform_fee_pence integer,
  fee_refunded_pence integer, stylist_account text, transfer_failures smallint
)
language sql
security definer
set search_path = ''
as $$
  select payments.id, payments.stripe_payment_intent_id, payments.amount_pence, payments.platform_fee_pence,
    case when payments.kind = 'booking'
      then least(coalesce((bookings.cancellation ->> 'fee_refund_pence')::integer, 0), payments.platform_fee_pence)
      else 0
    end,
    stylists.stripe_account_id, payments.transfer_failures
  from public.payments
  join public.bookings on bookings.id = payments.booking_id
  join public.stylists on stylists.id = bookings.stylist_id
  where payments.transfer_pending and payments.stripe_payment_intent_id is not null
    and stylists.charges_enabled and stylists.stripe_account_id is not null
    and payments.transfer_failures < 5
    and coalesce(payments.transfer_failed_at, '-infinity') < now() - interval '1 hour' * payments.transfer_failures
    and (
      not payments.held
      or payments.created_at <= now() - interval '85 days'
      or (
        bookings.status in ('completed', 'no_show', 'cancelled', 'auto_cancelled')
        and bookings.past_at <= now() - interval '24 hours'
        and not exists (
          select 1 from public.booking_fees
          where booking_fees.booking_id = bookings.id and booking_fees.status in ('pending', 'charging')
        )
      )
    )
  order by payments.transfer_failures, payments.created_at
  limit batch_size
$$;

-- Earnings: a new stylist's money we're still holding
create or replace function public.get_stylist_ledger(target_stylist uuid)
returns table (
  id text, booking_id uuid, booking_ref text, client_id text, client_name text, service text,
  appointment timestamptz, description text, method text, at timestamptz, amount_pence integer,
  card_fee_pence integer, status text, payout_id uuid, note text
)
language sql
stable
security definer
set search_path = ''
as $$
  with owned as (
    select bookings.*, bookings.snapshot ->> 'service_name' as service,
      coalesce(bookings.stylist_client_id::text, 'walk-in:' || bookings.id) as client_key,
      coalesce(nullif(trim(concat_ws(' ', clients.first, clients.last)), ''),
        nullif(trim(concat_ws(' ', bookings.contact ->> 'first', bookings.contact ->> 'last')), ''), 'Walk-in') as name
    from public.bookings
    left join public.stylist_clients clients on clients.id = bookings.stylist_client_id
    where bookings.stylist_id = target_stylist and public.is_stylist_owner(target_stylist)
  ),
  -- money only counts as paid out once its payout reached the bank (a failed one puts it back in the balance)
  paid_out as (
    select id from public.payouts where stylist_id = target_stylist and status = 'paid'
  ),
  paid as (
    select payments.*, owned.ref, owned.client_key, owned.name, owned.service, owned.starts_at,
      case
        when payments.kind = 'fee' and fees.kind = 'no_show' then 'No-show fee'
        when payments.kind = 'fee' then 'Cancellation fee'
        when payments.kind = 'booking' and owned.terms ->> 'mode' = 'full' then 'Full payment'
        when payments.kind = 'booking' then 'Deposit'
        else 'Balance'
      end as description,
      case
        when payments.method = 'cash' then 'Cash'
        when payments.method = 'bank' then 'Bank transfer'
        when payments.method = 'reader' then 'Card reader'
        when payments.method <> 'card' then 'Recorded'
        when exists (select 1 from public.payment_links links
          where links.stripe_payment_intent_id = payments.stripe_payment_intent_id) then 'Payment link'
        when payments.kind = 'booking' then 'Card online'
        else 'Saved card'
      end as method_label,
      case
        when payments.method <> 'card' then 'Recorded'
        when payments.payout_id in (select id from paid_out) then 'Paid out'
        when payments.held and payments.transfer_pending then 'On hold'
        when details.available_on <= now() then 'Available'
        else 'Pending'
      end as line_status
    from public.payments
    join owned on owned.id = payments.booking_id
    left join public.booking_fees fees on fees.id = payments.fee_id
    left join public.card_payment_details details on details.payment_intent_id = payments.stripe_payment_intent_id
  ),
  -- a stylist's own cancellation also gives the client the booking fee back, from the stylist's share
  returned as (
    select refunds.*, owned.ref, owned.client_key, owned.name, owned.service, owned.starts_at,
      case
        when refunds.reason = 'stylist_cancel' then least(owned.fee_pence, refunds.amount_pence)
        -- a free cancellation's booking fee came back from us, not from the stylist
        when refunds.reason = 'client_cancel'
          then least(coalesce((owned.cancellation ->> 'fee_refund_pence')::integer, 0), refunds.amount_pence)
        else 0
      end as fee_share,
      case
        when refunds.method <> 'card' then 'Recorded'
        when refunds.payout_id in (select id from paid_out) then 'Paid out'
        else 'Refunded'
      end as line_status
    from public.refunds
    join owned on owned.id = refunds.booking_id
  ),
  lines (id, booking_id, booking_ref, client_id, client_name, service, appointment, description, method, at,
    amount_pence, card_fee_pence, status, payout_id, note) as (
    -- what was paid: deposits, full payments, balances and fees, without the tip
    select paid.id::text, paid.booking_id, paid.ref, paid.client_key, paid.name, paid.service, paid.starts_at,
      paid.description, paid.method_label, paid.created_at,
      paid.amount_pence - paid.platform_fee_pence - paid.tip_pence,
      case when paid.method = 'card' then paid.card_fee_pence end,
      paid.line_status, paid.payout_id, null::text
    from paid

    union all

    select paid.id::text || ':tip', paid.booking_id, paid.ref, paid.client_key, paid.name, paid.service,
      paid.starts_at, 'Tip', paid.method_label, paid.created_at, paid.tip_pence,
      case when paid.method = 'card' then 0 end, paid.line_status, paid.payout_id, null
    from paid

    union all

    select returned.id::text, returned.booking_id, returned.ref, returned.client_key, returned.name,
      returned.service, returned.starts_at, 'Refund',
      case returned.method
        when 'card' then 'Card' when 'cash' then 'Cash' when 'bank' then 'Bank transfer' else 'Card reader'
      end,
      returned.created_at, -(returned.amount_pence - returned.fee_share),
      case when returned.method = 'card' then 0 end, returned.line_status, returned.payout_id, returned.note
    from returned

    union all

    select returned.id::text || ':fee', returned.booking_id, returned.ref, returned.client_key, returned.name,
      returned.service, returned.starts_at, 'Adjustment (recovery)', 'Card', returned.created_at, -returned.fee_share, 0,
      returned.line_status, returned.payout_id, 'Booking fee for your cancellation'
    from returned
    where returned.reason = 'stylist_cancel'

    union all

    -- a disputed payment: the stylist's share taken back, returned if we win
    select 'dispute:' || disputes.id, disputes.booking_id, owned.ref, owned.client_key, owned.name, owned.service,
      owned.starts_at, 'Adjustment (recovery)', 'Card', disputes.created_at, -disputes.reversed_pence, 0, 'Refunded',
      null::uuid,
      case disputes.outcome
        when 'lost' then 'Dispute lost'
        when 'accepted' then 'Dispute accepted'
        when 'won' then 'Dispute won: your share was returned'
        else 'Dispute open: may be returned if won'
      end
    from public.disputes
    join owned on owned.id = disputes.booking_id
    where disputes.reversed_pence > 0

    union all

    select 'dispute-return:' || disputes.id, disputes.booking_id, owned.ref, owned.client_key, owned.name,
      owned.service, owned.starts_at, 'Adjustment (recovery)', 'Card', disputes.updated_at, disputes.returned_pence,
      0, 'Available', null::uuid, 'Dispute won: your share returned'
    from public.disputes
    join owned on owned.id = disputes.booking_id
    where disputes.returned_pence > 0

    union all

    -- Stripe's dispute fee, taken from a later card payment
    select 'debt:' || recoveries.id, disputes.booking_id, owned.ref, owned.client_key, owned.name, owned.service,
      owned.starts_at, 'Adjustment (recovery)', 'Card', recoveries.created_at, -recoveries.amount_pence, 0,
      case when recoveries.is_direct then 'Recorded' else coalesce(
        (select paid.line_status from paid where paid.stripe_payment_intent_id = recoveries.payment_intent_id), 'Pending'
      ) end,
      null::uuid, case when recoveries.is_direct then 'Stripe’s dispute fee, paid by card' else 'Stripe’s dispute fee' end
    from public.debt_recoveries recoveries
    join public.stylist_debts debts on debts.id = recoveries.debt_id
    join public.disputes on disputes.id = debts.dispute_id
    join owned on owned.id = disputes.booking_id
  )
  select * from lines
  where lines.amount_pence <> 0
  order by lines.at desc
$$;

revoke execute on function
  public.is_payout_held(uuid, uuid),
  public.is_payout_held_for_account(text),
  public.set_payment_held(),
  public.mark_payment_untransferred(text),
  public.claim_pending_transfers(integer)
  from public, anon, authenticated;

grant execute on function
  public.is_payout_held_for_account(text),
  public.mark_payment_untransferred(text),
  public.claim_pending_transfers(integer)
  to service_role;
