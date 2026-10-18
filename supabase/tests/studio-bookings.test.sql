begin;
select plan(32);

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
        'contact_email', 'studio@studio.test', 'contact_phone', '07700900999'
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

select pg_temp.sign_up('c1111111-1111-1111-1111-111111111111', 'owner@desk.test', 'Desk Test');
select pg_temp.sign_up('c2222222-2222-2222-2222-222222222222', 'other@desk.test', 'Other Desk');

update public.working_hours set is_open = true, start_time = '09:00', end_time = '18:00'
where stylist_id = (select id from public.stylists where slug = 'desk-test');

update public.booking_rules set min_notice_hours = 0
where stylist_id = (select id from public.stylists where slug = 'desk-test');

update public.stylists set status = 'live' where slug = 'desk-test';

-- A paid ten-minute deposit booking (£30 deposit + £1.63 fee on £100), starting `starts_in` from now.
create function pg_temp.book(starts_in interval)
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at, ends_at,
    block_ends_at, status, contact, terms, due_today_pence, paid_at, stripe_payment_intent_id)
  select stylists.id, services.id, '{}', '{"service_name": "Silk press"}', 10000, 163, 10,
    now() + starts_in, now() + starts_in + interval '10 minutes', now() + starts_in + interval '10 minutes', 'confirmed',
    '{"first": "Nia", "last": "Okafor", "email": "nia@desk.test", "phone": "07700900123"}',
    jsonb_build_object('mode', 'deposit', 'deposit_percent', 30, 'deposit_pence', 3000, 'refundable', true,
      'free_window_hours', 48, 'grace_minutes', 15, 'late_on', true, 'late_kind', 'keep', 'late_percent', 50,
      'free_cancel_until', now() + starts_in - interval '48 hours'),
    3163, now(), 'pi_' || gen_random_uuid()
  from public.stylists
  join public.services on services.stylist_id = stylists.id
  where stylists.slug = 'desk-test'
  order by services.sort
  limit 1
  returning id
$$;

create temp table b as
select
  pg_temp.book(interval '30 minutes') as soon,
  pg_temp.book(interval '3 hours') as later,
  pg_temp.book(interval '-20 minutes') as late_start,
  pg_temp.book(interval '-5 minutes') as in_grace,
  pg_temp.book(interval '-25 hours') as yesterday,
  pg_temp.book(interval '5 days') as next_week,
  pg_temp.book(interval '5 days 2 hours') as next_week_after;

grant select on b to authenticated;

select pg_temp.act_as('c2222222-2222-2222-2222-222222222222');
select throws_ok(format('select public.set_booking_status(%L, %L)', (select soon from b), 'arrived'), 'not_found',
  'another stylist cannot change the booking');

select pg_temp.act_as('c1111111-1111-1111-1111-111111111111');
select throws_ok(format('select public.set_booking_status(%L, %L)', (select later from b), 'arrived'), 'status_not_allowed',
  'not arrived more than an hour early');

select lives_ok(format('select public.set_booking_status(%L, %L)', (select soon from b), 'arrived'),
  'arrived from an hour before');
reset role;
select is((select status from public.bookings where id = (select soon from b)), 'arrived', 'the booking is arrived');
select is(
  (select data ->> 'to' from public.booking_events where booking_id = (select soon from b) and kind = 'status_changed'),
  'arrived', 'the change is logged'
);

select pg_temp.act_as('c1111111-1111-1111-1111-111111111111');
select lives_ok(format('select public.set_booking_status(%L, %L)', (select soon from b), 'confirmed'), 'arrived can be undone');
select throws_ok(format('select public.set_booking_status(%L, %L)', (select later from b), 'completed'), 'status_not_allowed',
  'other statuses are refused');

select throws_ok(format('select public.mark_no_show(%L, true)', (select in_grace from b)), 'no_show_not_allowed',
  'no no-show inside the grace period');
select throws_ok(format('select public.mark_no_show(%L, true)', (select yesterday from b)), 'no_show_not_allowed',
  'no no-show a day after the start');
select lives_ok(format('select public.mark_no_show(%L, false)', (select late_start from b)), 'a no-show after the grace period');
reset role;
select is((select status from public.bookings where id = (select late_start from b)), 'no_show', 'the booking is a no-show');

select pg_temp.act_as('c1111111-1111-1111-1111-111111111111');
select lives_ok(format('select public.undo_no_show(%L)', (select late_start from b)), 'a no-show can be undone');
reset role;
select is((select status from public.bookings where id = (select late_start from b)), 'confirmed', 'the booking is back');
update public.bookings set status = 'no_show', no_show_at = now() - interval '25 hours' where id = (select late_start from b);

select pg_temp.act_as('c1111111-1111-1111-1111-111111111111');
select throws_ok(format('select public.undo_no_show(%L)', (select late_start from b)), 'undo_not_allowed',
  'not undone after 24 hours');

select throws_ok(
  format('select public.reschedule_studio_booking(%L, %L, false)', (select next_week from b),
    now() + interval '5 days 2 hours 5 minutes'),
  'slot_taken', 'not moved onto another booking unless the stylist agreed'
);
select lives_ok(
  format('select public.reschedule_studio_booking(%L, %L, false)', (select next_week from b), now() + interval '6 days'),
  'moved to a free time'
);
reset role;
select is((select reschedule_count from public.bookings where id = (select next_week from b)), 0::smallint,
  'the client keeps their own reschedule');
select is(
  (select array_agg(template order by template) from public.notifications where to_address in ('nia@desk.test', 'owner@desk.test')),
  array['booking_moved_by_stylist'], 'only the client is emailed'
);
select is(
  (select array_agg(key order by key) from public.notifications, jsonb_object_keys(payload) as key
  where template = 'booking_moved_by_stylist' and key like '%_url'
    and payload ->> 'ref' = (select ref from public.bookings where id = (select next_week from b))),
  array['manage_url'], 'the move email carries only the manage link'
);

select pg_temp.act_as('c1111111-1111-1111-1111-111111111111');
select lives_ok(
  format('select public.reschedule_studio_booking(%L, %L, true)', (select next_week from b),
    now() + interval '5 days 2 hours 5 minutes'),
  'moved over another booking when the stylist agreed'
);
reset role;

update public.bookings
set status = 'arrived',
  starts_at = (current_date + 3 + time '10:00') at time zone 'Europe/London',
  ends_at = (current_date + 3 + time '10:10') at time zone 'Europe/London',
  block_ends_at = (current_date + 3 + time '10:10') at time zone 'Europe/London'
where id = (select later from b);

select is(
  (select array_agg(to_char(slot at time zone 'Europe/London', 'HH24:MI') order by slot)
  from public.get_day_slots((select id from public.stylists where slug = 'desk-test'), 60, 0, current_date + 3) as slot
  where slot at time zone 'Europe/London' < current_date + 3 + time '11:30'),
  array['09:00', '10:30', '11:00'], 'an arrived booking keeps its time taken'
);

update public.bookings set status = 'arrived', arrived_at = now() where id = (select soon from b);
select pg_temp.act_as('c1111111-1111-1111-1111-111111111111');
select lives_ok(
  format('select public.reschedule_studio_booking(%L, %L, false)', (select soon from b), now() + interval '8 days'),
  'an arrived booking can be moved'
);
reset role;
select is((select status from public.bookings where id = (select soon from b)), 'confirmed', 'and goes back to confirmed');
select is(
  public.get_studio_cancellation((select soon from b), 'c1111111-1111-1111-1111-111111111111', 'stylist', true) ->> 'refund_pence',
  '3163', 'an arrived booking can be cancelled too'
);

select is(
  public.get_studio_cancellation((select next_week_after from b), 'c1111111-1111-1111-1111-111111111111', 'stylist', true)
    - 'id' - 'payment_intent_id',
  '{"is_late": false, "fee_pence": 0, "refund_pence": 3163, "kept_pence": 0, "charge_pence": 0, "fee_recovery_pence": 163}',
  'the stylist cancelling refunds everything, the booking fee to recover'
);

update public.bookings set terms = terms || jsonb_build_object('free_cancel_until', now() - interval '1 minute')
where id = (select next_week_after from b);

select is(
  (public.get_studio_cancellation((select next_week_after from b), 'c1111111-1111-1111-1111-111111111111', 'client', true)
    ->> 'refund_pence')::int,
  3000, 'a waived late fee refunds the deposit'
);

update public.bookings
set terms = terms || jsonb_build_object('refundable', false, 'free_cancel_until', now() + interval '1 day')
where id = (select next_week_after from b);

select is(
  (public.get_studio_cancellation((select next_week_after from b), 'c1111111-1111-1111-1111-111111111111', 'client', false)
    ->> 'refund_pence')::int,
  0, 'a client cancelling in time still loses a non-refundable deposit'
);

select throws_ok(
  format('select public.cancel_studio_booking(%L, %L, %L, %L, %L)', (select next_week_after from b),
    'c2222222-2222-2222-2222-222222222222', 'stylist', '', '{}'),
  'cannot_cancel', 'another stylist cannot cancel it'
);

select public.cancel_studio_booking((select next_week_after from b), 'c1111111-1111-1111-1111-111111111111', 'stylist',
  'Off sick', '{"refund_pence": 3163}');
select is(
  (select concat_ws(' ', status, cancelled_by, cancel_reason) from public.bookings where id = (select next_week_after from b)),
  'cancelled stylist Off sick', 'the stylist cancelled it'
);

select pg_temp.act_as('c1111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select public.cancel_studio_booking(%L, %L, %L, %L, %L)', (select soon from b),
    'c1111111-1111-1111-1111-111111111111', 'stylist', '', '{}'),
  '42501', null, 'cancelling goes through the refund, never straight from the browser'
);

reset role;
update public.bookings
set overlap_ok = true,
  starts_at = (current_date + 4 + time '10:00') at time zone 'Europe/London',
  ends_at = (current_date + 4 + time '10:10') at time zone 'Europe/London',
  block_ends_at = (current_date + 4 + time '10:10') at time zone 'Europe/London'
where id = (select next_week from b);

select is(
  (select array_agg(to_char(slot at time zone 'Europe/London', 'HH24:MI') order by slot)
  from public.get_day_slots((select id from public.stylists where slug = 'desk-test'), 60, 0, current_date + 4) as slot
  where slot at time zone 'Europe/London' < current_date + 4 + time '11:00'),
  array['09:00', '10:30'], 'a double-booked time is still never offered online'
);

update public.bookings set stripe_payment_intent_id = null where id = (select later from b);
select is(
  public.get_studio_cancellation((select later from b), 'c1111111-1111-1111-1111-111111111111', 'stylist', true) ->> 'refund_pence',
  '0', 'nothing is refunded without a card payment'
);

select * from finish();
rollback;
