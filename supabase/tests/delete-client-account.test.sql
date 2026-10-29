begin;
select plan(24);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@deleting.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Crown Studio', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@deleting.test')
  ), '{}'),
  ('a2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'nia@deleting.test', '{"first_name": "Nia"}', '{}');

create function pg_temp.book(booking_status text, days integer)
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, client_id, service_id, choices, snapshot, price_pence, fee_pence, minutes,
    starts_at, ends_at, block_ends_at, status, contact, notes, allergies, address, terms, created_by)
  select stylists.id, 'a2222222-2222-2222-2222-222222222222',
    (select id from public.services where stylist_id = stylists.id order by sort limit 1), '{}',
    '{"service_name": "Silk press"}', 6000, 140, 60, now() + make_interval(days => days),
    now() + make_interval(days => days, hours => 1), now() + make_interval(days => days, hours => 1), booking_status,
    '{"first": "Nia", "last": "Okafor", "email": "nia@deleting.test", "phone": "07700900123"}', 'Bring photos',
    'Sensitive scalp', '{"line1": "2 Low St"}', '{"mode": "deposit"}', 'client'
  from public.stylists where owner_id = 'a1111111-1111-1111-1111-111111111111'
  returning id
$$;

create function pg_temp.book_as_guest(booking_status text, days integer)
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
    ends_at, block_ends_at, status, contact, allergies, terms, created_by)
  select stylists.id, (select id from public.services where stylist_id = stylists.id order by sort limit 1), '{}',
    '{"service_name": "Silk press"}', 6000, 140, 60, now() + make_interval(days => days),
    now() + make_interval(days => days, hours => 1), now() + make_interval(days => days, hours => 1), booking_status,
    '{"first": "Nia", "email": "NIA@deleting.test", "phone": "07700900123"}', 'Sensitive scalp', '{"mode": "deposit"}',
    'client'
  from public.stylists where owner_id = 'a1111111-1111-1111-1111-111111111111'
  returning id
$$;

update auth.users set email_confirmed_at = now() where id = 'a2222222-2222-2222-2222-222222222222';

create temp table ids as
select
  pg_temp.book('confirmed', 3) as upcoming,
  pg_temp.book('completed', -10) as recent,
  pg_temp.book('completed', -200) as old,
  pg_temp.book_as_guest('completed', -300) as guest;

insert into public.payments (booking_id, kind, amount_pence, platform_fee_pence, created_at)
values ((select recent from ids), 'booking', 6140, 140, now() - interval '10 days'),
  ((select old from ids), 'booking', 6140, 140, now() - interval '200 days');

select public.create_booking_token((select recent from ids), 'manage', now() + interval '1 day');

insert into public.booking_events (booking_id, kind, data)
values ((select recent from ids), 'address_changed', '{"by": "stylist", "from": {"line1": "2 Low St"}, "to": "9 New Rd"}');

insert into public.notifications (channel, to_address, template, payload)
values ('email', 'nia@deleting.test', 'booking_updated_by_stylist', '{}');

create temp table linked as
select stylist_client_id from public.bookings where id = (select recent from ids);

select isnt((select stylist_client_id from linked), null, 'the booking starts on the stylist''s client card');

create function pg_temp.sign_in(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true)
$$;

create function pg_temp.blockers()
returns jsonb
language sql
as $$
  select public.get_deletion_blockers('a2222222-2222-2222-2222-222222222222')
$$;

select is(jsonb_array_length(pg_temp.blockers() -> 'bookings'), 1, 'an upcoming booking stops the deletion');

update public.bookings set status = 'cancelled' where id = (select upcoming from ids);

insert into public.booking_fees (booking_id, kind, amount_pence, kept_pence, refund_pence, charge_pence, status, charge_after)
values ((select upcoming from ids), 'late_cancel', 1000, 0, 0, 1000, 'unpaid', now());

select is((pg_temp.blockers() ->> 'owes_money')::boolean, true, 'so does an unpaid fee');

update public.booking_fees set status = 'paid' where booking_id = (select upcoming from ids);

create temp table guest_upcoming as select pg_temp.book_as_guest('confirmed', 5) as id;

select is(jsonb_array_length(pg_temp.blockers() -> 'bookings'), 1,
  'a guest booking under the same email stops it too');

update public.bookings set status = 'cancelled' where id = (select id from guest_upcoming);

select is(pg_temp.blockers(), '{"bookings": [], "owes_money": false, "has_business": false}'::jsonb,
  'with neither, the client can delete their account');

update public.bookings set unpaid_at = now() where id = (select recent from ids);

select is((pg_temp.blockers() ->> 'owes_money')::boolean, false,
  'a paid booking left in Due for checkout doesn''t stop it');

update public.bookings set unpaid_at = now() where id = (select guest from ids);

select is((pg_temp.blockers() ->> 'owes_money')::boolean, true, 'one with money still to pay does');

update public.bookings set unpaid_at = null where id in ((select recent from ids), (select guest from ids));

select is((public.get_deletion_blockers('a1111111-1111-1111-1111-111111111111') ->> 'has_business')::boolean, true,
  'a stylist can''t delete their login from here');

select public.anonymise_client_bookings('a2222222-2222-2222-2222-222222222222');

select is((select contact from public.bookings where id = (select recent from ids)),
  '{"first": "Nia", "last": "Okafor", "email": "nia@deleting.test", "account_deleted": true}'::jsonb,
  'a booking paid in the last 120 days keeps the name and email, not the phone');

select is((select contact from public.bookings where id = (select old from ids)), '{"account_deleted": true}'::jsonb,
  'an older booking keeps none of the client''s details');

select is((select count(*) from public.bookings where client_id = 'a2222222-2222-2222-2222-222222222222'
  and (notes is not null or allergies is not null or address is not null)), 0::bigint,
  'notes, allergies and the address go from every booking');

select is((select contact from public.bookings where id = (select guest from ids)), '{"account_deleted": true}'::jsonb,
  'guest bookings made with the same email are anonymised too');

select is((select allergies from public.bookings where id = (select guest from ids)), null,
  'including their allergies');

select is((select price_pence from public.bookings where id = (select recent from ids)), 6000,
  'the booking''s money stays');

select is((select stylist_client_id from public.bookings where id = (select recent from ids)),
  (select stylist_client_id from linked), 'the stylist keeps the booking on their client card');

select is((select count(*) from public.booking_tokens where booking_id = (select recent from ids)), 0::bigint,
  'manage links stop working');

select is((select data from public.booking_events where booking_id = (select recent from ids) and kind = 'address_changed'),
  '{"by": "stylist"}'::jsonb, 'address changes in the booking history lose the addresses');

select is((select count(*) from public.notifications where to_address = 'nia@deleting.test'), 0::bigint,
  'emails to the client are deleted');

select pg_temp.sign_in('a2222222-2222-2222-2222-222222222222');
set local role authenticated;

select is(public.send_account_code(), 'n•••@deleting.test', 'the code goes to the login email, shown masked');

reset role;

select is(public.use_account_code('a2222222-2222-2222-2222-222222222222', '000000x'), 'wrong_code',
  'a wrong code is refused');

update public.account_codes set code_hash = public.hash_booking_code(user_id, '123456')
where user_id = 'a2222222-2222-2222-2222-222222222222';

select is(public.use_account_code('a2222222-2222-2222-2222-222222222222', '123456'), 'verified',
  'the emailed code confirms it''s them');

delete from auth.users where id = 'a2222222-2222-2222-2222-222222222222';

select is((select count(*) from public.bookings where client_id is null and id in (select recent from ids
  union select old from ids)), 2::bigint, 'deleting the login keeps the bookings');

select is(public.purge_deleted_client_contacts(), 0, 'the nightly purge waits for the 120 days');

update public.payments set created_at = now() - interval '121 days' where booking_id = (select recent from ids);
select public.purge_deleted_client_contacts();

select is((select contact from public.bookings where id = (select recent from ids)), '{"account_deleted": true}'::jsonb,
  'then clears the name and email');

select * from finish();
rollback;
