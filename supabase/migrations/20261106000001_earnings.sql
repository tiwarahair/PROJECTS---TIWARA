-- Earnings: the stylist's payouts from Stripe, when each card payment becomes available, which payout paid it out,
-- refunds the stylist hands back themselves, and the dated ledger Studio's Earnings reads.

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  stripe_payout_id text not null unique,
  amount_pence integer not null,
  status text not null check (status in ('pending', 'in_transit', 'paid', 'failed', 'canceled')),
  arrival_date date,
  failure_message text,
  bank_label text,
  -- the status the stylist was last emailed about, so each is sent once however many events arrive together
  emailed_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payouts_stylist_idx on public.payouts (stylist_id, created_at desc);

alter table public.payouts enable row level security;

create policy "owners read their payouts" on public.payouts
  for select to authenticated using (public.is_stylist_owner(stylist_id));

grant select on public.payouts to authenticated;

-- when a card payment's money becomes available in the stylist's Stripe balance (from their account's records)
create table public.card_payment_details (
  payment_intent_id text primary key,
  destination_payment text not null,
  available_on timestamptz not null
);

alter table public.card_payment_details enable row level security;

alter table public.payments add column payout_id uuid references public.payouts (id);
alter table public.refunds add column payout_id uuid references public.payouts (id);

create function public.get_payout_rank(status text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case status when 'pending' then 1 when 'in_transit' then 2 when 'paid' then 3 else 4 end
$$;

/** A payout event from the stylist's Stripe account; the first paid or failed one emails the stylist. */
create function public.save_payout(account text, payout jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  stylist public.stylists;
  saved public.payouts;
  owner_email text;
begin
  select * into stylist from public.stylists where stripe_account_id = account;

  if stylist.id is null then
    return null;
  end if;

  insert into public.payouts (stylist_id, stripe_payout_id, amount_pence, status, arrival_date, failure_message,
    bank_label, created_at)
  values (stylist.id, payout ->> 'id', (payout ->> 'amount')::integer, payout ->> 'status',
    to_timestamp((payout ->> 'arrival_date')::bigint)::date, payout ->> 'failure_message', stylist.payout_bank,
    to_timestamp((payout ->> 'created')::bigint))
  on conflict (stripe_payout_id) do update
  set amount_pence = excluded.amount_pence, arrival_date = excluded.arrival_date,
    failure_message = coalesce(excluded.failure_message, payouts.failure_message), updated_at = now(),
    -- events can arrive out of order: a payout only moves forward (a paid one can still fail)
    status = case
      when public.get_payout_rank(excluded.status) >= public.get_payout_rank(payouts.status) then excluded.status
      else payouts.status
    end
  returning * into saved;

  -- the row is locked until this commits, so a second event at the same moment finds it already emailed
  update public.payouts set emailed_status = saved.status
  where id = saved.id and saved.status in ('paid', 'failed') and emailed_status is distinct from saved.status;

  if found then
    select email into owner_email from auth.users where id = stylist.owner_id;

    perform public.queue_email(owner_email, 'payout_' || saved.status, jsonb_build_object(
      'business_name', stylist.business_name,
      'amount_pence', saved.amount_pence,
      'arrival_date', saved.arrival_date,
      'bank_label', saved.bank_label,
      'failure_message', saved.failure_message
    ), stylist.owner_id);
  end if;

  return saved.id;
end;
$$;

-- what a payout included, matched to our payments (by payment intent) and refunds (by refund)
create function public.link_payout(stripe_payout text, intents text[], stripe_refunds text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  payout uuid := (select id from public.payouts where stripe_payout_id = stripe_payout);
begin
  update public.payments set payout_id = payout where stripe_payment_intent_id = any(intents);
  update public.refunds set payout_id = payout where stripe_refund_id = any(stripe_refunds);
end;
$$;

create function public.save_card_payment(intent text, destination text, available timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.card_payment_details (payment_intent_id, destination_payment, available_on)
  values (intent, destination, available)
  on conflict (payment_intent_id) do update set destination_payment = excluded.destination_payment,
    available_on = excluded.available_on
$$;

/** Past's "Record refund": money the stylist gave back themselves, the way it was paid. */
create function public.record_refund(target uuid, amount integer, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  recorded integer;
  via text;
begin
  select coalesce(sum(amount_pence), 0) into recorded from public.payments
  where booking_id = target and method <> 'card';

  select recorded - coalesce(sum(amount_pence), 0) into recorded from public.refunds
  where booking_id = target and refunds.method <> 'card';

  if amount is null or amount <= 0 or amount > recorded then
    raise exception 'more_than_refundable';
  end if;

  select payments.method into via from public.payments
  where booking_id = target and payments.method in ('cash', 'bank', 'reader')
  order by created_at desc limit 1;

  insert into public.refunds (booking_id, amount_pence, reason, note, method)
  values (target, amount, 'manual', nullif(trim(reason), ''), coalesce(via, 'cash'));

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'refund_recorded', jsonb_build_object('amount_pence', amount, 'via', coalesce(via, 'cash')));
end;
$$;

/** The stylist's dated money lines (their part only: the booking fee isn't theirs), newest first. */
create function public.get_stylist_ledger(target_stylist uuid)
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
      case when refunds.reason = 'stylist_cancel' then least(owned.fee_pence, refunds.amount_pence) else 0 end
        as fee_share,
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
  )
  select * from lines
  where lines.amount_pence <> 0
  order by lines.at desc
$$;

revoke execute on function
  public.get_payout_rank(text),
  public.save_payout(text, jsonb),
  public.link_payout(text, text[], text[]),
  public.save_card_payment(text, text, timestamptz),
  public.record_refund(uuid, integer, text),
  public.get_stylist_ledger(uuid)
  from public, anon, authenticated;

grant execute on function
  public.record_refund(uuid, integer, text),
  public.get_stylist_ledger(uuid)
  to authenticated;

grant execute on function
  public.save_payout(text, jsonb),
  public.link_payout(text, text[], text[]),
  public.save_card_payment(text, text, timestamptz)
  to service_role;
