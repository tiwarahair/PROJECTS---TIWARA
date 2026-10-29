begin;
select plan(15);

create function pg_temp.sign_up(user_id uuid, user_email text, meta jsonb)
returns void
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, email_confirmed_at)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', user_email, meta, '{}',
    now())
$$;

create function pg_temp.stylist_meta(business text)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object(
      'business_name', business, 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
      'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'studio@purging.test'
    )
  )
$$;

select pg_temp.sign_up('a1111111-1111-1111-1111-111111111111', 'closing@purging.test',
  pg_temp.stylist_meta('Closing Studio'));
select pg_temp.sign_up('a2222222-2222-2222-2222-222222222222', 'open@purging.test', pg_temp.stylist_meta('Open Studio'));
select pg_temp.sign_up('a3333333-3333-3333-3333-333333333333', 'nia@purging.test', '{"first_name": "Nia"}');

create temp table stylist_ids as
select
  (select id from public.stylists where owner_id = 'a1111111-1111-1111-1111-111111111111') as closing,
  (select id from public.stylists where owner_id = 'a2222222-2222-2222-2222-222222222222') as open;

create function pg_temp.book(stylist uuid, booking_status text, days integer)
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, client_id, service_id, choices, snapshot, price_pence, fee_pence, minutes,
    starts_at, ends_at, block_ends_at, status, contact, notes, allergies, allergies_consented_at, address, location,
    terms, created_by)
  select stylists.id, 'a3333333-3333-3333-3333-333333333333',
    (select id from public.services where stylist_id = stylists.id order by sort limit 1), '{}',
    '{"service_name": "Silk press"}', 6000, 140, 60, now() + make_interval(days => days),
    now() + make_interval(days => days, hours => 1), now() + make_interval(days => days, hours => 1), booking_status,
    '{"first": "Nia", "last": "Okafor", "email": "nia@purging.test", "phone": "07700900123"}', 'Bring photos',
    'Sensitive scalp', now(), '{"line1": "2 Low St"}', stylists.location, '{"mode": "deposit"}', 'client'
  from public.stylists where id = stylist
  returning id
$$;

create temp table ids as
select
  pg_temp.book((select closing from stylist_ids), 'completed', -10) as recent,
  pg_temp.book((select closing from stylist_ids), 'completed', -200) as old,
  pg_temp.book((select closing from stylist_ids), 'cancelled', -12) as cancelled,
  pg_temp.book((select open from stylist_ids), 'completed', -10) as elsewhere;

update public.bookings set protection_status = 'pending' where id = (select cancelled from ids);

insert into public.payments (booking_id, kind, amount_pence, platform_fee_pence, created_at)
values ((select recent from ids), 'booking', 6140, 140, now() - interval '10 days'),
  ((select old from ids), 'booking', 6140, 140, now() - interval '200 days');

update public.stylist_clients
set hair_notes = 'Fine edges', photo_path = stylist_id || '/' || id || '/photo.jpg', blocked_at = now(),
  client_id = 'a3333333-3333-3333-3333-333333333333'
where stylist_id in (select closing from stylist_ids union select open from stylist_ids);

insert into public.client_sensitivities (client_id, stylist_id, text, consent_wording)
select 'a3333333-3333-3333-3333-333333333333', id, 'Sensitive scalp', 'I agree'
from public.stylists where id in (select closing from stylist_ids union select open from stylist_ids);

insert into public.booking_notes (booking_id, note) values ((select recent from ids), 'Prefers low tension');

select public.create_booking_token((select recent from ids), 'manage', now() + interval '1 day');

insert into public.booking_codes (booking_id, code_hash, expires_at)
values ((select recent from ids), '\x00', now() + interval '10 minutes');

insert into public.booking_events (booking_id, kind, data)
values ((select recent from ids), 'address_changed', '{"by": "client", "from": {"line1": "2 Low St"}, "to": "9 New Rd"}');

insert into storage.objects (bucket_id, name)
select 'client-photos', photo_path from public.stylist_clients
where stylist_id in (select closing from stylist_ids union select open from stylist_ids);

update public.stylists set status = 'closed', closed_at = now() - interval '16 days'
where id = (select closing from stylist_ids);

select is(array(select public.get_due_closure_client_photos()),
  array(select photo_path from public.stylist_clients where stylist_id = (select closing from stylist_ids)),
  'the clean-up lists only the closed business''s client photos');

select lives_ok($$select public.purge_closed_businesses()$$, 'the purge runs, a cancelled unconfirmed booking too');

select is(
  (select jsonb_agg(to_jsonb(clients) - 'id' - 'stylist_id' - 'created_at' - 'deleted_at')
    from public.stylist_clients as clients where stylist_id = (select closing from stylist_ids)),
  '[{"first": "Deleted client", "last": null, "phone": null, "email": null, "photo_path": null, "hair_notes": null,
    "blocked_at": null, "client_id": null}]'::jsonb,
  'the client list keeps no name, contact, notes, photo, block or account link'
);

select isnt((select deleted_at from public.stylist_clients where stylist_id = (select closing from stylist_ids)), null,
  'and the client is marked deleted');

select is((select count(*) from public.client_sensitivities where stylist_id = (select closing from stylist_ids)),
  0::bigint, 'sensitivities shared with the business go');

select is((select contact from public.bookings where id = (select recent from ids)),
  '{"first": "Nia", "last": "Okafor", "email": "nia@purging.test", "account_deleted": true}'::jsonb,
  'a booking paid in the last 120 days keeps the name and email for disputes');

select is((select contact from public.bookings where id = (select old from ids)), '{"account_deleted": true}'::jsonb,
  'an older booking keeps none of the client''s details');

select is(
  (select count(*) from public.bookings where stylist_id = (select closing from stylist_ids)
    and (notes is not null or allergies is not null or allergies_consented_at is not null or address is not null
      or location is not null)),
  0::bigint, 'notes, allergies, the address and location go from every booking');

select is(
  (select count(*) from public.booking_notes where booking_id = (select recent from ids))
    + (select count(*) from public.booking_tokens where booking_id = (select recent from ids))
    + (select count(*) from public.booking_codes where booking_id = (select recent from ids)),
  0::bigint, 'the stylist''s booking notes, manage links and codes go');

select is((select data from public.booking_events where booking_id = (select recent from ids) and kind = 'address_changed'),
  '{"by": "client"}'::jsonb, 'address changes no longer show the address');

select ok(
  (select price_pence = 6000 and status = 'completed' and snapshot ->> 'service_name' = 'Silk press'
    and starts_at < now() from public.bookings where id = (select recent from ids))
  and (select count(*) from public.payments where booking_id in ((select recent from ids), (select old from ids))) = 2,
  'the service, times, status and money stay'
);

select ok(
  (select contact ->> 'phone' = '07700900123' and notes is not null from public.bookings where id = (select elsewhere from ids))
  and (select hair_notes from public.stylist_clients where stylist_id = (select open from stylist_ids)) = 'Fine edges'
  and exists (select 1 from public.client_sensitivities where stylist_id = (select open from stylist_ids)),
  'another business''s clients are untouched'
);

select is(array(select public.get_due_closure_client_photos()), '{}'::text[], 'nothing is listed once purged');

update public.payments set created_at = now() - interval '130 days' where booking_id = (select recent from ids);

select is(public.purge_deleted_client_contacts(), 1, 'the nightly purge picks the booking up after 120 days');

select is((select contact from public.bookings where id = (select recent from ids)), '{"account_deleted": true}'::jsonb,
  'and clears the name and email');

select * from finish();
rollback;
