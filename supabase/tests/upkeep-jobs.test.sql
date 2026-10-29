begin;
select plan(14);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('e1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@upkeep.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object(
      'business_name', 'Upkeep Test', 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
      'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@upkeep.test'
    )
  ), '{}');

create temp table upkeep as
select stylists.id as stylist, services.id as service
from public.stylists
join lateral (select id from public.services where stylist_id = stylists.id order by sort limit 1) services on true
where stylists.slug = 'upkeep-test';

create function pg_temp.book(starts timestamptz, booking_status text, email text default 'ada@upkeep.test')
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
    ends_at, block_ends_at, status, contact, terms, created_by, overlap_ok)
  select stylist, service, '{}', '{"service_name": "Silk press"}', 5000, 0, 60, starts, starts + interval '1 hour',
    starts + interval '1 hour', booking_status, jsonb_build_object('first', 'Ada', 'email', email),
    jsonb_build_object('mode', 'none', 'free_cancel_until', starts - interval '48 hours'), 'stylist', true
  from upkeep
  returning id
$$;

-- a booking made long ago whose start is now this close (the trigger would treat a move as a fresh time)
create function pg_temp.made_earlier(target uuid, starts timestamptz)
returns void
language sql
as $$
  alter table public.bookings disable trigger bookings_skip_passed_reminders;
  update public.bookings set starts_at = starts, ends_at = starts + interval '1 hour',
    block_ends_at = starts + interval '1 hour' where id = target;
  alter table public.bookings enable trigger bookings_skip_passed_reminders;
$$;

create function pg_temp.reminders(target uuid)
returns text[]
language sql
as $$
  select coalesce(array_agg(template order by template), '{}') from public.notifications
  where template like 'booking_reminder_%' and payload ->> 'ref' = (select ref from public.bookings where id = target)
$$;

create temp table ids as
select
  pg_temp.book(now() - interval '3 hours', 'arrived') as arrived_ended,
  pg_temp.book(now() - interval '70 minutes', 'arrived') as arrived_just_ended,
  pg_temp.book(now() - interval '25 hours', 'confirmed') as never_arrived,
  pg_temp.book(now() - interval '3 hours', 'confirmed') as no_show_window_open,
  pg_temp.book(now() + interval '72 hours', 'confirmed') as in_two_days,
  pg_temp.book(now() + interval '72 hours', 'confirmed') as tomorrow,
  pg_temp.book(now() + interval '20 hours', 'confirmed') as booked_late,
  pg_temp.book(now() + interval '72 hours', 'awaiting_confirmation') as awaiting;

grant select on ids to authenticated;

create temp table prepaid as select pg_temp.book(now() - interval '25 hours', 'confirmed') as id;

insert into public.payments (booking_id, kind, amount_pence, platform_fee_pence)
select id, 'booking', 5000, 0 from prepaid;

select public.complete_past_bookings();

select ok(
  (select status = 'completed' and unpaid_at is null from public.bookings where id = (select id from prepaid)),
  'a booking paid in full goes straight to Past');

select is(
  (select array_agg(bookings.status order by listed.position)
    from ids, unnest(array[arrived_ended, arrived_just_ended, never_arrived, no_show_window_open])
      with ordinality as listed (id, position)
    join public.bookings on bookings.id = listed.id),
  array['completed', 'arrived', 'completed', 'confirmed'],
  'arrived bookings complete an hour after they end; others once the no-show window closes');

select ok(
  (select bool_and(unpaid_at is not null) from public.bookings where status = 'completed'
    and id in (select unnest(array[arrived_ended, never_arrived]) from ids)),
  'both land in Due for checkout');

select is((select data from public.booking_events where booking_id = (select never_arrived from ids)
  and kind = 'auto_completed'), '{"from": "confirmed"}'::jsonb, 'and it''s logged');

select is((select status from public.bookings where id = (select arrived_just_ended from ids)), 'arrived',
  'an hour has to pass after the end');

select pg_temp.made_earlier((select in_two_days from ids), now() + interval '40 hours');
select pg_temp.made_earlier((select tomorrow from ids), now() + interval '20 hours');
select pg_temp.made_earlier((select awaiting from ids), now() + interval '20 hours');

select public.queue_due_reminders();

select is(pg_temp.reminders((select in_two_days from ids)), array['booking_reminder_48h'], 'two days before');
select is(pg_temp.reminders((select tomorrow from ids)), array['booking_reminder_24h'],
  'the day before, without a late two-day one');
select is(pg_temp.reminders((select booked_late from ids)), '{}'::text[],
  'a booking made the day before gets no reminder');
select is(pg_temp.reminders((select awaiting from ids)), '{}'::text[], 'unconfirmed bookings get none');

select public.queue_due_reminders();

select is(pg_temp.reminders((select tomorrow from ids)), array['booking_reminder_24h'], 'each is sent once');

update public.bookings set starts_at = now() + interval '5 days', ends_at = now() + interval '5 days 1 hour',
  block_ends_at = now() + interval '5 days 1 hour'
where id = (select tomorrow from ids);

select is(
  (select array[reminder_48_at, reminder_24_at] from public.bookings where id = (select tomorrow from ids)),
  array[null, null]::timestamptz[], 'moving the booking sets its reminders up again');

update public.stylists set created_at = now() - interval '10 days' where id = (select stylist from upkeep);

insert into public.daily_open_minutes (stylist_id, day, minutes)
select stylist, (now() at time zone 'Europe/London')::date - 1, 123 from upkeep
on conflict (stylist_id, day) do update set minutes = excluded.minutes;

select is(
  (public.get_period_kpis((select stylist from upkeep), (now() at time zone 'Europe/London')::date - 1,
    (now() at time zone 'Europe/London')::date - 1) ->> 'open_minutes')::integer,
  123, 'past days use the open time saved for them');

select is(
  (public.get_period_kpis((select stylist from upkeep), (now() at time zone 'Europe/London')::date - 30,
    (now() at time zone 'Europe/London')::date - 12) ->> 'open_minutes')::integer,
  0, 'days before the stylist joined weren''t open');

-- a recorded checkout of an auto-completed booking, then undone
update public.bookings set checkout = '{"method": "record", "from_status": "completed"}', unpaid_at = null
where id = (select never_arrived from ids);

insert into public.booking_events (booking_id, kind) select never_arrived, 'checked_out' from ids;

select set_config('request.jwt.claims',
  json_build_object('sub', 'e1111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.undo_checkout((select never_arrived from ids));
reset role;

select ok(
  (select status = 'completed' and unpaid_at is not null and checkout is null from public.bookings
    where id = (select never_arrived from ids)),
  'undoing its checkout puts it back in Due for checkout');

select * from finish();
rollback;
