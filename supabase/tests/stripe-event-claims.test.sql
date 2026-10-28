begin;
select plan(6);

select ok(public.claim_stripe_event('evt_claims_1', 'payment_intent.succeeded'), 'the first delivery claims the event');

select ok(not coalesce(public.claim_stripe_event('evt_claims_1', 'payment_intent.succeeded'), false),
  'a second delivery at the same time doesn''t');

select public.finish_stripe_event('evt_claims_1', false);

select ok(public.claim_stripe_event('evt_claims_1', 'payment_intent.succeeded'),
  'after a failure, Stripe''s next delivery handles it');

select public.finish_stripe_event('evt_claims_1', true);

select ok(not coalesce(public.claim_stripe_event('evt_claims_1', 'payment_intent.succeeded'), false),
  'once handled, it''s never handled again');

select public.claim_stripe_event('evt_claims_2', 'refund.created');
update public.stripe_events set received_at = now() - interval '11 minutes' where id = 'evt_claims_2';

select ok(public.claim_stripe_event('evt_claims_2', 'refund.created'), 'a claim a crashed run left is taken again');

insert into public.stripe_events (id, type) values ('evt_claims_3', 'payout.paid');

select ok(not coalesce(public.claim_stripe_event('evt_claims_3', 'payout.paid'), false),
  'an event recorded before claims existed counts as handled');

select * from finish();
rollback;
