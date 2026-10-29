begin;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('a3333333-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@remind.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object(
      'business_name', 'Remind Test', 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
      'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@remind.test'
    )
  ), '{}');

create temp table remind as
select stylists.id as stylist, services.id as service
from public.stylists
join lateral (select id from public.services where stylist_id = stylists.id order by sort limit 1) services on true
where stylists.slug = 'remind-test';

create function pg_temp.book(email text, protection text default 'not_required', booking_status text default 'completed')
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
    ends_at, block_ends_at, status, contact, terms, created_by, overlap_ok, protection_status)
  select stylist, service, '{}', '{"service_name": "Silk press"}', 5000, 0, 60, now() - interval '2 days',
    now() - interval '2 days' + interval '1 hour', now() - interval '2 days' + interval '1 hour', booking_status,
    jsonb_strip_nulls(jsonb_build_object('first', 'Ada', 'email', email, 'phone', '07700900123')),
    '{"mode": "none"}', 'stylist', true, protection
  from remind
  returning id
$$;

create function pg_temp.link(target uuid, expires timestamptz)
returns uuid
language sql
as $$
  insert into public.payment_links (booking_id, purpose, amount_pence, token_hash, expires_at)
  values (target, 'balance', 3000, sha256(convert_to(gen_random_uuid()::text, 'UTF8')), expires)
  returning id
$$;

create temp table ids as
select
  pg_temp.link(pg_temp.book('ada@remind.test'), now() + interval '1 day') as expiring,
  pg_temp.link(pg_temp.book('bea@remind.test'), now() + interval '5 days') as fresh;

update public.payment_links set token_hash = sha256(convert_to('first-token', 'UTF8'))
where id = (select expiring from ids);

select is(public.remind_expiring_links(), 1, 'only a link two days from running out is reminded');

select is(
  (select payload ->> 'is_reminder' from public.notifications where template = 'balance_due'
    and to_address = 'ada@remind.test'),
  'true', 'with the same email, marked as a reminder');

select ok(
  (select reminder_token_hash is not null and sent_count = 1 and expires_at < now() + interval '2 days'
    from public.payment_links where id = (select expiring from ids)),
  'a second link that keeps its expiry, and not one of the stylist''s resends');

create temp table reminder as
select split_part(payload ->> 'pay_url', '?token=', 2) as token from public.notifications
where template = 'balance_due' and to_address = 'ada@remind.test';

select ok(
  public.get_payment_link('first-token') is not null and public.get_payment_link((select token from reminder)) is not null,
  'the link first emailed still works, and so does the reminder''s');

update public.payment_links set token_hash = sha256(convert_to('resent-token', 'UTF8'))
where id = (select expiring from ids);

select ok(
  public.get_payment_link('first-token') is null and public.get_payment_link((select token from reminder)) is null
    and public.get_payment_link('resent-token') is not null,
  'a resend makes both earlier links stop working');

select throws_ok($$ select public.start_link_payment('first-token') $$, 'link_not_valid',
  'and they can''t be paid');

select is(public.remind_expiring_links(), 0, 'once only');

update public.payment_links set expires_at = now() + interval '7 days', sent_count = 2
where id = (select expiring from ids);

select is((select reminded_at from public.payment_links where id = (select expiring from ids)), null,
  'sending it again starts a new week with its own reminder');

-- a booking waiting for its confirm link needs an email
select throws_ok($$ select pg_temp.book(null, 'pending', 'awaiting_confirmation') $$,
  'email_required', 'a protected booking can''t be made for a client with no email');

select lives_ok($$ select pg_temp.book('cat@remind.test', 'pending', 'awaiting_confirmation') $$,
  'with an email it can');

select throws_ok(
  $$ update public.bookings set contact = contact - 'email' where contact ->> 'email' = 'cat@remind.test' $$,
  'email_required', 'nor changed to a client without one while it waits');

select * from finish();
rollback;
