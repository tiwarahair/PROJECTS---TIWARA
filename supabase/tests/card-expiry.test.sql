begin;
select plan(13);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('a2222222-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@card.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object(
      'business_name', 'Card Test', 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
      'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@card.test'
    )
  ), '{}');

create temp table card as
select stylists.id as stylist, services.id as service
from public.stylists
join lateral (select id from public.services where stylist_id = stylists.id order by sort limit 1) services on true
where stylists.slug = 'card-test';

create function pg_temp.book(starts timestamptz, mode text, email text default 'ada@card.test')
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
    ends_at, block_ends_at, status, contact, terms, created_by, overlap_ok, stripe_payment_method_id, card_label,
    stripe_customer_id)
  select stylist, service, '{}', '{"service_name": "Silk press"}', 5000, 163, 60, starts, starts + interval '1 hour',
    starts + interval '1 hour', 'confirmed', jsonb_build_object('first', 'Ada', 'email', email),
    jsonb_build_object('mode', mode), 'client', true, 'pm_old', 'Visa •••• 4242', 'cus_1'
  from card
  returning id
$$;

create temp table ids as
select
  pg_temp.book(now() + interval '5 days', 'deposit') as soon,
  pg_temp.book(now() + interval '20 days', 'deposit') as later,
  pg_temp.book(now() + interval '5 days', 'full') as full_payment,
  pg_temp.book(now() + interval '3 days', 'card', null) as no_email;

select is(
  (select array_agg(booking_id order by booking_id) from public.claim_card_checks(50)
    where booking_id in (select unnest(array[soon, later, full_payment, no_email]) from ids)),
  (select array_agg(id order by id) from public.bookings where id in (select unnest(array[soon, no_email]) from ids)),
  'deposit and card protection bookings within a week are checked; full payment keeps no card');

select public.save_card_check((select soon from ids), true);

select ok((select card_update_requested_at is not null and card_checked_at is not null from public.bookings
  where id = (select soon from ids)), 'an expiring card asks the client for a new one');

select is(
  (select payload ->> 'update_url' like '%/card?token=%' from public.notifications
    where template = 'card_update_needed' and to_address = 'ada@card.test'),
  true, 'by email, with a link to the update-card page');

select public.save_card_check((select no_email from ids), true);

select ok((select card_failed_at is not null from public.bookings where id = (select no_email from ids)),
  'with no email to ask, the booking is unprotected straight away');

select is((select count(*) from public.notifications where template = 'card_not_replaced' and to_address = 'owner@card.test'),
  1::bigint, 'and the stylist is told');

select is(public.fail_unreplaced_cards(), 0, 'the client gets at least 12 hours to replace it');

update public.bookings set starts_at = now() + interval '40 hours', ends_at = now() + interval '41 hours',
  block_ends_at = now() + interval '41 hours'
where id = (select soon from ids);

update public.bookings set card_update_requested_at = now() - interval '13 hours' where id = (select soon from ids);

select is(public.fail_unreplaced_cards(), 1, 'two days before, a card that wasn''t replaced fails');

update public.bookings set starts_at = now() + interval '30 days', ends_at = now() + interval '30 days 1 hour',
  block_ends_at = now() + interval '30 days 1 hour'
where id = (select no_email from ids);

select is(
  (select array[card_checked_at, card_update_requested_at, card_failed_at] from public.bookings
    where id = (select no_email from ids)),
  array[null, null, null]::timestamptz[], 'moving a booking checks its card again for the new date');

-- the client adds a new card on the update-card page
update public.bookings set card_setup_intent_id = 'seti_1' where id = (select soon from ids);
select public.save_card_update((select soon from ids), 'seti_other', 'pm_wrong', 'Mastercard •••• 4444');

select is((select stripe_payment_method_id from public.bookings where id = (select soon from ids)), 'pm_old',
  'only the setup made for this booking can replace the card');

select ok(
  exists (select 1 from public.get_unsaved_card_updates(20) where booking_id = (select soon from ids)
    and setup_intent_id = 'seti_1'),
  'a card set up but not yet saved is looked up by the hourly job');

select public.save_card_update((select soon from ids), 'seti_1', 'pm_new', 'Mastercard •••• 4444');

select ok(
  not exists (select 1 from public.get_unsaved_card_updates(20) where booking_id = (select soon from ids)),
  'and not once it''s saved');

select is(
  (select jsonb_build_array(stripe_payment_method_id, card_label, card_update_requested_at, card_failed_at)
    from public.bookings where id = (select soon from ids)),
  '["pm_new", "Mastercard •••• 4444", null, null]'::jsonb,
  'a new card replaces the old one and the booking is protected again');

create temp table link as
select public.create_booking_token((select soon from ids), 'card', now() + interval '2 days') as token;

select is(public.get_card_update((select token from link)) ->> 'state', 'updated',
  'the link then says the card is updated');

select * from finish();
rollback;
