begin;
select plan(10);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('f1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@hold.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object(
      'business_name', 'Hold Test', 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
      'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@hold.test'
    )
  ), '{}');

update public.stylists set stripe_account_id = 'acct_hold_test', charges_enabled = true where slug = 'hold-test';

create temp table hold as
select stylists.id as stylist, services.id as service
from public.stylists
join lateral (select id from public.services where stylist_id = stylists.id order by sort limit 1) services on true
where stylists.slug = 'hold-test';

create function pg_temp.book(starts timestamptz, booking_status text)
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
    ends_at, block_ends_at, status, contact, terms, created_by, overlap_ok)
  select stylist, service, '{}', '{"service_name": "Silk press"}', 5000, 163, 60, starts, starts + interval '1 hour',
    starts + interval '1 hour', booking_status, '{"first": "Ada"}', '{"mode": "deposit"}', 'stylist', true
  from hold
  returning id
$$;

-- a card payment charged without a transfer, as for a new stylist
create function pg_temp.pay(target uuid, intent text)
returns uuid
language sql
as $$
  insert into public.payments (booking_id, kind, amount_pence, platform_fee_pence, stripe_payment_intent_id)
  values (target, 'booking', 1163, 163, intent)
  returning id
$$;

create function pg_temp.claimed()
returns text[]
language sql
as $$
  select coalesce(array_agg(payment_intent_id order by payment_intent_id), '{}')
  from public.claim_pending_transfers(50)
  where payment_intent_id like 'pi_hold_%'
$$;

select ok(public.is_payout_held((select stylist from hold)), 'a stylist starts out new');

create temp table ids as
select
  pg_temp.book(now() + interval '3 days', 'confirmed') as upcoming,
  pg_temp.book(now() - interval '2 days', 'completed') as finished,
  pg_temp.book(now() - interval '3 hours', 'completed') as just_finished;

grant select on hold, ids to authenticated;

select pg_temp.pay(upcoming, 'pi_hold_upcoming'), pg_temp.pay(finished, 'pi_hold_finished'),
  pg_temp.pay(just_finished, 'pi_hold_just') from ids;

update public.bookings set completed_at = now() - interval '2 days' where id = (select finished from ids);
update public.bookings set completed_at = now() - interval '2 hours' where id = (select just_finished from ids);

select public.mark_payment_untransferred('pi_hold_upcoming');
select public.mark_payment_untransferred('pi_hold_finished');
select public.mark_payment_untransferred('pi_hold_just');

select ok((select bool_and(held and transfer_pending) from public.payments where stripe_payment_intent_id like 'pi_hold_%'),
  'a new stylist''s payments are held and wait to be sent');

insert into public.payments (booking_id, kind, amount_pence, stripe_payment_intent_id)
select finished, 'fee', 1000, 'pi_fee_not_held' from ids;

select is((select held from public.payments where stripe_payment_intent_id = 'pi_fee_not_held'), false,
  'a late-cancel or no-show fee isn''t held: it''s charged after the waiver window');

select is(pg_temp.claimed(), array['pi_hold_finished'],
  'only money for an appointment that finished over a day ago is sent');

insert into public.booking_fees (booking_id, kind, amount_pence, kept_pence, refund_pence, charge_pence, status, charge_after)
select finished, 'no_show', 1000, 0, 0, 1000, 'pending', now() + interval '1 day' from ids;

select is(pg_temp.claimed(), '{}'::text[], 'not while a fee on it is still to be settled');

update public.payments set created_at = now() - interval '86 days' where stripe_payment_intent_id = 'pi_hold_upcoming';

select is(pg_temp.claimed(), array['pi_hold_upcoming'], 'and everything goes by day 85');

update public.payments set transfer_pending = false, stripe_transfer_id = 'tr_x'
where stripe_payment_intent_id = 'pi_hold_upcoming';

select public.mark_payment_untransferred('pi_hold_upcoming');

select is((select transfer_pending from public.payments where stripe_payment_intent_id = 'pi_hold_upcoming'), false,
  'money already sent is never queued again');

select set_config('request.jwt.claims',
  json_build_object('sub', 'f1111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  (select status from public.get_stylist_ledger((select stylist from hold))
    where booking_id = (select just_finished from ids) and description = 'Deposit'),
  'On hold', 'Earnings shows held money as on hold');

reset role;

-- five completed bookings paid by card later, the stylist's money is no longer held
select pg_temp.pay(pg_temp.book(now() - interval '5 days', 'completed'), 'pi_done_' || step)
from generate_series(1, 3) as step;

select ok(not public.is_payout_held((select stylist from hold)), 'five completed card bookings and they''re established');

select ok(public.is_payout_held((select stylist from hold), (select finished from ids)),
  'the booking being paid doesn''t count towards its own five');

select * from finish();
rollback;
