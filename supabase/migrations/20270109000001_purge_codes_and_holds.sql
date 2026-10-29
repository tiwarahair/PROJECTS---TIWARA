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

  if booking.status = 'awaiting_confirmation' then
    return jsonb_build_object(
      'is_late', false, 'fee_pence', 0, 'refund_pence', 0, 'kept_pence', 0, 'charge_pence', 0,
      'id', booking.id, 'payment_intent_id', booking.stripe_payment_intent_id
    );
  end if;

  -- only money taken through Stripe can go back
  paid := case
    when booking.paid_at is null or booking.stripe_payment_intent_id is null then 0
    else coalesce(booking.due_today_pence, 0)
  end;

  if who = 'stylist' then
    terms := jsonb_build_object(
      'is_late', false, 'fee_pence', 0, 'refund_pence', paid, 'kept_pence', 0, 'charge_pence', 0
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
