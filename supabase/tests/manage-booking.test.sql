begin;
select plan(37);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('b1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'owner@manage.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Man', 'last_name', 'Age', 'phone', '07700900456', 'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Manage Test', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@manage.test', 'contact_phone', '07700900999')
  ), '{}');

update public.services set status = 'active', price_pence = 10000, duration_min = 60
where stylist_id = (select id from public.stylists where slug = 'manage-test');

update public.working_hours set is_open = true, start_time = '09:00', end_time = '18:00'
where stylist_id = (select id from public.stylists where slug = 'manage-test');

update public.stylists set status = 'live' where slug = 'manage-test';

create function pg_temp.at(day_offset int, at_time text)
returns timestamptz
language sql
as $$ select (((now() at time zone 'Europe/London')::date + day_offset) + at_time::time) at time zone 'Europe/London' $$;

create function pg_temp.book(
  at_time text, mode text, deposit_percent int default 0, refundable boolean default true,
  late_on boolean default false, late_kind text default 'keep', late_percent int default 50
)
returns jsonb
language plpgsql
as $$
declare
  stylist uuid := (select id from public.stylists where slug = 'manage-test');
  held jsonb;
begin
  insert into public.payment_policies (stylist_id, mode, deposit_percent, refundable, late_on, late_kind, late_percent, created_at)
  values (stylist, mode, deposit_percent, refundable, late_on, late_kind, late_percent, clock_timestamp());

  held := public.hold_booking(
    (select id from public.services where stylist_id = stylist order by sort limit 1), '{}', pg_temp.at(5, at_time)
  );

  perform public.checkout_booking((held ->> 'id')::uuid, held ->> 'secret',
    '{"first":"Nia","last":"Okafor","email":"nia@manage.test","phone":"07700900123"}', '', null, null, null, null);

  update public.bookings set stripe_payment_intent_id = 'pi_' || (held ->> 'ref') where id = (held ->> 'id')::uuid;
  perform public.confirm_booking_payment('pi_' || (held ->> 'ref'));

  update public.booking_tokens set verified_until = now() + interval '1 hour'
  where booking_id = (held ->> 'id')::uuid and purpose = 'manage';

  return held || jsonb_build_object('token', (
    select split_part(payload ->> 'manage_url', 'token=', 2) from public.notifications
    where template = 'booking_confirmed' and payload ->> 'ref' = held ->> 'ref'
  ));
end;
$$;

create function pg_temp.make_late(booking jsonb)
returns void
language sql
as $$
  update public.bookings set terms = terms || jsonb_build_object('free_cancel_until', now() - interval '1 minute')
  where id = (booking ->> 'id')::uuid
$$;

create function pg_temp.terms(booking jsonb)
returns text
language sql
as $$
  select concat_ws(' ', 'refund', c ->> 'refund_pence', 'kept', c ->> 'kept_pence', 'charge', c ->> 'charge_pence')
  from (select public.get_managed_booking(booking ->> 'token') -> 'cancellation' as c) as managed
$$;

create temp table b as
select
  pg_temp.book('09:00', 'deposit', 30) as deposit,
  pg_temp.book('10:00', 'deposit', 25, false) as nonrefundable,
  pg_temp.book('11:00', 'deposit', 30, true, true, 'keep') as late_keep,
  pg_temp.book('12:00', 'deposit', 30, true, true, 'pct', 80) as late_over,
  pg_temp.book('13:00', 'deposit', 30, true, true, 'pct', 10) as late_under,
  pg_temp.book('14:00', 'full', 0, true, true, 'pct', 50) as full_price,
  pg_temp.book('15:00', 'card', 0, true, true, 'pct', 50) as card,
  pg_temp.book('16:00', 'none') as fee_only;

select is(public.get_managed_booking((select deposit from b) ->> 'token') ->> 'status', 'confirmed', 'the manage link opens the booking');
select is(public.get_managed_booking('not-a-token'), null, 'an unknown link opens nothing');

update public.booking_tokens set expires_at = now() - interval '1 second'
where booking_id = ((select fee_only from b) ->> 'id')::uuid and purpose = 'manage';

select is(public.get_managed_booking((select fee_only from b) ->> 'token'), null, 'an expired link opens nothing');

update public.booking_tokens set expires_at = now() + interval '30 days'
where booking_id = ((select fee_only from b) ->> 'id')::uuid and purpose = 'manage';

select is(public.get_managed_booking((select deposit from b) ->> 'token') ->> 'where', 'Manage Test, 1 High St, Manchester, M1 1AA',
  'the booking shows the full address');

select is(pg_temp.terms((select deposit from b)), 'refund 3000 kept 0 charge 0', 'deposit, in time: the deposit is refunded');
select is(pg_temp.terms((select nonrefundable from b)), 'refund 0 kept 2500 charge 0', 'non-refundable deposit: kept');
select is(pg_temp.terms((select full_price from b)), 'refund 10000 kept 0 charge 0', 'full, in time: refunded in full');
select is(pg_temp.terms((select card from b)), 'refund 0 kept 0 charge 0', 'card on file, in time: nothing charged');
select is(pg_temp.terms((select fee_only from b)), 'refund 0 kept 0 charge 0', 'pay at the appointment: nothing either way');

select pg_temp.make_late(late) from (values ((select deposit from b)), ((select late_keep from b)), ((select late_over from b)),
  ((select late_under from b)), ((select full_price from b)), ((select card from b)), ((select fee_only from b))) as late (late);

select is(pg_temp.terms((select deposit from b)), 'refund 3000 kept 0 charge 0', 'late without a late fee: the deposit is still refunded');
select is(pg_temp.terms((select late_keep from b)), 'refund 0 kept 3000 charge 0', 'late, "keep the deposit": kept');
select is(pg_temp.terms((select late_over from b)), 'refund 0 kept 3000 charge 5000', 'late fee over the deposit: kept, and the rest to charge');
select is(pg_temp.terms((select late_under from b)), 'refund 2000 kept 1000 charge 0', 'late fee under the deposit: the rest refunded');
select is(pg_temp.terms((select full_price from b)), 'refund 5000 kept 5000 charge 0', 'full, late at 50%: half refunded');
select is(pg_temp.terms((select card from b)), 'refund 0 kept 0 charge 5000', 'card on file, late at 50%: half to charge');
select is(pg_temp.terms((select fee_only from b)), 'refund 0 kept 0 charge 0', 'pay at the appointment, late: nothing');

select is(public.get_managed_booking((select nonrefundable from b) ->> 'token') ->> 'can_reschedule', 'true', 'in time, it can be rescheduled');

select ok(
  pg_temp.at(6, '09:00') in (select public.get_reschedule_slots((select nonrefundable from b) ->> 'token', current_date, current_date + 10)),
  'its open times are offered'
);

select ok(
  pg_temp.at(5, '09:00') not in (select public.get_reschedule_slots((select nonrefundable from b) ->> 'token', current_date, current_date + 10)),
  'another booking''s time isn''t'
);

select throws_ok(
  format('select public.reschedule_managed_booking(%L, %L)', (select nonrefundable from b) ->> 'token', pg_temp.at(5, '09:00')),
  'slot_taken', 'a taken time is refused'
);

select is(
  public.reschedule_managed_booking((select nonrefundable from b) ->> 'token', pg_temp.at(6, '09:00')) ->> 'starts_at',
  to_jsonb(pg_temp.at(6, '09:00')) #>> '{}', 'it moves to the new time'
);

select is(
  (select (terms ->> 'free_cancel_until')::timestamptz from public.bookings where id = ((select nonrefundable from b) ->> 'id')::uuid),
  pg_temp.at(6, '09:00') - interval '48 hours', 'the free-cancellation deadline moves with it'
);

select ok(
  pg_temp.at(5, '10:00') in (select public.get_day_slots((select id from public.stylists where slug = 'manage-test'), 60, 0, (now() at time zone 'Europe/London')::date + 5)),
  'the old time is free again'
);

select throws_ok(
  format('select public.reschedule_managed_booking(%L, %L)', (select nonrefundable from b) ->> 'token', pg_temp.at(6, '11:00')),
  'reschedule_not_allowed', 'only once'
);

select throws_ok(
  format('select public.reschedule_managed_booking(%L, %L)', (select deposit from b) ->> 'token', pg_temp.at(6, '11:00')),
  'reschedule_not_allowed', 'not after the free-cancellation deadline'
);

select is(
  (select string_agg(template, ',' order by template) from public.notifications
    where payload ->> 'ref' = (select nonrefundable from b) ->> 'ref' and template like '%rescheduled'),
  'booking_rescheduled,client_rescheduled', 'client and stylist are emailed the new time'
);

select ok(
  not (public.get_managed_booking((select deposit from b) ->> 'token') ? 'allergies'),
  'the manage link never carries allergies'
);

select ok(
  public.get_managed_booking((select deposit from b) ->> 'token') ?& array['notes', 'address_notes'],
  'it carries the client''s notes instead'
);

select is(
  (public.get_cancellation((select late_under from b) ->> 'token') ->> 'refund_pence')::int, 2000,
  'the cancellation gives the refund to make'
);

select public.cancel_managed_booking((select late_under from b) ->> 'token',
  public.get_cancellation((select late_under from b) ->> 'token') || '{"refund_id": "re_test"}');

select is(
  (select status || ' ' || cancelled_by || ' ' || (cancellation ->> 'refund_id') from public.bookings where id = ((select late_under from b) ->> 'id')::uuid),
  'cancelled client re_test', 'the booking is cancelled by the client, with the refund recorded'
);

select ok(
  pg_temp.at(5, '13:00') in (select public.get_day_slots((select id from public.stylists where slug = 'manage-test'), 60, 0, (now() at time zone 'Europe/London')::date + 5)),
  'its time is free again'
);

select throws_ok(
  format('select public.get_cancellation(%L)', (select late_under from b) ->> 'token'), 'cannot_cancel', 'it can''t be cancelled twice'
);

select is(
  (select string_agg(template, ',' order by template) from public.notifications
    where payload ->> 'ref' = (select late_under from b) ->> 'ref' and template like '%cancelled'),
  'booking_cancelled,client_cancelled', 'client and stylist are emailed'
);

select is(
  public.get_booking_calendar(public.get_managed_booking((select deposit from b) ->> 'token') ->> 'calendar_key', null, null) ->> 'ref',
  (select deposit from b) ->> 'ref', 'by the calendar key the manage page shows');

select is(public.get_booking_calendar((select deposit from b) ->> 'token', null, null), null,
  'the manage link itself doesn''t open the calendar file');

select is(public.get_booking_calendar(null, ((select deposit from b) ->> 'id')::uuid, (select deposit from b) ->> 'secret') ->> 'ref',
  (select deposit from b) ->> 'ref', 'or by the paying browser''s booking and secret');

select ok(
  has_function_privilege('anon', 'public.get_managed_booking(text)', 'execute')
    and has_function_privilege('anon', 'public.reschedule_managed_booking(text, timestamptz)', 'execute')
    and not has_function_privilege('anon', 'public.cancel_managed_booking(text, jsonb)', 'execute')
    and not has_function_privilege('anon', 'public.get_booking_by_token(text)', 'execute'),
  'browsers view and reschedule with the link; cancelling goes through the server'
);

select * from finish();
rollback;
