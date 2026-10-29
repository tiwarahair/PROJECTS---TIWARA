begin;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('d1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@disputes.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object(
      'business_name', 'Disputes Test', 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
      'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'disputes@disputes.test'
    )
  ), '{}');

update public.stylists set stripe_account_id = 'acct_disputes' where slug = 'disputes-test';

-- two past bookings paid online, each disputed by the client
insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
  ends_at, block_ends_at, status, contact, terms, due_today_pence, stripe_payment_intent_id, stripe_customer_id)
select stylists.id, services.id, '{}', '{"service_name": "Silk press"}', 10000, 163, 10,
  now() - interval '3 days' + made.n * interval '1 hour', now() - interval '3 days' + made.n * interval '1 hour' + interval '10 minutes',
  now() - interval '3 days' + made.n * interval '1 hour' + interval '10 minutes', 'completed',
  '{"first": "Nia", "last": "Okafor", "email": "nia@disputes.test"}', '{"mode": "full"}', 10163,
  'pi_disputed_' || made.n, 'cus_test'
from public.stylists
join lateral (select id from public.services where stylist_id = stylists.id order by sort limit 1) services on true
cross join generate_series(1, 2) as made (n)
where stylists.slug = 'disputes-test';

create function pg_temp.dispute(n integer)
returns jsonb
language sql
as $$
  select public.record_dispute(jsonb_build_object(
    'id', 'du_disputes_' || n, 'payment_intent', 'pi_disputed_' || n, 'charge', 'ch_disputes_' || n,
    'amount', 10163, 'reason', 'fraudulent', 'status', 'needs_response'
  ))
$$;

select pg_temp.dispute(1);
select pg_temp.dispute(1);

update public.bookings
set policy_accepted_at = '2026-10-20 14:30+00', terms = terms || '{"agreement": "By booking, you agree"}'
where stripe_payment_intent_id = 'pi_disputed_1';

select is(
  (select jsonb_build_object('accepted_at', (facts ->> 'policy_accepted_at')::timestamptz, 'agreement', facts #>> '{terms,agreement}')
    from (
      select public.get_dispute_evidence(id, 'd1111111-1111-1111-1111-111111111111') as facts
      from public.disputes where stripe_dispute_id = 'du_disputes_1'
    ) as evidence),
  jsonb_build_object('accepted_at', '2026-10-20 14:30+00'::timestamptz, 'agreement', 'By booking, you agree'),
  'the dispute evidence has when the client accepted the policy and the line they saw'
);

select is(
  (select count(*)::integer from public.notifications where template = 'dispute_opened'
    and to_address = 'owner@disputes.test'),
  1, 'the stylist is emailed once, however many events the dispute sends');

select is(pg_temp.dispute(1) ->> 'stylist_account', 'acct_disputes',
  'a dispute that arrives before its payment is recorded still finds the stylist from the booking');

select public.save_dispute_fees((pg_temp.dispute(1) ->> 'id')::uuid, 2000);
select public.save_dispute_fees((pg_temp.dispute(2) ->> 'id')::uuid, 2000);
update public.stylist_debts set created_at = now() - interval '1 day'
where dispute_id = (select id from public.disputes where stripe_dispute_id = 'du_disputes_1');

select is(public.apply_recovery('acct_disputes', 'pi_next', 2500), 0, 'a payment can recover up to all that''s owed');

select is(
  (select array_agg(stylist_debts.recovered_pence order by stylist_debts.created_at) from public.stylist_debts
    join public.stylists on stylists.id = stylist_debts.stylist_id where stylists.slug = 'disputes-test'),
  array[2000, 500], 'the oldest debt is paid off first');

select is(public.apply_recovery('acct_disputes', 'pi_next', 2500), 0,
  'the same payment settled twice takes nothing more');

select is(public.apply_recovery('acct_elsewhere', 'pi_elsewhere', 500), 0,
  'a payment from another environment sharing the Stripe sandbox sends nothing back');

select set_config('request.jwt.claims',
  json_build_object('sub', 'd1111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

select throws_ok('select public.close_business()', 'has_dispute',
  'a business with an open dispute can''t be closed');

reset role;

update public.disputes set status = 'lost' where stripe_dispute_id like 'du_disputes_%';

set local role authenticated;

select throws_ok('select public.close_business()', 'has_debt',
  'nor while it owes dispute fees');

reset role;

select * from finish();
rollback;
