-- Settlement safety: a stuck fee is retried without a second charge, a cancellation refund that can't go through
-- (or has nothing left to refund) stops being retried, and transfers to stylists that keep failing don't hold up the
-- rest. Every retry uses a new Stripe key (Stripe replays a failed request's result for a day), so each try is real;
-- what an earlier try already did is looked up in Stripe first.

alter table public.booking_fees add column reruns smallint not null default 0;

alter table public.payments
  add column transfer_failures smallint not null default 0,
  add column transfer_failed_at timestamptz;

-- A stuck settlement goes round again as a rerun: the same try (the stylist's retries are untouched) with new Stripe
-- keys; the settlement finds a refund or charge an earlier run made, so nothing happens twice.
create or replace function public.retry_stuck_fee(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.booking_fees set failed_runs = 0, claimed_at = now() - interval '1 hour', reruns = reruns + 1
  where id = target and status = 'charging' and failed_runs >= 5
$$;

-- A cancellation's refund is done once recorded, even when nothing was left to refund (refund_done, no refund id).
drop function public.set_cancel_refund(uuid, text, integer);

create function public.set_cancel_refund(target uuid, refund_id text, refunded integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bookings
  set cancellation = cancellation
    || jsonb_build_object('refund_id', refund_id, 'refunded_pence', refunded, 'refund_done', true)
  where id = target and status = 'cancelled' and cancellation ->> 'refund_id' is null
    and not coalesce((cancellation ->> 'refund_done')::boolean, false)
$$;

create or replace function public.is_refund_unfinished(booking public.bookings, who text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select booking.status = 'cancelled' and booking.cancelled_by = who
    and booking.cancellation ->> 'refund_id' is null
    and not coalesce((booking.cancellation ->> 'refund_done')::boolean, false)
    and coalesce((booking.cancellation ->> 'refund_now_pence')::integer, 0) > 0
$$;

-- unfinished refunds that haven't failed five times, an hour longer after each failure, the least-tried first so one
-- bad refund can't block the rest
create or replace function public.get_unfinished_refunds(batch_size integer)
returns table (booking_id uuid, payment_intent_id text, amount_pence integer, cancelled_by text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, stripe_payment_intent_id, (cancellation ->> 'refund_now_pence')::integer, cancelled_by
  from public.bookings
  where status = 'cancelled' and cancellation ->> 'refund_id' is null
    and not coalesce((cancellation ->> 'refund_done')::boolean, false)
    and coalesce((cancellation ->> 'refund_now_pence')::integer, 0) > 0
    and coalesce((cancellation ->> 'refund_failures')::integer, 0) < 5
    and coalesce((cancellation ->> 'refund_failed_at')::timestamptz, '-infinity')
      < now() - interval '1 hour' * coalesce((cancellation ->> 'refund_failures')::integer, 0)
    and cancelled_at < now() - interval '5 minutes'
  order by coalesce((cancellation ->> 'refund_failures')::integer, 0), cancelled_at
  limit batch_size
$$;

create function public.note_refund_failure(target uuid, message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  failures integer;
begin
  update public.bookings
  set cancellation = cancellation
    || jsonb_build_object(
      'refund_failures', coalesce((cancellation ->> 'refund_failures')::integer, 0) + 1,
      'refund_failed_at', now()
    )
  where id = target
  returning (cancellation ->> 'refund_failures')::integer into failures;

  if failures = 5 then
    insert into public.booking_events (booking_id, kind, data)
    values (target, 'refund_stuck', jsonb_build_object('error', message));
  end if;
end;
$$;

-- fee transfers that haven't failed five times, an hour longer after each failure, the least-tried first
drop function public.claim_pending_transfers(integer);

create function public.claim_pending_transfers(batch_size integer)
returns table (
  payment_id uuid, payment_intent_id text, amount_pence integer, stylist_account text, transfer_failures smallint
)
language sql
security definer
set search_path = ''
as $$
  select payments.id, payments.stripe_payment_intent_id, payments.amount_pence, stylists.stripe_account_id,
    payments.transfer_failures
  from public.payments
  join public.bookings on bookings.id = payments.booking_id
  join public.stylists on stylists.id = bookings.stylist_id
  where payments.transfer_pending and payments.stripe_payment_intent_id is not null
    and stylists.charges_enabled and stylists.stripe_account_id is not null
    and payments.transfer_failures < 5
    and coalesce(payments.transfer_failed_at, '-infinity') < now() - interval '1 hour' * payments.transfer_failures
  order by payments.transfer_failures, payments.created_at
  limit batch_size
$$;

create function public.note_transfer_failure(payment uuid, message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  paid public.payments;
begin
  update public.payments set transfer_failures = transfer_failures + 1, transfer_failed_at = now()
  where id = payment
  returning * into paid;

  if paid.transfer_failures = 5 then
    insert into public.booking_events (booking_id, kind, data)
    values (paid.booking_id, 'transfer_stuck', jsonb_build_object('payment_id', payment, 'error', message));
  end if;
end;
$$;

-- every hour while a fee is waiting for an account that can now receive it (and is due a try)
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
    and exists (select 1 from public.claim_pending_transfers(1))
  $$
);

/** For us, from the SQL editor: try a stuck refund or transfer again once whatever broke it is fixed. */
create function public.retry_stuck_refund(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bookings
  set cancellation = cancellation || jsonb_build_object('refund_failures', 0, 'refund_failed_at', null)
  where id = target and cancellation ->> 'refund_id' is null
$$;

create function public.retry_stuck_transfer(payment uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments set transfer_failures = 0, transfer_failed_at = null where id = payment
$$;

revoke execute on function
  public.set_cancel_refund(uuid, text, integer),
  public.note_refund_failure(uuid, text),
  public.claim_pending_transfers(integer),
  public.note_transfer_failure(uuid, text),
  public.retry_stuck_refund(uuid),
  public.retry_stuck_transfer(uuid)
  from public, anon, authenticated;

grant execute on function
  public.set_cancel_refund(uuid, text, integer),
  public.note_refund_failure(uuid, text),
  public.claim_pending_transfers(integer),
  public.note_transfer_failure(uuid, text),
  public.retry_stuck_refund(uuid),
  public.retry_stuck_transfer(uuid)
  to service_role;
