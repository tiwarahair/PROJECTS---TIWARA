alter table public.disputes
  add column stylist_id uuid references public.stylists (id) on delete set null,
  add column charge_id text,
  add column share_pence integer not null default 0,
  add column reversed_pence integer not null default 0,
  add column transfer_reversal_id text,
  -- the payment hadn't reached the stylist yet, so it's held back until the dispute is over
  add column is_held boolean not null default false,
  add column reversal_failures smallint not null default 0,
  add column reversal_failed_at timestamptz,
  add column submit_failures smallint not null default 0,
  add column respond_by timestamptz,
  add column evidence jsonb not null default '{}',
  add column outcome text check (outcome in ('accepted', 'submitted', 'won', 'lost')),
  add column responded_at timestamptz,
  add column returned_pence integer not null default 0,
  add column returned_transfer_id text;

create index disputes_stylist_idx on public.disputes (stylist_id, created_at desc);

create table public.stylist_debts (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  dispute_id uuid not null unique references public.disputes (id) on delete cascade,
  amount_pence integer not null check (amount_pence >= 0),
  recovered_pence integer not null default 0 check (recovered_pence >= 0),
  created_at timestamptz not null default now()
);

create table public.debt_recoveries (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.stylist_debts (id) on delete cascade,
  payment_intent_id text not null,
  amount_pence integer not null check (amount_pence > 0),
  -- paid by the stylist's own card to clear it, not taken from a payment to them
  is_direct boolean not null default false,
  created_at timestamptz not null default now(),
  unique (debt_id, payment_intent_id)
);

alter table public.stylist_debts enable row level security;
alter table public.debt_recoveries enable row level security;

create policy "owners read their debts" on public.stylist_debts
  for select to authenticated using (public.is_stylist_owner(stylist_id));

grant select on public.stylist_debts to authenticated;

create function public.get_owed_pence(account text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(debts.amount_pence - debts.recovered_pence), 0)::integer
  from public.stylist_debts debts
  join public.stylists on stylists.id = debts.stylist_id
  where stylists.stripe_account_id = account
$$;

create function public.apply_recovery(account text, intent text, recovered integer, direct boolean default false)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  debt record;
  left_over integer := recovered;
  part integer;
begin
  -- a payment from another environment sharing the Stripe sandbox: not ours to settle
  if not exists (select 1 from public.stylists where stripe_account_id = account) then
    return 0;
  end if;

  -- already applied (a retried webhook): only the excess is given again, to send back if that failed
  if exists (
    select 1 from public.debt_recoveries recoveries where recoveries.payment_intent_id = intent
  ) then
    return recovered - (
      select sum(amount_pence) from public.debt_recoveries recoveries where recoveries.payment_intent_id = intent
    );
  end if;

  for debt in
    select debts.* from public.stylist_debts debts
    join public.stylists on stylists.id = debts.stylist_id
    where stylists.stripe_account_id = account and debts.recovered_pence < debts.amount_pence
    order by debts.created_at
    for update of debts
  loop
    exit when left_over <= 0;

    part := least(left_over, debt.amount_pence - debt.recovered_pence);

    update public.stylist_debts set recovered_pence = recovered_pence + part where id = debt.id;
    insert into public.debt_recoveries (debt_id, payment_intent_id, amount_pence, is_direct)
    values (debt.id, intent, part, direct);

    left_over := left_over - part;
  end loop;

  return left_over;
end;
$$;

drop function public.record_dispute(jsonb);

create function public.record_dispute(dispute jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment public.payments;
  booking public.bookings;
  stylist public.stylists;
  saved public.disputes;
  saved_id uuid;
  is_new boolean;
  owner_email text;
  due timestamptz := to_timestamp(nullif(dispute #>> '{evidence_details,due_by}', '')::bigint);
begin
  select * into payment from public.payments where stripe_payment_intent_id = dispute ->> 'payment_intent';

  -- a dispute can arrive before the payment is recorded: the booking it paid for still knows it
  select * into booking from public.bookings
  where id = payment.booking_id or (payment.id is null and stripe_payment_intent_id = dispute ->> 'payment_intent');

  select * into stylist from public.stylists where id = booking.stylist_id;

  insert into public.disputes (booking_id, stylist_id, stripe_dispute_id, stripe_payment_intent_id, charge_id,
    amount_pence, reason, status, respond_by)
  values (
    booking.id, stylist.id, dispute ->> 'id', dispute ->> 'payment_intent', dispute ->> 'charge',
    (dispute ->> 'amount')::integer, dispute ->> 'reason', dispute ->> 'status',
    least(now() + interval '5 days', coalesce(due - interval '1 day', now() + interval '5 days'))
  )
  on conflict (stripe_dispute_id) do update
  set status = excluded.status, updated_at = now(),
    booking_id = coalesce(disputes.booking_id, excluded.booking_id),
    stylist_id = coalesce(disputes.stylist_id, excluded.stylist_id)
  -- told by the insert itself, as the dispute's first events arrive together
  returning id, xmax = 0 into saved_id, is_new;

  select * into saved from public.disputes where id = saved_id;

  if is_new and stylist.id is not null then
    select email into owner_email from auth.users where id = stylist.owner_id;

    if owner_email is not null then
      perform public.queue_email(
        owner_email,
        'dispute_opened',
        public.get_booking_details(booking.id) || jsonb_build_object(
          'amount_pence', saved.amount_pence, 'reason', saved.reason, 'respond_by', saved.respond_by
        ),
        stylist.owner_id
      );
    end if;
  end if;

  return jsonb_build_object(
    'id', saved.id,
    'stylist_account', stylist.stripe_account_id,
    'transfer_pending', coalesce(payment.transfer_pending, false),
    'transfer_id', payment.stripe_transfer_id,
    'reversed_pence', saved.reversed_pence,
    'is_held', saved.is_held,
    'reversal_failures', saved.reversal_failures,
    'outcome', saved.outcome
  );
end;
$$;

create function public.save_dispute_recovery(target uuid, share integer, reversed integer, reversal text, held boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.disputes
  set share_pence = share, reversed_pence = reversed, transfer_reversal_id = reversal, is_held = held,
    updated_at = now()
  where id = target;

  if held then
    update public.payments set transfer_pending = false
    where stripe_payment_intent_id = (select stripe_payment_intent_id from public.disputes where id = target);
  end if;
end;
$$;

create function public.note_reversal_failure(target uuid, message text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.disputes
  set reversal_failures = reversal_failures + 1, reversal_failed_at = now(), updated_at = now()
  where id = target;

  insert into public.booking_events (booking_id, kind, data)
  select booking_id, 'dispute_reversal_failed', jsonb_build_object('error', message)
  from public.disputes where id = target and booking_id is not null;
$$;

create function public.save_dispute_fees(target uuid, fees integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.stylist_debts (stylist_id, dispute_id, amount_pence)
  select stylist_id, id, fees from public.disputes where id = target and stylist_id is not null and fees > 0
  on conflict (dispute_id) do update set amount_pence = greatest(stylist_debts.amount_pence, excluded.amount_pence)
$$;

create function public.settle_dispute(target uuid, won boolean, returned integer, transfer text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.disputes;
begin
  update public.disputes
  set outcome = case when won then 'won' else 'lost' end, returned_pence = returned,
    returned_transfer_id = transfer, updated_at = now()
  where id = target
  returning * into saved;

  if won and saved.is_held then
    update public.payments set transfer_pending = true where stripe_payment_intent_id = saved.stripe_payment_intent_id;
  end if;
end;
$$;

create function public.get_dispute_evidence(target uuid, owner uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'stripe_dispute_id', disputes.stripe_dispute_id,
    'status', disputes.status,
    'outcome', disputes.outcome,
    'evidence', disputes.evidence,
    'client_name', concat_ws(' ', bookings.contact ->> 'first', bookings.contact ->> 'last'),
    'client_email', bookings.contact ->> 'email',
    'service_name', bookings.snapshot ->> 'service_name',
    'starts_at', bookings.starts_at,
    'arrived_at', bookings.arrived_at,
    'completed_at', bookings.completed_at,
    'terms', bookings.terms,
    'lines', bookings.checkout -> 'lines',
    'final_pence', coalesce(bookings.final_price_pence, bookings.price_pence),
    'business_name', stylists.business_name
  )
  from public.disputes
  join public.stylists on stylists.id = disputes.stylist_id
  left join public.bookings on bookings.id = disputes.booking_id
  where disputes.id = target and stylists.owner_id = owner
$$;

create function public.save_dispute_response(target uuid, response text, given jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.disputes
  set outcome = response, evidence = coalesce(given, disputes.evidence), responded_at = now(), updated_at = now()
  where id = target
$$;

create function public.get_unanswered_disputes(batch_size integer)
returns table (id uuid, owner_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select disputes.id, stylists.owner_id
  from public.disputes
  join public.stylists on stylists.id = disputes.stylist_id
  where disputes.outcome is null and disputes.status in ('needs_response', 'warning_needs_response')
    and disputes.respond_by < now() and disputes.submit_failures < 5
  order by disputes.respond_by
  limit batch_size
$$;

create function public.note_submit_failure(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.disputes
  set submit_failures = submit_failures + 1, respond_by = now() + interval '1 day'
  where id = target
$$;

create function public.get_unrecovered_disputes(batch_size integer)
returns table (id uuid, stripe_dispute_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, stripe_dispute_id from public.disputes
  where reversal_failures between 1 and 4 and reversed_pence = 0 and not is_held
    and coalesce(outcome, '') <> 'won'
    and reversal_failed_at < now() - interval '1 day'
  order by reversal_failed_at
  limit batch_size
$$;

-- also refused while a dispute is open or money is owed
create or replace function public.close_business()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.bookings
    join public.stylists on stylists.id = bookings.stylist_id
    where stylists.owner_id = auth.uid()
      and bookings.status in ('awaiting_confirmation', 'confirmed', 'arrived')
      and bookings.unpaid_at is null
      and bookings.starts_at >= date_trunc('day', now() at time zone 'Europe/London') at time zone 'Europe/London'
  ) then
    raise exception 'has_upcoming';
  end if;

  if exists (
    select 1 from public.disputes
    join public.stylists on stylists.id = disputes.stylist_id
    where stylists.owner_id = auth.uid()
      and disputes.status in ('needs_response', 'under_review', 'warning_needs_response', 'warning_under_review')
  ) then
    raise exception 'has_dispute';
  end if;

  if exists (
    select 1 from public.stylist_debts debts
    join public.stylists on stylists.id = debts.stylist_id
    where stylists.owner_id = auth.uid() and debts.recovered_pence < debts.amount_pence
  ) then
    raise exception 'has_debt';
  end if;

  update public.stylists
  set status = 'closed', closed_at = now()
  where owner_id = auth.uid() and status <> 'closed';

  if not found then
    raise exception 'no open business on this account';
  end if;
end;
$$;

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

-- the same every-minute job, now also for disputes to follow up: a failed reversal, or an unanswered one on its day
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
      or exists (
        select 1 from public.bookings
        where cardinality(checkout_intent_ids) > 0
          and coalesce(checkout_started_at, '-infinity') < now() - interval '2 minutes'
          and unsaved_refund_failures < 5
          and coalesce(unsaved_refund_failed_at, '-infinity') < now() - interval '1 hour' * unsaved_refund_failures
      )
      or exists (select 1 from public.get_unrecovered_disputes(1))
      or exists (select 1 from public.get_unanswered_disputes(1))
    )
  $$
);

revoke execute on function
  public.get_owed_pence(text),
  public.apply_recovery(text, text, integer, boolean),
  public.record_dispute(jsonb),
  public.save_dispute_recovery(uuid, integer, integer, text, boolean),
  public.note_reversal_failure(uuid, text),
  public.save_dispute_fees(uuid, integer),
  public.settle_dispute(uuid, boolean, integer, text),
  public.get_dispute_evidence(uuid, uuid),
  public.save_dispute_response(uuid, text, jsonb),
  public.get_unanswered_disputes(integer),
  public.get_unrecovered_disputes(integer),
  public.note_submit_failure(uuid)
  from public, anon, authenticated;

grant execute on function
  public.get_owed_pence(text),
  public.apply_recovery(text, text, integer, boolean),
  public.record_dispute(jsonb),
  public.save_dispute_recovery(uuid, integer, integer, text, boolean),
  public.note_reversal_failure(uuid, text),
  public.save_dispute_fees(uuid, integer),
  public.settle_dispute(uuid, boolean, integer, text),
  public.get_dispute_evidence(uuid, uuid),
  public.save_dispute_response(uuid, text, jsonb),
  public.get_unanswered_disputes(integer),
  public.get_unrecovered_disputes(integer),
  public.note_submit_failure(uuid)
  to service_role;
