begin;
select plan(31);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('d1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'owner@codes.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Co', 'last_name', 'Des', 'phone', '07700900456', 'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Codes Test', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@codes.test', 'contact_phone', '07700900999')
  ), '{}');

update public.services set status = 'active', price_pence = 10000, duration_min = 60
where stylist_id = (select id from public.stylists where slug = 'codes-test');

update public.working_hours set is_open = true, start_time = '09:00', end_time = '18:00'
where stylist_id = (select id from public.stylists where slug = 'codes-test');

update public.stylists set status = 'live' where slug = 'codes-test';

insert into public.payment_policies (stylist_id, mode, deposit_percent)
values ((select id from public.stylists where slug = 'codes-test'), 'none', 0);

create function pg_temp.book(at_time text)
returns jsonb
language plpgsql
as $$
declare
  stylist uuid := (select id from public.stylists where slug = 'codes-test');
  held jsonb;
begin
  held := public.hold_booking(
    (select id from public.services where stylist_id = stylist order by sort limit 1), '{}',
    (((now() at time zone 'Europe/London')::date + 5) + at_time::time) at time zone 'Europe/London'
  );

  perform public.checkout_booking((held ->> 'id')::uuid, held ->> 'secret',
    '{"first":"Nia","last":"Okafor","email":"nia@codes.test","phone":"07700900123"}', '', null, null, null, null);

  update public.bookings set stripe_payment_intent_id = 'pi_' || (held ->> 'ref') where id = (held ->> 'id')::uuid;
  perform public.confirm_booking_payment('pi_' || (held ->> 'ref'));

  return held || jsonb_build_object('token', (
    select split_part(payload ->> 'manage_url', 'token=', 2) from public.notifications
    where template = 'booking_confirmed' and payload ->> 'ref' = held ->> 'ref'
  ));
end;
$$;

create function pg_temp.last_code(booking jsonb)
returns text
language sql
as $$
  select payload ->> 'code' from public.notifications
  where template = 'booking_code' and payload ->> 'ref' = booking ->> 'ref'
  order by created_at desc, id desc limit 1
$$;

create function pg_temp.age_codes(booking jsonb)
returns void
language sql
as $$
  update public.booking_codes set created_at = created_at - interval '1 minute' where booking_id = (booking ->> 'id')::uuid
$$;

create temp table b as
select pg_temp.book('09:00') as one, pg_temp.book('11:00') as two, pg_temp.book('13:00') as three, pg_temp.book('15:00') as four;

select is((select public.get_managed_booking(one ->> 'token') ->> 'is_verified' from b), 'false',
  'a link from an email starts unconfirmed');

select throws_ok($$ select public.reschedule_managed_booking((select one ->> 'token' from b), now() + interval '6 days') $$,
  'confirm_needed', 'rescheduling needs a code first');

select throws_ok($$ select public.get_cancellation((select one ->> 'token' from b)) $$, 'confirm_needed',
  'cancelling needs a code first');

select is((select public.send_booking_code(one ->> 'token') from b), '{"email": "n•••@codes.test", "sent": true}'::jsonb,
  'the code goes to the booking''s email, shown masked');

select ok((select pg_temp.last_code(one) ~ '^\d{6}$' from b), 'the email carries a 6-digit code');

select ok(
  (select payload ->> 'secure_url' like '%/manage?secure=%' from public.notifications
   where template = 'booking_code' and payload ->> 'ref' = (select one ->> 'ref' from b)),
  'and a "this wasn''t me" link');

select is((select public.send_booking_code(one ->> 'token') ->> 'sent' from b), 'false',
  'asking again within 30 seconds doesn''t send another');

select is((select count(*)::int from public.booking_codes where booking_id = (select (one ->> 'id')::uuid from b)), 1,
  'so there''s still one code');

select is((select public.verify_booking_code(one ->> 'token', '000000x') from b), 'wrong_code', 'a wrong code is refused');

select is((select public.verify_booking_code(one ->> 'token', pg_temp.last_code(one)) from b), 'verified',
  'the right code confirms the link');

select is((select public.get_managed_booking(one ->> 'token') ->> 'is_verified' from b), 'true', 'the page sees it confirmed');

select is((select public.verify_booking_code(one ->> 'token', pg_temp.last_code(one)) from b), 'expired',
  'a code works once');

select lives_ok($$ select public.get_cancellation((select one ->> 'token' from b)) $$, 'a confirmed link can cancel');

select lives_ok($$ select public.send_booking_code((select two ->> 'token' from b)) $$, 'a second booking gets its own code');

select is(
  (select array_agg(public.verify_booking_code(two ->> 'token', '999999x')) from b, generate_series(1, 5)),
  array['wrong_code', 'wrong_code', 'wrong_code', 'wrong_code', 'too_many_attempts'],
  'five wrong tries lock the code'
);

select is((select public.verify_booking_code(two ->> 'token', pg_temp.last_code(two)) from b), 'too_many_attempts',
  'even the right code is refused after that');

update public.booking_codes set expires_at = now() - interval '1 second' where booking_id = (select (two ->> 'id')::uuid from b);
select pg_temp.age_codes(two) from b;
select public.send_booking_code(two ->> 'token') from b;
update public.booking_codes set expires_at = now() - interval '1 second'
where booking_id = (select (two ->> 'id')::uuid from b) and used_at is null;

select is((select public.verify_booking_code(two ->> 'token', pg_temp.last_code(two)) from b), 'expired',
  'an expired code is refused');

select pg_temp.age_codes(two) from b;
select public.send_booking_code(two ->> 'token') from b;
select pg_temp.age_codes(two) from b;
select public.send_booking_code(two ->> 'token') from b;
select pg_temp.age_codes(two) from b;
select public.send_booking_code(two ->> 'token') from b;
select pg_temp.age_codes(two) from b;

select throws_ok($$ select public.send_booking_code((select two ->> 'token' from b)) $$, 'too_many_codes',
  'no more than 5 codes an hour');

select set_config('test.secure', (
  select split_part(payload ->> 'secure_url', 'secure=', 2) from public.notifications
  where template = 'booking_code' and payload ->> 'ref' = (select one ->> 'ref' from b)
), true);

select set_config('test.old_key', (select calendar_key from public.bookings where id = (select (one ->> 'id')::uuid from b)), true);

select is(public.secure_booking_link(current_setting('test.secure')) ->> 'stylist_name', 'Codes Test',
  '"this wasn''t me" works');

select is((select public.get_managed_booking(one ->> 'token') from b), null, 'the old link stops working');

select isnt((select calendar_key from public.bookings where id = (select (one ->> 'id')::uuid from b)),
  current_setting('test.old_key'), 'and so does the old calendar link');

select is(
  (select public.get_managed_booking(split_part(payload ->> 'manage_url', 'token=', 2)) ->> 'ref'
   from public.notifications where template = 'booking_link_reset' and payload ->> 'ref' = (select one ->> 'ref' from b)),
  (select one ->> 'ref' from b), 'a new, working link is emailed');

select throws_ok(
  $$ select public.get_booking_invite((
    select split_part(payload ->> 'save_details_url', 'token=', 2) from public.notifications
    where template = 'booking_confirmed' and payload ->> 'ref' = (select one ->> 'ref' from b)
  )) $$,
  'link_not_valid', 'the save-details link from the confirmation stops working too');

select ok(
  (select payload ->> 'save_details_url' like '%/save-details?token=%' from public.notifications
   where template = 'booking_link_reset' and payload ->> 'ref' = (select one ->> 'ref' from b)),
  'and a guest gets a fresh one with the new link');

select throws_ok($$ select public.secure_booking_link(current_setting('test.secure')) $$, 'already_used',
  'the reset works once');

update public.bookings set client_id = 'd1111111-1111-1111-1111-111111111111' where id = (select (three ->> 'id')::uuid from b);
grant select on b to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d1111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select set_config('test.owner', (select public.get_owner_manage_token(three ->> 'ref') from b), true);

select is(public.get_managed_booking(current_setting('test.owner')) ->> 'is_verified', 'true',
  'a signed-in owner needs no code');

reset role;
set local role anon;

select throws_ok($$ select public.send_notifications_now() $$, '42501', null, 'browsers can''t trigger the sender');

reset role;
update public.bookings set status = 'cancelled' where id = (select (three ->> 'id')::uuid from b);

select throws_ok($$ select public.send_booking_code((select three ->> 'token' from b)) $$, 'cannot_change',
  'no codes for a cancelled booking');

select public.send_booking_code(four ->> 'token') from b;
select set_config('test.first_code', (select pg_temp.last_code(four) from b), true);
select pg_temp.age_codes(four) from b;
select public.send_booking_code(four ->> 'token') from b;

select is((select public.verify_booking_code(four ->> 'token', current_setting('test.first_code')) from b), 'verified',
  'an earlier code still in date works after asking for a new one');

select is(
  (select count(*)::int from public.booking_codes where booking_id = (select (four ->> 'id')::uuid from b) and used_at is null), 0,
  'and every outstanding code is spent');

update public.notifications set status = 'sending' where template = 'booking_code' and payload ->> 'ref' = (select four ->> 'ref' from b);
update public.notifications set status = 'sent' where template = 'booking_code' and payload ->> 'ref' = (select four ->> 'ref' from b);

select ok(
  (select bool_and(not (payload ? 'code') and not (payload ? 'secure_url')) from public.notifications
   where template = 'booking_code' and payload ->> 'ref' = (select four ->> 'ref' from b)),
  'a sent email no longer keeps its code or links');

select * from finish();
rollback;
