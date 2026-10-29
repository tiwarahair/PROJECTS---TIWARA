create or replace function public.purge_expired_booking_tokens()
returns integer
language sql
security definer
set search_path = ''
as $$
  with purged_tokens as (
    delete from public.booking_tokens where expires_at < now() - interval '30 days'
    returning 1
  ),
  purged_codes as (
    delete from public.booking_codes where expires_at < now() - interval '1 day'
    returning 1
  ),
  purged_account_codes as (
    delete from public.account_codes where created_at < now() - interval '1 day'
    returning 1
  ),
  purged_holds as (
    delete from public.bookings
    where status in ('held', 'expired')
      and hold_expires_at < now() - interval '1 day'
      and stripe_payment_intent_id is null
      and not exists (select 1 from public.payments where booking_id = bookings.id)
      and not exists (select 1 from public.refunds where booking_id = bookings.id)
      and not exists (select 1 from public.booking_fees where booking_id = bookings.id)
      and not exists (select 1 from public.disputes where booking_id = bookings.id)
    returning 1
  )
  select (
    (select count(*) from purged_tokens) + (select count(*) from purged_codes)
    + (select count(*) from purged_account_codes) + (select count(*) from purged_holds)
  )::integer
$$;
