begin;
select plan(69);

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
        'contact_email', 'checkout@checkout.test'
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

select pg_temp.sign_up('c5111111-1111-1111-1111-111111111111', 'owner@checkout.test', 'Checkout Test');
select pg_temp.sign_up('c5222222-2222-2222-2222-222222222222', 'other@checkout.test', 'Other Checkout');

-- A £100 booking paid under `terms`, starting `starts_in` from now, with a saved card unless the mode is none or full.
create function pg_temp.book(starts_in interval, terms jsonb, email text default 'nia@checkout.test')
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
    jsonb_build_object('first', 'Nia', 'last', 'Okafor', 'email', email, 'phone', '07700900123'),
    jsonb_build_object('grace_minutes', 0) || terms, paid, 'pi_' || gen_random_uuid(), 'cus_test'
  from public.stylists
  join public.services on services.stylist_id = stylists.id
  where stylists.slug = 'checkout-test'
  order by services.sort
  limit 1
  returning id into booking_id;

  update public.bookings
  set status = 'arrived', arrived_at = now(), paid_at = case when book.terms ->> 'mode' = 'none' then null else now() end,
    stripe_payment_method_id = case when book.terms ->> 'mode' in ('deposit', 'card') then 'pm_test' end
  where id = booking_id;

  return booking_id;
end;
$$;

create function pg_temp.input(method text, final integer default 10000, tip integer default 0, via text default '')
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'method', method, 'tip_pence', tip, 'via', via,
    'lines', jsonb_build_array(jsonb_build_object(
      'name', 'Silk press', 'subtitle', '', 'base_pence', 10000, 'adjustment_pence', final - 10000,
      'reason', case when final = 10000 then '' else 'Changed on the day' end
    ))
  )
$$;

-- each claim here is a fresh try, as if the one before had finished
create function pg_temp.claim(target uuid, input jsonb)
returns jsonb
language plpgsql
as $$
begin
  update public.bookings set checkout_started_at = null where id = target;

  return public.claim_checkout(target, 'c5111111-1111-1111-1111-111111111111', input);
end;
$$;

create function pg_temp.refused(target uuid, input jsonb)
returns text
language plpgsql
as $$
begin
  perform pg_temp.claim(target, input);

  return 'claimed';
exception when others then
  return sqlerrm;
end;
$$;

create function pg_temp.finish(target uuid, input jsonb, extra jsonb default '{}')
returns text
language sql
as $$
  select public.finish_checkout(target, input || jsonb_build_object(
    'final_pence', (pg_temp.claim(target, input) ->> 'final_pence')::integer,
    'charge_pence', (pg_temp.claim(target, input) ->> 'charge_pence')::integer
  ) || extra)
$$;

create function pg_temp.emails(target uuid, template text)
returns integer
language sql
as $$
  select count(*)::int from public.notifications
  where notifications.template = emails.template and payload ->> 'ref' = (select ref from public.bookings where id = target)
$$;

create temp table b as
select
  pg_temp.book(interval '-1 hour', '{"mode": "deposit", "deposit_pence": 3000}') as deposit,
  pg_temp.book(interval '-2 hours', '{"mode": "full"}') as full_price,
  pg_temp.book(interval '-3 hours', '{"mode": "none"}') as unprotected,
  pg_temp.book(interval '-4 hours', '{"mode": "none"}', null) as no_email,
  pg_temp.book(interval '-5 hours', '{"mode": "none"}') as recorded,
  pg_temp.book(interval '-6 hours', '{"mode": "card"}') as card,
  pg_temp.book(interval '2 hours', '{"mode": "deposit", "deposit_pence": 3000}') as later;

grant select on b to authenticated;

-- the stylist's card fee on what they receive
select is(
  (select concat_ws(' ', platform_fee_pence, card_fee_pence) from public.payments where booking_id = (select deposit from b)),
  '163 65', 'a deposit payment keeps the booking fee and records the stylist''s card fee on the rest'
);
select is(
  (select card_fee_pence from public.payments where booking_id = (select card from b)), 0,
  'paying only the booking fee costs the stylist nothing'
);

-- refusals
select is(pg_temp.refused((select later from b), pg_temp.input('card')), 'checkout_not_allowed', 'not before it starts');
select throws_ok(
  format('select public.claim_checkout(%L, %L, %L)', (select deposit from b), 'c5222222-2222-2222-2222-222222222222', pg_temp.input('card')),
  'not_found', 'only the owner checks out'
);
select is(pg_temp.refused((select full_price from b), pg_temp.input('card', 10500)), 'method_not_allowed',
  'no saved card in full payment');
select is(pg_temp.refused((select deposit from b), pg_temp.input('card', 10500)), 'card_over_agreed',
  'the saved card can''t take more than was agreed');
select is(pg_temp.refused((select deposit from b), pg_temp.input('card', 10000, 2600)), 'tip_too_high',
  'nor a tip over a quarter of the price');
select is(pg_temp.refused((select deposit from b), pg_temp.input('link', 10000, 500)), 'tip_not_allowed', 'links have no tip');
select is(pg_temp.refused((select no_email from b), pg_temp.input('link')), 'no_contact_email', 'a link needs an email');
select is(pg_temp.refused((select deposit from b), pg_temp.input('none')), 'method_not_allowed', 'nothing paid when money is due');
select is(
  pg_temp.refused((select deposit from b), jsonb_set(pg_temp.input('card', 9000), '{lines,0,reason}', '""')),
  'reason_required', 'a price change needs a reason'
);

-- one card charge at a time
select is(pg_temp.refused((select card from b), pg_temp.input('card')), 'claimed', 'a card checkout starts');
select throws_ok(
  format('select public.claim_checkout(%L, %L, %L)', (select card from b), 'c5111111-1111-1111-1111-111111111111', pg_temp.input('card')),
  'checkout_in_progress', 'a second one waits while it''s going through'
);
select throws_ok(
  format('select public.claim_checkout(%L, %L, %L)', (select card from b), 'c5111111-1111-1111-1111-111111111111',
    pg_temp.input('record', 10000, 0, 'cash')),
  'checkout_in_progress', 'nor can it be recorded meanwhile'
);
select public.note_checkout_declined((select card from b), null);
select is(
  (select concat_ws(' ', checkout_tries, checkout_started_at is null) from public.bookings where id = (select card from b)),
  '1 t', 'a decline makes the next try a new charge'
);

-- card charges a checkout made but hasn't saved, from a try that crashed
select public.add_checkout_intent((select card from b), 'pi_checkout_tried');
select public.add_checkout_intent((select card from b), 'pi_checkout_tried');
select is((select checkout_intent_ids from public.bookings where id = (select card from b)), '{pi_checkout_tried}'::text[],
  'a card charge is noted once, before it''s confirmed');
select is((pg_temp.claim((select card from b), pg_temp.input('card')) -> 'checkout_intent_ids'), '["pi_checkout_tried"]'::jsonb,
  'the next try is told of it, to check whether it went through');
select ok(not exists (select 1 from public.claim_unsaved_charges(1000) where booking_id = (select card from b)),
  'the clean-up leaves it alone while a checkout is under way');
update public.bookings set checkout_started_at = now() - interval '3 minutes' where id = (select card from b);
select ok(exists (select 1 from public.claim_unsaved_charges(1000) where booking_id = (select card from b)),
  'and picks it up once that checkout has stopped');
select ok((select checkout_started_at > now() - interval '1 minute' from public.bookings where id = (select card from b)),
  'holding the booking so a checkout waits meanwhile');
select public.settle_unsaved_charge((select card from b), 'pi_checkout_tried', 'failed', 'balance too low');
update public.bookings set checkout_started_at = null where id = (select card from b);
select ok(not exists (select 1 from public.claim_unsaved_charges(1000) where booking_id = (select card from b)),
  'a refund that failed waits before it''s tried again');
select public.settle_unsaved_charge((select card from b), 'pi_checkout_tried', 'refunded', '');
select is(
  (select concat_ws(' ', cardinality(checkout_intent_ids), unsaved_refund_failures, checkout_tries)
    from public.bookings where id = (select card from b)),
  '0 1 2', 'once refunded it''s off the list, and the next card try is a new charge'
);
select is((select count(*)::int from public.booking_events where booking_id = (select card from b) and kind = 'unsaved_charge_refunded'),
  1, 'and the refund is logged');
select public.add_checkout_intent((select card from b), 'pi_checkout_declined');
select public.note_checkout_declined((select card from b), 'pi_checkout_declined');
select is((select cardinality(checkout_intent_ids) from public.bookings where id = (select card from b)), 0,
  'a declined charge comes off the list');

-- deposit + saved card with a tip
select is(
  (select concat_ws(' ', final_pence, paid_pence, due_pence, charge_pence, refund_pence)
    from pg_temp.claim((select deposit from b), pg_temp.input('card', 10000, 1500)) as quote(q),
    jsonb_to_record(q) as x(final_pence int, paid_pence int, due_pence int, charge_pence int, refund_pence int)),
  '10000 3000 7000 8500 0', 'the deposit counts towards the price'
);
select public.add_checkout_intent((select deposit from b), 'pi_checkout_deposit');
select is(
  pg_temp.finish((select deposit from b), pg_temp.input('card', 10000, 1500),
    '{"payment_intent_id": "pi_checkout_deposit", "card_label": "Visa •••• 4242"}'),
  'completed', 'the charged checkout completes'
);
select is((select cardinality(checkout_intent_ids) from public.bookings where id = (select deposit from b)), 0,
  'its card charge comes off the list once saved');
select is(
  (select concat_ws(' ', status, final_price_pence, tip_pence, card_label, checkout ->> 'method') from public.bookings where id = (select deposit from b)),
  'completed 10000 1500 Visa •••• 4242 card', 'the booking is completed with its checkout'
);
select is(
  (select concat_ws(' ', amount_pence, tip_pence, card_fee_pence) from public.payments where stripe_payment_intent_id = 'pi_checkout_deposit'),
  '8500 1500 148', 'the balance and tip are recorded with the stylist''s card fee'
);
select is(pg_temp.emails((select deposit from b), 'checkout_receipt'), 1, 'the client gets a receipt');
select is(pg_temp.refused((select deposit from b), pg_temp.input('card')), 'already_completed', 'checkout happens once');

-- full payment, cheaper on the day
select is(
  (pg_temp.claim((select full_price from b), pg_temp.input('none', 8000)) ->> 'refund_pence'), '2000',
  'paying more than the final price is refunded'
);
select pg_temp.finish((select full_price from b), pg_temp.input('none', 8000), '{"refund_pence": 2000, "refund_id": "re_lowered"}');
select is(
  (select concat_ws(' ', amount_pence, reason) from public.refunds where booking_id = (select full_price from b)),
  '2000 price_lowered', 'the refund is recorded'
);
select is(public.get_paid_pence((select full_price from b)), 8000, 'so what was paid matches the final price');

-- paid in cash, then cheaper: the stylist hands the difference back
create temp table hb as select pg_temp.book(interval '-7 hours', '{"mode": "none"}') as id;
grant select on hb to authenticated;
select pg_temp.finish((select id from hb), pg_temp.input('record', 10000, 0, 'cash'));
create temp table hp as select id from public.payments where booking_id = (select id from hb);
grant select on hp to authenticated;
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select public.correct_recorded_payment((select id from hp), 6000, 'cash', 0);
reset role;
select is(
  (select concat_ws(' ', online_pence, recorded_pence, recorded_via, refund_pence)
    from pg_temp.claim((select id from hb), pg_temp.input('none', 5000)) as quote(q),
    jsonb_to_record(q) as x(online_pence int, recorded_pence int, recorded_via text, refund_pence int)),
  '0 6000 cash 1000', 'what was paid outside the app is told apart from what can go back to a card'
);
select pg_temp.finish((select id from hb), pg_temp.input('none', 5000), '{"given_back_pence": 1000, "given_back_via": "cash"}');
select is(
  (select concat_ws(' ', amount_pence, reason, method, stripe_refund_id is null) from public.refunds where booking_id = (select id from hb)),
  '1000 price_lowered cash t', 'the cash handed back is recorded, with nothing through Stripe'
);
select is(
  (select concat_ws(' ', public.get_balance_due(bookings), unpaid_at is null) from public.bookings where id = (select id from hb)),
  '0 t', 'and the booking is settled'
);
select is(
  (select concat_ws(' ', details ->> 'refunded_pence', details ->> 'given_back_pence', details ->> 'given_back_via')
    from public.get_receipt_details((select id from hb)) as details),
  '0 1000 cash', 'the receipt says it was given back in cash, not refunded to a card'
);

-- a balance link
select pg_temp.finish((select unprotected from b), pg_temp.input('link'));
select is(
  (select concat_ws(' ', purpose, amount_pence, status) from public.payment_links where booking_id = (select unprotected from b)),
  'balance 10000 pending', 'a link checkout sends a balance link'
);
select is(pg_temp.emails((select unprotected from b), 'balance_due'), 1, 'the client is emailed it');
select is(pg_temp.emails((select unprotected from b), 'checkout_receipt'), 0, 'with no receipt yet');
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select public.resend_balance_link((select unprotected from b));
select public.resend_balance_link((select unprotected from b));
select throws_ok(format('select public.resend_balance_link(%L)', (select unprotected from b)), 'resend_not_allowed', 'three sends at most');
reset role;
update public.payment_links set stripe_payment_intent_id = 'pi_balance_link' where booking_id = (select unprotected from b);
select is(public.confirm_link_payment('pi_balance_link', false, null), 'paid', 'paying the link pays the balance');
select is(
  (select concat_ws(' ', kind, amount_pence, card_fee_pence) from public.payments where stripe_payment_intent_id = 'pi_balance_link'),
  'balance 10000 170', 'recorded as the balance, with the stylist''s card fee'
);
select is(pg_temp.emails((select unprotected from b), 'checkout_receipt'), 1, 'and the receipt goes');

-- a link cancelled, then paid anyway; then recorded
select pg_temp.finish((select no_email from b), pg_temp.input('record', 10000, 0, 'cash'));
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select throws_ok(format('select public.record_balance_paid(%L, %L, 0)', (select no_email from b), 'cash'), 'nothing_due',
  'nothing to record once it''s paid');
select public.undo_checkout((select no_email from b));
reset role;
select is(
  (select concat_ws(' ', status, coalesce(final_price_pence::text, '-')) from public.bookings where id = (select no_email from b)),
  'arrived -', 'undoing a recorded checkout puts the booking back'
);
select is((select count(*)::int from public.payments where booking_id = (select no_email from b)), 0, 'and removes the payment');

select pg_temp.finish((select recorded from b), pg_temp.input('link'));
update public.payment_links set stripe_payment_intent_id = 'pi_late_link' where booking_id = (select recorded from b);
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select public.cancel_balance_link((select recorded from b));
reset role;
select is(public.confirm_link_payment('pi_late_link', false, null), 'refund', 'a cancelled link paid anyway is refunded');
select ok((select unpaid_at is not null from public.bookings where id = (select recorded from b)),
  'cancelling the link puts it back in Due for checkout');
select is((pg_temp.claim((select recorded from b), pg_temp.input('record', 10000, 0, 'cash')) ->> 'charge_pence'), '10000',
  'where it can be checked out again');
update public.bookings set checkout_started_at = null where id = (select recorded from b);
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select public.record_balance_paid((select recorded from b), 'bank', 500);
select throws_ok(format('select public.undo_checkout(%L)', (select deposit from b)), 'undo_not_allowed',
  'a card checkout can''t be undone');
reset role;
select is(
  (select concat_ws(' ', method, amount_pence, tip_pence) from public.payments where booking_id = (select recorded from b)),
  'bank 10500 500', 'a recorded balance is the amount due plus the tip'
);
select ok((select unpaid_at is null from public.bookings where id = (select recorded from b)), 'and it''s no longer due');

-- correcting a recorded payment
create temp table p as select id from public.payments where booking_id = (select recorded from b);
grant select on p to authenticated;
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select public.correct_recorded_payment((select id from p), 10200, 'cash', 200);
reset role;
select is(
  (select concat_ws(' ', method, amount_pence, tip_pence, corrected_at is not null) from public.payments where id = (select id from p)),
  'cash 10200 200 t', 'a recorded payment can be corrected'
);
select ok((select unpaid_at is null from public.bookings where id = (select recorded from b)),
  'a correction that still covers the price leaves it paid');
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select public.correct_recorded_payment((select id from p), 9000, 'cash', 0);
reset role;
select ok((select unpaid_at is not null from public.bookings where id = (select recorded from b)),
  'one that falls short puts the rest back in Due for checkout');
select is(
  (select count(*)::int from public.notifications where template = 'checkout_receipt' and (payload ->> 'corrected')::boolean
    and payload ->> 'ref' = (select ref from public.bookings where id = (select recorded from b))),
  2, 'with a corrected receipt each time the amount changed'
);
update public.bookings set checkout_started_at = now() where id = (select recorded from b);
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select throws_ok(format('select public.record_balance_paid(%L, %L, 0)', (select recorded from b), 'cash'),
  'checkout_in_progress', 'the rest can''t be recorded while a card charge is going through');
reset role;
update public.bookings set checkout_started_at = null where id = (select recorded from b);
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select public.correct_recorded_payment((select id from p), 10000, 'cash', 0);
reset role;
select ok((select unpaid_at is null from public.bookings where id = (select recorded from b)),
  'correcting it back to the full amount takes it out of Due for checkout');
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select public.correct_recorded_payment((select id from p), 9000, 'cash', 100);
reset role;
select pg_temp.finish((select recorded from b), pg_temp.input('link'));
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select public.correct_recorded_payment((select id from p), 10000, 'cash', 100);
reset role;
select is(
  (select count(*)::int from public.payment_links
    where booking_id = (select recorded from b) and status in ('pending', 'expired')),
  0, 'a correction stops a link out for the old balance'
);
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select public.correct_recorded_payment((select id from p), 9000, 'cash', 100);
reset role;
select pg_temp.finish((select recorded from b), pg_temp.input('record', 10000, 300, 'cash'));
select is((select tip_pence from public.bookings where id = (select recorded from b)), 400,
  'checking it out again keeps the earlier tip');
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select public.correct_recorded_payment((select id from p), 8000, 'cash', 100);
reset role;
create temp table receipts as select count(*)::int as sent from public.notifications
where template = 'checkout_receipt' and payload ->> 'ref' = (select ref from public.bookings where id = (select recorded from b));
select pg_temp.finish((select recorded from b), pg_temp.input('record', 10000, 0, 'cash'), '{"charge_pence": 500}');
select ok((select unpaid_at is not null from public.bookings where id = (select recorded from b)),
  'a checkout that leaves some unpaid puts it back in Due for checkout');
select is(
  (select count(*)::int from public.notifications where template = 'checkout_receipt'
    and payload ->> 'ref' = (select ref from public.bookings where id = (select recorded from b))),
  (select sent from receipts), 'with no receipt until it''s paid'
);
update public.payments set created_at = now() - interval '3 months' where id = (select id from p);
select pg_temp.act_as('c5111111-1111-1111-1111-111111111111');
select throws_ok(format('select public.correct_recorded_payment(%L, 10000, %L, 0)', (select id from p), 'cash'),
  'correction_not_allowed', 'only until the end of the following month');
select pg_temp.act_as('c5222222-2222-2222-2222-222222222222');
select throws_ok(format('select public.correct_recorded_payment(%L, 10000, %L, 0)', (select id from p), 'cash'),
  'not_found', 'and only by the owner');
reset role;

-- card protection: the whole price on the saved card
select is(
  (pg_temp.refused((select card from b), pg_temp.input('card'))), 'claimed',
  'card protection can be charged after the decline'
);

select throws_ok(
  format('insert into public.payment_links (booking_id, purpose, fee_id, amount_pence, token_hash, expires_at) values (%L, %L, %L, 100, %L, now())',
    (select deposit from b), 'balance', gen_random_uuid(), '\x01'::bytea),
  '23514', null, 'a balance link has no fee'
);

select ok(
  not has_function_privilege('authenticated', 'public.claim_checkout(uuid, uuid, jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.finish_checkout(uuid, jsonb)', 'execute')
    and has_function_privilege('authenticated', 'public.record_balance_paid(uuid, text, integer)', 'execute')
    and not has_function_privilege('anon', 'public.record_balance_paid(uuid, text, integer)', 'execute')
    and not has_function_privilege('authenticated', 'public.add_checkout_intent(uuid, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.claim_unsaved_charges(integer)', 'execute')
    and not has_function_privilege('authenticated', 'public.settle_unsaved_charge(uuid, text, text, text)', 'execute'),
  'charging is server-only; recording is for signed-in stylists'
);

select * from finish();
rollback;
