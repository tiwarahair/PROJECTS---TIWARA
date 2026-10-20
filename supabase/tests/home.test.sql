begin;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@home.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object(
      'business_name', 'Home Test', 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
      'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'home@home.test'
    )
  ), '{}');

create temp table home as
select stylists.id as stylist, services.id as service,
  (now() at time zone 'Europe/London')::date as today
from public.stylists
join lateral (select id from public.services where stylist_id = stylists.id order by sort limit 1) services on true
where stylists.slug = 'home-test';

grant select on home to authenticated;

-- open 09:00–17:00 every day, an hour blocked today, and closed yesterday
update public.working_hours set is_open = true, start_time = '09:00', end_time = '17:00'
where stylist_id = (select stylist from home);

insert into public.time_blocks (stylist_id, starts_on, start_time, end_time, all_day, repeat)
select stylist, today, '12:00', '13:00', false, 'none' from home;

insert into public.closed_periods (stylist_id, starts_on, ends_on)
select stylist, today - 1, today - 1 from home;

insert into public.stylist_clients (id, stylist_id, first)
select 'c1111111-1111-1111-1111-111111111111'::uuid, stylist, 'Returning' from home
union all select 'c2222222-2222-2222-2222-222222222222', stylist, 'New' from home;

create function pg_temp.book(client uuid, day_offset integer, hour integer, booking_status text, made_by text)
returns void
language sql
as $$
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
    ends_at, block_ends_at, status, contact, terms, stylist_client_id, created_by)
  select stylist, service, '{}', '{"service_name": "Silk press"}', 5000, 0, 60,
    ((today + day_offset) + make_interval(hours => hour)) at time zone 'Europe/London',
    ((today + day_offset) + make_interval(hours => hour + 1)) at time zone 'Europe/London',
    ((today + day_offset) + make_interval(hours => hour + 1)) at time zone 'Europe/London',
    booking_status, '{"first": "Ada"}', '{"mode": "none"}', client, made_by
  from home
$$;

select pg_temp.book('c1111111-1111-1111-1111-111111111111', -3, 10, 'completed', 'stylist');
select pg_temp.book('c1111111-1111-1111-1111-111111111111', 0, 10, 'confirmed', 'stylist');
select pg_temp.book('c2222222-2222-2222-2222-222222222222', 0, 14, 'confirmed', 'client');
select pg_temp.book(null, 0, 15, 'cancelled', 'client');

-- the client-made bookings were confirmed an hour apart; the stylist also recorded a cancellation for a client
update public.bookings set paid_at = now() - interval '1 hour'
where stylist_id = (select stylist from home) and status = 'cancelled';

update public.bookings set paid_at = now()
where stylist_id = (select stylist from home) and created_by = 'client' and status = 'confirmed';

insert into public.booking_events (booking_id, kind, data)
select id, 'cancelled', '{"by": "client", "recorded_by": "stylist"}'
from public.bookings where stylist_id = (select stylist from home) and stylist_client_id is not null
  and status = 'confirmed' and created_by = 'stylist';

-- money: £50 taken in cash today at 10:30 and £10 of it given back; £20 yesterday
insert into public.payments (booking_id, kind, method, amount_pence, created_at)
select bookings.id, 'balance', 'cash', amount, ((select today from home) + day_offset + taken) at time zone 'Europe/London'
from public.bookings
cross join (values (5000, 0, interval '10 hours 30 minutes'), (2000, -1, interval '15 hours')) as money (amount, day_offset, taken)
where bookings.stylist_id = (select stylist from home) and bookings.status = 'confirmed' and bookings.created_by = 'stylist';

insert into public.refunds (booking_id, amount_pence, reason, method, created_at)
select bookings.id, 1000, 'manual', 'cash', ((select today from home) + interval '11 hours') at time zone 'Europe/London'
from public.bookings
where bookings.stylist_id = (select stylist from home) and bookings.status = 'confirmed' and bookings.created_by = 'stylist';

select set_config('request.jwt.claims',
  json_build_object('sub', 'a1111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  (select jsonb_build_array(kpis #> '{current,revenue_pence}', kpis #> '{previous,revenue_pence}', kpis -> 'buckets')
    from public.get_studio_kpis((select stylist from home), 1) as kpis),
  jsonb_build_array(4000, 2000, jsonb_build_object((select today from home)::text || 'T10', 5000)),
  'revenue is takings less refunds for each day; the chart shows takings by UK hour');

select is(
  public.get_studio_kpis((select stylist from home), 1) -> 'current',
  '{"bookings": 2, "booked_minutes": 120, "open_minutes": 420, "new_clients": 1, "revenue_pence": 4000}'::jsonb,
  'today: cancelled bookings left out, the blocked hour taken off, a returning client not counted as new');

select is((public.get_studio_kpis((select stylist from home), 1) -> 'previous' ->> 'open_minutes')::integer, 0,
  'a closed day has no open time');

select is((public.get_studio_kpis((select stylist from home), 7) -> 'current' ->> 'new_clients')::integer, 2,
  'over the week both clients had their first visit');

select throws_ok(
  $$ select public.get_studio_kpis((select id from public.stylists where slug <> 'home-test' limit 1), 7) $$,
  'not_owner', 'another stylist''s numbers are refused');

select is(
  (select array_agg(kind order by at) from public.get_studio_activity((select stylist from home), 10)),
  array['new_booking', 'new_booking'],
  'the feed lists bookings clients made, not the stylist''s own (nor cancellations they recorded)');

select is(
  (select bool_and(is_unread) from public.get_studio_activity((select stylist from home), 10)), true,
  'new items are unread');

select public.mark_activity_seen((select stylist from home), now() - interval '30 minutes');

select is(
  (select array_agg(is_unread order by at) from public.get_studio_activity((select stylist from home), 10)),
  array[false, true],
  'marking read covers only what was shown, so a later booking stays unread');

select public.mark_activity_seen((select stylist from home), now());

select is(
  (select bool_or(is_unread) from public.get_studio_activity((select stylist from home), 10)), false,
  'and everything is read once marked up to now');

reset role;

select * from finish();
rollback;
