begin;
select plan(30);

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
        'contact_email', 'money@money.test'
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
  where stylists.slug = 'money-test'
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

create temp table b as
select
  pg_temp.book(interval '-1 hour', '{"mode": "deposit", "deposit_pence": 3000, "refundable": true, "no_show_on": true, "no_show_kind": "pct", "no_show_percent": 50}') as deposit_over,
  pg_temp.book(interval '-2 hours', '{"mode": "deposit", "deposit_pence": 3000, "refundable": true, "no_show_on": true, "no_show_kind": "keep"}') as deposit_keep,
  pg_temp.book(interval '-3 hours', '{"mode": "full", "no_show_on": true, "no_show_kind": "pct", "no_show_percent": 40}') as full_price,
  pg_temp.book(interval '-4 hours', '{"mode": "card", "no_show_on": true, "no_show_kind": "pct", "no_show_percent": 50}') as card,
  pg_temp.book(interval '-5 hours', '{"mode": "full", "no_show_on": true, "no_show_kind": "pct", "no_show_percent": 40}') as full_no_charge,
  pg_temp.book(interval '-6 hours', '{"mode": "card", "no_show_on": true, "no_show_kind": "pct", "no_show_percent": 50}') as card_no_charge,
  pg_temp.book(interval '30 hours', '{"mode": "deposit", "deposit_pence": 3000, "refundable": true, "late_on": true, "late_kind": "pct", "late_percent": 50}') as late;

grant select on b to authenticated;

select is((select count(*)::int from public.payments where booking_id = (select deposit_over from b) and amount_pence = 3163),
  1, 'paying records the payment');

select pg_temp.act_as('d1111111-1111-1111-1111-111111111111');
select public.mark_no_show((select deposit_over from b), true);
select public.mark_no_show((select deposit_keep from b), true);
select public.mark_no_show((select full_price from b), true);
select public.mark_no_show((select card from b), true);
select public.mark_no_show((select full_no_charge from b), false);
select public.mark_no_show((select card_no_charge from b), false);
reset role;

select is(pg_temp.fee((select deposit_over from b)), 'no_show pending fee 5000 kept 3000 refund 0 charge 2000',
  'deposit, fee over it: the deposit is kept and the rest charged');
select is(pg_temp.fee((select deposit_keep from b)), 'no_show pending fee 3000 kept 3000 refund 0 charge 0',
  'deposit, "keep the deposit": kept');
select is(pg_temp.fee((select full_price from b)), 'no_show pending fee 4000 kept 4000 refund 6000 charge 0',
  'full: the fee is kept and the rest refunded');
select is(pg_temp.fee((select card from b)), 'no_show pending fee 5000 kept 0 refund 0 charge 5000',
  'card on file: the fee is charged');
select is(pg_temp.fee((select full_no_charge from b)), 'no_show pending fee 0 kept 0 refund 10000 charge 0',
  'full, no charge: everything paid goes back');
select is(pg_temp.fee((select card_no_charge from b)), null, 'card on file, no charge: nothing to settle');
select is((select count(*)::int from public.notifications where template = 'fee_scheduled' and to_address = 'nia@money.test'),
  4, 'the client hears about each no-show fee');
select ok((select charge_after > now() + interval '23 hours' from public.booking_fees where booking_id = (select card from b)),
  'it settles after the 24-hour waive window');

select pg_temp.act_as('d1111111-1111-1111-1111-111111111111');
select public.undo_no_show((select card from b));
reset role;
select is(pg_temp.fee((select card from b)), 'no_show void fee 5000 kept 0 refund 0 charge 5000', 'undoing the no-show voids it');
select is(
  (select count(*)::int from public.notifications
  where template = 'fee_cancelled' and payload ->> 'ref' = (select ref from public.bookings where id = (select card from b))),
  1, 'and tells the client the fee is off'
);
select is(
  (select past_at from public.bookings where id = (select deposit_over from b)),
  (select no_show_at from public.bookings where id = (select deposit_over from b)),
  'a no-show joins Past when it was marked'
);

select pg_temp.act_as('d2222222-2222-2222-2222-222222222222');
select throws_ok(
  format('select public.waive_fee(%L)', (select deposit_over from b)),
  'not_found', 'another stylist cannot waive it'
);
select is((select count(*)::int from public.booking_fees), 0, 'or see it');

select pg_temp.act_as('d1111111-1111-1111-1111-111111111111');
select public.waive_fee((select deposit_keep from b));
reset role;
select is(pg_temp.fee((select deposit_keep from b)), 'no_show pending fee 3000 kept 0 refund 3000 charge 0',
  'waiving refunds the kept deposit and charges nothing');

update public.booking_fees set charge_after = now() - interval '1 minute'
where booking_id in ((select deposit_over from b), (select full_price from b));

select is(
  (select count(*)::int from public.claim_due_fees(50) as claimed
  where (claimed ->> 'booking_id')::uuid in (select unnest(array[deposit_keep, deposit_over, full_price, full_no_charge]) from b)),
  3, 'the settlement claims what is due: the waived fee straight away, the others once the window closes'
);
select is(
  (select concat_ws(' ', status, tries) from public.booking_fees where booking_id = (select deposit_over from b)),
  'charging 1', 'a fee to charge counts the try'
);
select is(
  (select count(*)::int from public.claim_due_fees(50) as claimed
  where (claimed ->> 'booking_id')::uuid in (select unnest(array[deposit_keep, deposit_over, full_price]) from b)),
  0, 'a claimed fee is not claimed twice'
);

select public.finish_fee_settlement(
  (select id from public.booking_fees where booking_id = (select full_price from b)),
  '{"outcome": "settled", "refunded_pence": 6000, "refund_id": "re_full"}'
);
select is(pg_temp.fee((select full_price from b)), 'no_show settled fee 4000 kept 4000 refund 0 charge 0',
  'nothing to charge: settled');
select is((select amount_pence from public.refunds where stripe_refund_id = 're_full'), 6000, 'and the refund recorded');

select public.finish_fee_settlement(
  (select id from public.booking_fees where booking_id = (select deposit_keep from b)),
  '{"outcome": "settled", "refunded_pence": 3000, "refund_id": "re_waived"}'
);
select is((select status from public.booking_fees where booking_id = (select deposit_keep from b)), 'waived',
  'a waived fee ends waived');

select public.finish_fee_settlement(
  (select id from public.booking_fees where booking_id = (select deposit_over from b)),
  '{"outcome": "unpaid", "refunded_pence": 0, "decline_message": "Your card has insufficient funds.", "card_label": "Visa •••• 4242"}'
);
select is(
  (select concat_ws(' | ', status, decline_message, card_label) from public.booking_fees where booking_id = (select deposit_over from b)),
  'unpaid | Your card has insufficient funds. | Visa •••• 4242', 'a declined charge leaves it unpaid, with why'
);

select throws_ok(
  format('select public.claim_fee_retry(%L, %L)', (select deposit_over from b),
    'd1111111-1111-1111-1111-111111111111'),
  'retry_not_allowed', 'no retry within a day of the last try'
);

update public.booking_fees set last_tried_at = now() - interval '25 hours' where booking_id = (select deposit_over from b);
select is(
  public.claim_fee_retry((select deposit_over from b),
    'd1111111-1111-1111-1111-111111111111') ->> 'tries',
  '2', 'a day later it can be retried'
);

select public.finish_fee_settlement(
  (select id from public.booking_fees where booking_id = (select deposit_over from b)),
  '{"outcome": "unpaid", "refunded_pence": 0, "hard_decline": true, "decline_message": "Your card was reported stolen."}'
);
update public.booking_fees set last_tried_at = now() - interval '25 hours' where booking_id = (select deposit_over from b);
select throws_ok(
  format('select public.claim_fee_retry(%L, %L)', (select deposit_over from b),
    'd1111111-1111-1111-1111-111111111111'),
  'retry_not_allowed', 'never after a hard decline'
);

select pg_temp.act_as('d1111111-1111-1111-1111-111111111111');
select public.record_fee_paid((select deposit_over from b), 'cash');
reset role;
select is(
  (select concat_ws(' ', fees.status, payments.method, payments.amount_pence) from public.booking_fees as fees
    join public.payments on payments.fee_id = fees.id where fees.booking_id = (select deposit_over from b)),
  'paid_offline cash 2000', 'paid another way is recorded'
);

update public.bookings set terms = terms || jsonb_build_object('free_cancel_until', now() - interval '1 minute')
where id = (select late from b);
select public.cancel_studio_booking((select late from b), 'd1111111-1111-1111-1111-111111111111', 'client', '',
  public.get_studio_cancellation((select late from b), 'd1111111-1111-1111-1111-111111111111', 'client', false));
select is(pg_temp.fee((select late from b)), 'late_cancel pending fee 5000 kept 3000 refund 0 charge 2000',
  'a late cancellation schedules its fee');
select is((select count(*)::int from public.notifications where template = 'fee_scheduled' and to_address = 'nia@money.test'),
  5, 'and the client hears about it too');
select is(
  (select payload ->> 'refund_pence' from public.notifications where template = 'fee_waived' and to_address = 'nia@money.test'),
  '3000', 'a waived fee tells the client, with what comes back'
);

select ok(
  not has_function_privilege('authenticated', 'public.claim_due_fees(integer)', 'execute')
    and not has_function_privilege('authenticated', 'public.finish_fee_settlement(uuid, jsonb)', 'execute')
    and has_function_privilege('authenticated', 'public.waive_fee(uuid)', 'execute'),
  'only the server settles fees; stylists can waive'
);

select * from finish();
rollback;
