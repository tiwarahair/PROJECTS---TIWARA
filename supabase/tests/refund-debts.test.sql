begin;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('f2111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@refund-debts.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object(
      'business_name', 'Refund Debts Test', 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
      'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@refund-debts.test'
    )
  ), '{}');

update public.stylists set stripe_account_id = 'acct_refund_debts' where slug = 'refund-debts-test';

-- a held deposit sent on to the stylist, then refunded in full
insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
  ends_at, block_ends_at, status, contact, terms, due_today_pence, stripe_payment_intent_id, stripe_customer_id)
select stylists.id, services.id, '{}', '{"service_name": "Silk press"}', 10000, 200, 60, now() + interval '4 months',
  now() + interval '4 months 1 hour', now() + interval '4 months 1 hour', 'completed',
  '{"first": "Nia", "email": "nia@refund-debts.test"}', '{"mode": "deposit"}', 2700, 'pi_refund_debts', 'cus_test'
from public.stylists
join lateral (select id from public.services where stylist_id = stylists.id order by sort limit 1) services on true
where stylists.slug = 'refund-debts-test';

create temp table target as
select bookings.id as booking from public.bookings where stripe_payment_intent_id = 'pi_refund_debts';

select public.save_refund_debt('re_refund_debts', (select booking from target), 258);
select public.save_refund_debt('re_refund_debts', (select booking from target), 258);
select public.save_refund_debt('re_nothing_owed', (select booking from target), 0);

select is(
  (select count(*)::integer from public.stylist_debts where booking_id = (select booking from target)),
  1, 'a refund is owed once, however often it''s saved, and nothing is saved when nothing is owed');

select is(
  (select stylist_debts.stylist_id from public.stylist_debts where stripe_refund_id = 're_refund_debts'),
  (select stylists.id from public.stylists where slug = 'refund-debts-test'),
  'the debt belongs to the booking''s stylist');

select is(public.get_owed_pence('acct_refund_debts'), 258, 'it counts towards what the stylist owes');

select is(public.apply_recovery('acct_refund_debts', 'pi_next_payment', 1000), 742,
  'their next card payment pays it off like a dispute fee, and what it took over that goes back');

select is(
  (select recovered_pence from public.stylist_debts where stripe_refund_id = 're_refund_debts'),
  258, 'and it''s marked recovered');

select throws_ok(
  $$insert into public.stylist_debts (stylist_id, amount_pence)
    select id, 100 from public.stylists where slug = 'refund-debts-test'$$,
  '23514', null, 'a debt comes from a dispute or a refund');

set local role authenticated;

select throws_ok(
  $$select public.save_refund_debt('re_signed_in', gen_random_uuid(), 100)$$,
  '42501', null, 'signed-in users can''t record debts');

reset role;

select * from finish();
rollback;
