begin;
select plan(36);

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
        'contact_email', 'links@links.test'
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

select pg_temp.sign_up('d1111111-1111-1111-1111-111111111111', 'owner@money.test', 'Money Test');
select pg_temp.sign_up('d2222222-2222-2222-2222-222222222222', 'other@money.test', 'Other Money');

-- A £100 booking paid under `terms`, starting `starts_in` from now; paid_at is set after insert, as checkout does.
create function pg_temp.book(starts_in interval, terms jsonb)
returns uuid
language plpgsql
as $$
declare
  booking_id uuid;
  deposit integer := coalesce((terms ->> 'deposit_pence')::integer, 0);
  paid integer := case terms ->> 'mode' when 'full' then 10000 when 'deposit' then deposit else 0 end + 163;
begin
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
    ends_at, block_ends_at, status, contact, terms, due_today_pence, stripe_payment_intent_id, stripe_customer_id)
  select stylists.id, services.id, '{}', '{"service_name": "Silk press"}', 10000, 163, 10,
    now() + starts_in, now() + starts_in + interval '10 minutes', now() + starts_in + interval '10 minutes', 'held',
    '{"first": "Nia", "last": "Okafor", "email": "nia@money.test", "phone": "07700900123"}',
    jsonb_build_object('grace_minutes', 0, 'free_cancel_until', now() + starts_in - interval '48 hours') || terms,
    paid, 'pi_' || gen_random_uuid(), 'cus_test'
  from public.stylists
  join public.services on services.stylist_id = stylists.id
  where stylists.slug = 'links-test'
  order by services.sort
  limit 1
  returning id into booking_id;

  update public.bookings set status = 'confirmed', paid_at = now() where id = booking_id;

  return booking_id;
end;
$$;

create function pg_temp.fee(target uuid)
returns text
language sql
as $$
  select concat_ws(' ', kind, status, 'fee', amount_pence, 'kept', kept_pence, 'refund', refund_pence, 'charge', charge_pence)
  from public.booking_fees where booking_id = target order by created_at desc limit 1
$$;


select pg_temp.sign_up('e1111111-1111-1111-1111-111111111111', 'owner@links.test', 'Links Test');

create temp table b as
select
  pg_temp.book(interval '-1 hour', '{"mode": "card", "no_show_on": true, "no_show_kind": "pct", "no_show_percent": 50}') as card,
  pg_temp.book(interval '-2 hours', '{"mode": "card", "no_show_on": true, "no_show_kind": "pct", "no_show_percent": 50}') as waived,
  pg_temp.book(interval '-3 hours', '{"mode": "card", "no_show_on": true, "no_show_kind": "pct", "no_show_percent": 50}') as raced;

grant select on b to authenticated;

create function pg_temp.decline(target uuid)
returns void
language plpgsql
as $$
begin
  update public.booking_fees set charge_after = now() - interval '1 minute' where booking_id = target;
  perform public.claim_due_fees(50);
  perform public.finish_fee_settlement(
    (select id from public.booking_fees where booking_id = target),
    '{"outcome": "unpaid", "refunded_pence": 0, "decline_message": "Declined", "card_label": "Visa •••• 4242"}'
  );
end;
$$;

-- the booking's emailed link that still opens (each resend replaces the one before)
create function pg_temp.token(target uuid)
returns text
language sql
as $$
  select token from (
    select split_part(payload ->> 'pay_url', 'token=', 2) as token from public.notifications
    where template = 'fee_declined' and payload ->> 'ref' = (select ref from public.bookings where id = target)
  ) as sent
  where public.get_payment_link(token) is not null
  limit 1
$$;

select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select public.mark_no_show((select card from b), true);
select public.mark_no_show((select waived from b), true);
select public.mark_no_show((select raced from b), true);
reset role;

insert into public.notification_preferences (stylist_id, event, email, sms)
values ((select stylist_id from public.bookings where id = (select card from b)), 'fee_failed', true, false);

select pg_temp.decline((select card from b));
select pg_temp.decline((select waived from b));
update public.notification_preferences set email = false where event = 'fee_failed'
  and stylist_id = (select stylist_id from public.bookings where id = (select card from b));
select pg_temp.decline((select raced from b));

select is(
  (select concat_ws(' ', status, amount_pence, sent_count) from public.payment_links where booking_id = (select card from b)),
  'pending 5000 1', 'a declined fee gets a payment link for what is left'
);
select is(
  (select count(*)::int from public.notifications
  where template in ('fee_declined', 'fee_failed') and payload ->> 'ref' = (select ref from public.bookings where id = (select card from b))),
  2, 'the client gets the link and the stylist is told'
);

select is(
  (select array_agg(bookings.id = (select waived from b)) from public.notifications
  join public.bookings on bookings.ref = notifications.payload ->> 'ref'
  where template = 'fee_failed' and bookings.id in ((select waived from b), (select raced from b))),
  array[true], 'the stylist is emailed only while their "Fee failed" emails are on'
);

select is(public.get_payment_link(pg_temp.token((select card from b))) ->> 'amount_pence', '5000', 'the link opens the fee');
select is(public.get_payment_link('nope'), null, 'an unknown link opens nothing');

update public.booking_fees set status = 'charging' where booking_id = (select card from b);
select public.finish_fee_settlement(
  (select id from public.booking_fees where booking_id = (select card from b)),
  '{"outcome": "unpaid", "refunded_pence": 0}'
);
select is((select count(*)::int from public.payment_links where booking_id = (select card from b)), 1,
  'a retry declined again keeps the same link');

select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select public.resend_payment_link((select card from b));
select public.resend_payment_link((select card from b));
select throws_ok(format('select public.resend_payment_link(%L)', (select card from b)), 'resend_not_allowed',
  'the link can be resent twice');
reset role;

select is(
  (select count(*)::int from public.notifications
  where template = 'fee_declined' and payload ->> 'ref' = (select ref from public.bookings where id = (select card from b))
    and public.get_payment_link(split_part(payload ->> 'pay_url', 'token=', 2)) is not null),
  1, 'only the newest link works'
);
select is(
  (select count(*)::int from public.notifications
  where template = 'fee_declined' and payload ->> 'ref' = (select ref from public.bookings where id = (select card from b))),
  3, 'each resend emails a fresh link'
);

select is(
  public.has_unpaid_fee((select stylist_id from public.bookings where id = (select card from b)),
    '{"email": "NIA@money.test", "phone": ""}', null),
  true, 'an unpaid fee is found by email'
);
select is(
  public.has_unpaid_fee((select stylist_id from public.bookings where id = (select card from b)),
    '{"email": "someone@else.test", "phone": ""}', null),
  false, 'and an empty phone matches no one'
);

select is(public.start_link_payment(pg_temp.token((select card from b))) ->> 'amount_pence', '5000', 'paying starts');
select public.set_link_intent(
  (select id from public.payment_links where booking_id = (select card from b)), 'pi_link_card'
);
select is(public.confirm_link_payment('pi_link_card', true, null), 'paid', 'the payment goes through');
select is(
  (select concat_ws(' ', fees.status, payments.amount_pence, payments.transfer_pending)
  from public.booking_fees as fees join public.payments on payments.fee_id = fees.id
  where fees.booking_id = (select card from b)),
  'paid 5000 t', 'the fee is paid and recorded'
);
select throws_ok(format('select public.start_link_payment(%L)', pg_temp.token((select card from b))), 'link_paid',
  'a paid link cannot be paid again');
select is(
  public.confirm_link_payment('pi_link_card_again', true, (select id from public.payment_links where booking_id = (select card from b))),
  'refund', 'a second payment of a paid link is refunded'
);

select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select public.waive_fee((select waived from b));
reset role;
select is((select status from public.payment_links where booking_id = (select waived from b)), 'cancelled',
  'waiving cancels the link');

select public.set_link_intent((select id from public.payment_links where booking_id = (select raced from b)), 'pi_link_old');
select public.set_link_intent((select id from public.payment_links where booking_id = (select raced from b)), 'pi_link_raced');
select is((select stripe_payment_intent_id from public.payment_links where booking_id = (select raced from b)), 'pi_link_raced',
  'a replaced payment is saved on the link');
update public.booking_fees set status = 'paid_offline' where booking_id = (select raced from b);
select is(public.confirm_link_payment('pi_link_raced', false, null), 'refund', 'paid another way meanwhile: refund the link payment');

update public.booking_fees set status = 'unpaid' where booking_id = (select raced from b);
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select lives_ok(format('select public.resend_payment_link(%L)', (select raced from b)),
  'a link cancelled while the fee was busy can be resent once it''s unpaid again');
reset role;

update public.payment_links set expires_at = now() - interval '1 minute'
where booking_id = (select raced from b);
select public.expire_payment_links();
select throws_ok(
  format('select public.start_link_payment(%L)', (
    select split_part(payload ->> 'pay_url', 'token=', 2) from public.notifications
    where template = 'fee_declined' and payload ->> 'ref' = (select ref from public.bookings where id = (select waived from b))
  )),
  'link_not_valid', 'a cancelled link cannot be paid'
);

select public.record_stripe_refund('pi_link_card', 're_dash', 1000);
select public.record_stripe_refund('pi_link_card', 're_dash', 1000);
select is((select count(*)::int from public.refunds where stripe_refund_id = 're_dash'), 1, 'a Stripe refund is recorded once');

select public.record_dispute('{"id": "dp_1", "payment_intent": "pi_link_card", "amount": 5000, "reason": "fraudulent", "status": "needs_response"}');
select public.record_dispute('{"id": "dp_1", "payment_intent": "pi_link_card", "amount": 5000, "reason": "fraudulent", "status": "won"}');
select is((select status from public.disputes where stripe_dispute_id = 'dp_1'), 'won', 'a dispute is kept up to date');
select is((select count(*)::int from public.notifications where template = 'dispute_opened' and to_address = 'owner@links.test'),
  1, 'the stylist hears about it once');

update public.stylists set charges_enabled = true, stripe_account_id = 'acct_links'
where id = (select stylist_id from public.bookings where id = (select card from b));
select is(
  (select count(*)::int from public.claim_pending_transfers(50) where stylist_account = 'acct_links'),
  1, 'a fee waiting for the account is sent once it can receive'
);
select public.note_transfer_failure((select id from public.payments where stripe_payment_intent_id = 'pi_link_card'), 'boom');
select is(
  (select count(*)::int from public.claim_pending_transfers(50) where stylist_account = 'acct_links'),
  0, 'a failed transfer waits before its next try'
);
select public.note_transfer_failure((select id from public.payments where stripe_payment_intent_id = 'pi_link_card'), 'boom')
from generate_series(1, 4);
update public.payments set transfer_failed_at = now() - interval '13 hours' where stripe_payment_intent_id = 'pi_link_card';
select is(
  (select count(*)::int from public.claim_pending_transfers(50) where stylist_account = 'acct_links'),
  0, 'a transfer that failed five times stops holding up the rest'
);
select is(
  (select count(*)::int from public.booking_events where kind = 'transfer_stuck' and data ->> 'error' = 'boom'),
  1, 'and is flagged for us'
);
select public.retry_stuck_transfer((select id from public.payments where stripe_payment_intent_id = 'pi_link_card'));
select public.mark_transfer_sent((select id from public.payments where stripe_payment_intent_id = 'pi_link_card'), 'tr_1');
select is((select count(*)::int from public.claim_pending_transfers(50) where stylist_account = 'acct_links'), 0, 'and only once');

select is(
  (select bool_and(payload ? 'pay_url') from public.notifications
  where template = 'fee_declined' and payload ->> 'ref' = (select ref from public.bookings where id = (select card from b))),
  true, 'an unsent email keeps its link'
);
update public.notifications set status = 'sent'
where template = 'fee_declined' and payload ->> 'ref' = (select ref from public.bookings where id = (select card from b));
select is(
  (select bool_or(payload ? 'pay_url') from public.notifications
  where template = 'fee_declined' and payload ->> 'ref' = (select ref from public.bookings where id = (select card from b))),
  false, 'a sent one does not'
);

update public.bookings set status = 'held', hold_expires_at = now() + interval '10 minutes',
  hold_secret_hash = sha256(convert_to('secret', 'UTF8'))
where id = (select waived from b);
select public.release_hold((select waived from b), 'wrong');
select is((select status from public.bookings where id = (select waived from b)), 'held', 'a hold needs its secret to be released');
select public.release_hold((select waived from b), 'secret');
select is((select status from public.bookings where id = (select waived from b)), 'expired', 'a turned-away client''s hold is released');

select is(
  (select count(*)::int from public.get_refund_sources((select card from b), 'e1111111-1111-1111-1111-111111111111')
  where stylist_share_pence > 0),
  1, 'a Studio refund can only come from the stylist''s share (the fee charge), not the booking fee payment'
);

update public.booking_fees set status = 'pending', charge_after = now() - interval '1 minute', failed_runs = 5
where booking_id = (select waived from b);
select is(
  (select count(*)::int from public.claim_due_fees(50) as claimed where (claimed ->> 'booking_id')::uuid = (select waived from b)),
  0, 'a settlement that failed five times is left alone'
);

update public.booking_fees set status = 'charging' where booking_id = (select waived from b);
select public.retry_stuck_fee((select id from public.booking_fees where booking_id = (select waived from b)));
select is(
  (select concat_ws(' ', status, failed_runs) from public.booking_fees where booking_id = (select waived from b)),
  'charging 0', 'once fixed, we can send a stuck settlement round again'
);

select * from finish();
rollback;
