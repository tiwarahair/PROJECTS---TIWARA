begin;
select plan(10);

create function pg_temp.sign_up(user_id uuid, user_email text, business text)
returns void
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', user_email,
    jsonb_build_object(
      'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
      'terms_version', '2026-10',
      'stylist', jsonb_build_object(
        'business_name', business, 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
        'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
        'contact_email', 'earnings@earnings.test'
      )
    ), '{}')
$$;

create function pg_temp.act_as(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.sign_up('e5111111-1111-1111-1111-111111111111', 'owner@earnings.test', 'Earnings Test');
select pg_temp.sign_up('e5222222-2222-2222-2222-222222222222', 'other@earnings.test', 'Other Earnings');

update public.stylists set stripe_account_id = 'acct_earnings' where slug = 'earnings-test';

-- a £100 booking with a £30 deposit paid online (plus the £1.63 booking fee), finished yesterday
create temp table b as
with made as (
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
    ends_at, block_ends_at, status, contact, terms, due_today_pence, stripe_payment_intent_id, stripe_customer_id)
  select stylists.id, services.id, '{}', '{"service_name": "Silk press"}', 10000, 163, 10,
    now() - interval '1 day', now() - interval '1 day' + interval '10 minutes',
    now() - interval '1 day' + interval '10 minutes', 'held',
    '{"first": "Nia", "last": "Okafor", "email": "nia@earnings.test"}', '{"mode": "deposit", "deposit_pence": 3000}',
    3163, 'pi_earnings_deposit', 'cus_test'
  from public.stylists
  join public.services on services.stylist_id = stylists.id
  where stylists.slug = 'earnings-test'
  order by services.sort
  limit 1
  returning id
)
select id from made;

grant select on b to authenticated;

update public.bookings set status = 'completed', paid_at = now() where id = (select id from b);

create function pg_temp.line(target text)
returns text
language sql
as $$
  select concat_ws(' ', description, method, amount_pence, card_fee_pence, status)
  from public.get_stylist_ledger((select id from public.stylists where slug = 'earnings-test'))
  where id like target
$$;

select pg_temp.act_as('e5111111-1111-1111-1111-111111111111');
select is(pg_temp.line((select id::text from public.payments where booking_id = (select id from b))),
  'Deposit Card online 3000 65 Pending', 'the stylist''s part of a deposit, with their card fee, waits in Stripe');
reset role;

select public.save_card_payment('pi_earnings_deposit', 'py_earnings', now() - interval '1 hour');
select public.save_payout('acct_earnings',
  '{"id": "po_earnings", "amount": 2935, "status": "paid", "arrival_date": 1793000000, "created": 1792900000}');
select pg_temp.act_as('e5111111-1111-1111-1111-111111111111');
select is(pg_temp.line((select id::text from public.payments where booking_id = (select id from b))),
  'Deposit Card online 3000 65 Available', 'available once Stripe says so');
reset role;

select public.link_payout('po_earnings', array['pi_earnings_deposit'], '{}');
select pg_temp.act_as('e5111111-1111-1111-1111-111111111111');
select is(pg_temp.line((select id::text from public.payments where booking_id = (select id from b))),
  'Deposit Card online 3000 65 Paid out', 'and paid out once a payout includes it');
reset role;

select is(
  (select count(*)::int from public.notifications where template = 'payout_paid' and to_address = 'owner@earnings.test'),
  1, 'the stylist is told about a paid payout'
);
select public.save_payout('acct_earnings',
  '{"id": "po_earnings", "amount": 2935, "status": "paid", "arrival_date": 1793000000, "created": 1792900000}');
select is(
  (select count(*)::int from public.notifications where template = 'payout_paid' and to_address = 'owner@earnings.test'),
  1, 'once'
);
select public.save_payout('acct_earnings',
  '{"id": "po_earnings", "amount": 2935, "status": "failed", "arrival_date": 1793000000, "created": 1792900000}');
select pg_temp.act_as('e5111111-1111-1111-1111-111111111111');
select is(pg_temp.line((select id::text from public.payments where booking_id = (select id from b))),
  'Deposit Card online 3000 65 Available', 'a payout that then fails puts it back as available');
reset role;

-- the stylist cancelled after all: the client gets everything back, and the booking fee is theirs to cover
insert into public.refunds (booking_id, amount_pence, reason, stripe_refund_id)
values ((select id from b), 3163, 'stylist_cancel', 're_earnings');
select pg_temp.act_as('e5111111-1111-1111-1111-111111111111');
select is(
  (select string_agg(concat_ws(' ', description, amount_pence), ', ' order by description)
    from public.get_stylist_ledger((select id from public.stylists where slug = 'earnings-test'))
    where id like (select id::text || '%' from public.refunds where stripe_refund_id = 're_earnings')),
  'Adjustment -163, Refund -3000', 'a stylist''s cancellation shows the refund and the booking fee it cost them'
);

-- money given back by hand: never more than was paid outside the app
reset role;
insert into public.payments (booking_id, kind, method, amount_pence) values ((select id from b), 'balance', 'cash', 7000);
select pg_temp.act_as('e5111111-1111-1111-1111-111111111111');
select throws_ok(format('select public.record_refund(%L, 7001, %L)', (select id from b), 'Goodwill'),
  'more_than_refundable', 'a recorded refund can''t be more than was recorded');
select public.record_refund((select id from b), 500, 'Goodwill');
select is(
  (select concat_ws(' ', description, method, amount_pence, status)
    from public.get_stylist_ledger((select id from public.stylists where slug = 'earnings-test'))
    where description = 'Refund' and method = 'Cash'),
  'Refund Cash -500 Recorded', 'and shows as recorded'
);

select pg_temp.act_as('e5222222-2222-2222-2222-222222222222');
select is(
  (select count(*)::int from public.get_stylist_ledger((select id from public.stylists where slug = 'earnings-test'))),
  0, 'another stylist sees none of it'
);
reset role;

select * from finish();
rollback;
