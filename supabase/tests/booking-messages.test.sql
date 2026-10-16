begin;
select plan(17);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'owner@msg.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Msg', 'last_name', 'Owner', 'phone', '07700900456', 'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Message Test', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@msg.test', 'contact_phone', '07700900999')
  ), '{}');

update public.services set status = 'active', price_pence = 5000, duration_min = 60
where stylist_id = (select id from public.stylists where owner_id = 'a1111111-1111-1111-1111-111111111111');

update public.working_hours set is_open = true, start_time = '09:00', end_time = '18:00'
where stylist_id = (select id from public.stylists where owner_id = 'a1111111-1111-1111-1111-111111111111');

update public.stylists set status = 'live' where owner_id = 'a1111111-1111-1111-1111-111111111111';

create function pg_temp.book(at_time text, intent text, client uuid default null)
returns uuid
language plpgsql
as $$
declare
  held jsonb := public.hold_booking(
    (select id from public.services where stylist_id = (select id from public.stylists where slug = 'message-test') order by sort limit 1),
    '{}', (((now() at time zone 'Europe/London')::date + 3) + at_time::time) at time zone 'Europe/London'
  );
begin
  perform public.checkout_booking((held ->> 'id')::uuid, held ->> 'secret',
    '{"first":"Nia","last":"Okafor","email":"nia@msg.test","phone":"07700900123"}', '', null, null, null, client);

  update public.bookings set stripe_payment_intent_id = intent, site = 'https://dev.tiwarashouse.com'
  where id = (held ->> 'id')::uuid;

  perform public.confirm_booking_payment(intent);

  return (held ->> 'id')::uuid;
end;
$$;

create function pg_temp.message(booking uuid, channel text, template text)
returns public.notifications
language sql
as $$
  select * from public.notifications
  where notifications.channel = message.channel and notifications.template = message.template
    and payload ->> 'ref' = (select ref from public.bookings where id = booking)
$$;

create function pg_temp.token_of(url text)
returns public.booking_tokens
language sql
as $$
  select * from public.booking_tokens where token_hash = sha256(convert_to(split_part(url, 'token=', 2), 'UTF8'))
$$;

create temp table guest as select pg_temp.book('10:00', 'pi_guest') as id;

-- the client's email
select is((pg_temp.message((select id from guest), 'email', 'booking_confirmed')).to_address, 'nia@msg.test',
  'the client is emailed their confirmation');

select ok(
  (pg_temp.message((select id from guest), 'email', 'booking_confirmed')).payload ->> 'manage_url'
    like 'https://dev.tiwarashouse.com/manage?token=%',
  'the manage link goes back to the site they booked on'
);

select is(
  (pg_temp.token_of((pg_temp.message((select id from guest), 'email', 'booking_confirmed')).payload ->> 'manage_url')).purpose,
  'manage', 'the manage link''s token is stored, hashed'
);

select is(
  (pg_temp.token_of((pg_temp.message((select id from guest), 'email', 'booking_confirmed')).payload ->> 'manage_url')).expires_at,
  (select starts_at + interval '30 days' from public.bookings where id = (select id from guest)),
  'the manage link lasts until 30 days after the appointment'
);

select ok(
  (pg_temp.token_of((pg_temp.message((select id from guest), 'email', 'booking_confirmed')).payload ->> 'save_details_url')).expires_at
    between now() + interval '23 hours' and now() + interval '25 hours',
  'guests get a "save your details" link for 24 hours'
);

select is(
  (pg_temp.message((select id from guest), 'email', 'booking_confirmed')).payload ->> 'where',
  'Message Test, 1 High St, Manchester, M1 1AA', 'the email has the full address now the time is booked'
);

select is((pg_temp.message((select id from guest), 'email', 'booking_confirmed')).payload -> 'terms' ->> 'mode', 'none',
  'the email carries the terms they agreed to');

select is((select count(*)::int from public.booking_tokens where booking_id = (select id from guest) and token_hash is not null), 2,
  'only hashes are kept: one manage and one invite token');

-- the client's text
select is((pg_temp.message((select id from guest), 'sms', 'booking_confirmed')).to_address, '07700900123',
  'the client is texted too');

-- the stylist
select is((pg_temp.message((select id from guest), 'email', 'new_booking')).to_address, 'owner@msg.test',
  'the stylist is emailed about the new booking by default');

select ok((pg_temp.message((select id from guest), 'sms', 'new_booking')) is null,
  'the stylist isn''t texted unless they turned texts on');

-- a repeated payment event sends nothing more
select is(public.confirm_booking_payment('pi_guest'), 'duplicate', 'a repeated confirmation is a duplicate');

select is((select count(*)::int from public.notifications where payload ->> 'ref' = (select ref from public.bookings where id = (select id from guest))), 3,
  'and queues no more messages');

-- a signed-in client, and a stylist who wants texts instead of emails
insert into public.notification_preferences (stylist_id, event, email, sms)
select id, 'new_booking', false, true from public.stylists where slug = 'message-test';

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('a2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'client@msg.test', jsonb_build_object('account_type', 'client', 'first_name', 'Nia', 'last_name', 'Okafor', 'phone', '07700900123', 'terms_version', '2026-10'), '{}');

create temp table member as select pg_temp.book('13:00', 'pi_member', 'a2222222-2222-2222-2222-222222222222') as id;

select ok((pg_temp.message((select id from member), 'email', 'booking_confirmed')).payload ->> 'save_details_url' is null,
  'signed-in clients get no "save your details" link');

select ok((pg_temp.message((select id from member), 'email', 'new_booking')) is null,
  'a stylist who turned emails off isn''t emailed');

select is((pg_temp.message((select id from member), 'sms', 'new_booking')).to_address, '07700900999',
  'a stylist who turned texts on is texted at their business number');

-- texts while SMS isn't set up fail at once, without retries
update public.notifications set status = 'sending'
where id = (pg_temp.message((select id from member), 'sms', 'booking_confirmed')).id;

select public.mark_notification_failed_now((pg_temp.message((select id from member), 'sms', 'booking_confirmed')).id, 'SMS off');

select is(
  (select status || ': ' || last_error from public.notifications where id = (pg_temp.message((select id from member), 'sms', 'booking_confirmed')).id),
  'failed: SMS off', 'a text that can''t be sent is failed straight away'
);

select * from finish();
rollback;
