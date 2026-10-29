begin;
select plan(3);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('c9111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'owner@next.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Next', 'last_name', 'Owner', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Next Start Test', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@next.test')
  ), '{}');

create temp table shop as
select stylists.id as stylist, services.id as service, (now() at time zone 'Europe/London')::date + 3 as day
from public.stylists
join lateral (select id from public.services where stylist_id = stylists.id order by sort limit 1) services on true
where stylists.slug = 'next-start-test';

update public.services set status = 'active', price_pence = 5000, duration_min = 60, extra_time_min = 60,
  sizes_on = false, lengths_on = false
where id = (select service from shop);
delete from public.service_variations where service_id = (select service from shop);
update public.stylists set status = 'live' where id = (select stylist from shop);
update public.booking_rules set default_extra_minutes = 0, min_notice_minutes = 0 where stylist_id = (select stylist from shop);
update public.working_hours set is_open = true, start_time = '09:00', end_time = '18:00'
where stylist_id = (select stylist from shop);

insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
  ends_at, block_ends_at, status, contact, terms, created_by, overlap_ok)
select stylist, service, '{}', '{"service_name": "Silk press"}', 5000, 0, 60,
  (day + time '10:00') at time zone 'Europe/London', (day + time '11:00') at time zone 'Europe/London',
  (day + time '11:00') at time zone 'Europe/London', 'confirmed', '{"first": "Ada"}', '{"mode": "none"}', 'stylist', true
from shop;

create temp table first_bookable as
select min(slot) as slot from shop, public.get_available_slots(shop.service, '{}', shop.day, shop.day) as slot;

select is(
  (select (slot at time zone 'Europe/London')::time from first_bookable),
  '11:00'::time, 'the booking page can''t fit the service and its own extra time before the 10:00 booking'
);

select is(
  public.get_next_start((select stylist from shop), 60, (select day from shop), null, null),
  (select slot from first_bookable),
  'next available agrees, using the service''s own extra time'
);

update public.services set duration_min = 10 where id = (select service from shop);

select is(
  (public.get_next_start((select stylist from shop), 10, (select day from shop), '16:00', null)
    at time zone 'Europe/London')::time,
  '16:00'::time, 'a service shorter than 15 minutes is timed as 15, as at booking'
);

select * from finish();
rollback;
