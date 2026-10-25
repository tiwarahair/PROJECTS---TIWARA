begin;
select plan(27);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'owner@admin.test',
    jsonb_build_object(
      'account_type', 'stylist', 'first_name', 'Kemi', 'last_name', 'Okafor', 'phone', '07700900111',
      'terms_version', '2026-10',
      'stylist', jsonb_build_object(
        'business_name', 'Admin Test', 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
        'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
        'contact_email', 'shop@admin.test'
      )
    ), '{}'),
  ('a2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'yasmin@admin.test',
    jsonb_build_object('account_type', 'client', 'first_name', 'Yasmin', 'last_name', 'Bello',
      'phone', '07700900112', 'terms_version', '2026-10'), '{}'),
  ('a3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'amara@admin.test',
    jsonb_build_object('account_type', 'client', 'first_name', 'Amara', 'last_name', 'Okafor',
      'phone', '07700900113', 'terms_version', '2026-10'), '{}'),
  ('a4444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'tobi@admin.test',
    jsonb_build_object('account_type', 'client', 'first_name', 'Tobi', 'last_name', 'Adeyemi',
      'phone', '07700900114', 'terms_version', '2026-10'), '{"is_admin": true}');

update public.stylists set status = 'live' where slug = 'admin-test';

create temp table shop as
select stylists.id as stylist, stylists.slug::text as slug, services.id as service
from public.stylists
join lateral (select id from public.services where stylist_id = stylists.id order by sort limit 1) services on true
where stylists.slug = 'admin-test';

create function pg_temp.book()
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, service_id, client_id, choices, snapshot, price_pence, fee_pence, minutes,
    starts_at, ends_at, block_ends_at, status, completed_at, contact, terms, created_by, overlap_ok)
  select stylist, service, 'a2222222-2222-2222-2222-222222222222', '{}', '{"service_name": "Knotless braids"}', 5000, 0,
    60, now() - interval '5 hours', now() - interval '4 hours', now() - interval '4 hours', 'completed',
    now() - interval '3 hours', '{"first": "Yasmin", "last": "Bello", "email": "yasmin@admin.test"}',
    '{"mode": "none"}', 'stylist', true
  from shop
  returning id
$$;

create function pg_temp.sign_in(user_id uuid, admin boolean default false, level text default 'aal1')
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', user_id, 'role', 'authenticated', 'aal', level,
    'app_metadata', json_build_object('is_admin', admin)
  )::text, true);
$$;

create temp table clock as select now() - interval '1 second' as started;

create function pg_temp.emails(template_name text)
returns bigint
language sql
as $$
  select count(*) from public.notifications
  where template = template_name and created_at >= (select started from clock)
$$;


create temp table ids as
select pg_temp.book() as threatened, pg_temp.book() as spammy, pg_temp.book() as kept, pg_temp.book() as fourth;

select public.submit_review(public.create_booking_token(threatened, 'review', now() + interval '1 day'), 1, 'Call 07700 900123')
from ids;
select public.submit_review(public.create_booking_token(spammy, 'review', now() + interval '1 day'), 5, 'Follow @someone')
from ids;
select public.submit_review(public.create_booking_token(kept, 'review', now() + interval '1 day'), 4, 'Lovely') from ids;
select public.submit_review(public.create_booking_token(fourth, 'review', now() + interval '1 day'), 3, 'Fine') from ids;

create temp table posted as
select
  (select id from public.reviews where booking_id = threatened) as threatened,
  (select id from public.reviews where booking_id = spammy) as spammy,
  (select id from public.reviews where booking_id = kept) as kept
from ids;

create temp table baseline as
select
  (select count(distinct review_id) from public.review_reports where status = 'open') as open,
  (select count(*) from public.reviews where status = 'hidden') as hidden;

grant select on posted, shop, ids, clock, baseline to authenticated;

-- the stylist reports a phone number; a client reports spam
select pg_temp.sign_in('a1111111-1111-1111-1111-111111111111');
set local role authenticated;
select public.report_review((select threatened from posted), 'personal_info', 'Her phone number');
reset role;

select pg_temp.sign_in('a3333333-3333-3333-3333-333333333333');
set local role authenticated;
select public.report_review((select spammy from posted), 'spam', 'Advertising');
reset role;

select is((select status from public.reviews where id = (select threatened from posted)), 'hidden',
  'a harmful report hides the review straight away');
select is((select status from public.reviews where id = (select spammy from posted)), 'published',
  'any other report leaves it up');
select is(pg_temp.emails('admin_report_alert'), 1::bigint, 'a harmful report alerts the admin address');
select is(public.get_stylist_rating((select stylist from shop)) ->> 'review_count', '3',
  'a hidden review stops counting; a spam-reported one still counts');

select set_config('request.jwt.claims', '{"role": "anon"}', true);

select is(
  (select count(*) from jsonb_array_elements(public.get_stylist_reviews((select slug from shop)) -> 'reviews')
    as review where (review ->> 'is_checking')::boolean),
  0::bigint, 'visitors don''t see a review while it''s checked');

select pg_temp.sign_in('a2222222-2222-2222-2222-222222222222');

select is(
  (select review -> 'rating' from jsonb_array_elements(public.get_stylist_reviews((select slug from shop)) -> 'reviews')
    as review where (review ->> 'is_checking')::boolean),
  'null'::jsonb, 'the reviewer sees their own review as being checked, with no stars');

-- access: an admin flag alone isn't enough without a two-step code
select pg_temp.sign_in('a3333333-3333-3333-3333-333333333333');
set local role authenticated;
select is(public.admin_get_report_stats(), null, 'a client gets no admin stats');
select throws_ok(
  format('select public.admin_decide_review(%L, %L, %L)', (select spammy from posted), 'removed', 'x'),
  'not_allowed', 'a client can''t decide');
reset role;

select pg_temp.sign_in('a4444444-4444-4444-4444-444444444444', true, 'aal1');
set local role authenticated;
select is(public.admin_get_report_stats(), null, 'an admin without a two-step code gets nothing');
reset role;

select pg_temp.sign_in('a4444444-4444-4444-4444-444444444444', true, 'aal2');
set local role authenticated;

select is((public.admin_get_report_stats() ->> 'open')::bigint - (select open from baseline), 2::bigint,
  'two reviews have open reports');
select is((public.admin_get_report_stats() ->> 'hidden')::bigint - (select hidden from baseline), 1::bigint,
  'one is hidden');

select ok(
  (select (item ->> 'due_at')::timestamptz between now() + interval '23 hours' and now() + interval '25 hours'
    from jsonb_array_elements(public.admin_get_reports('open', 'newest') -> 'items') as item
    where item ->> 'id' = (select threatened::text from posted)),
  'a harmful report is due in 24 hours');

select ok(
  exists (select 1 from jsonb_array_elements(public.admin_get_reports('hidden', 'newest') -> 'items') as item
    where item ->> 'id' = (select threatened::text from posted)),
  'the hidden tab lists it');

select throws_ok(
  format('select public.admin_decide_review(%L, %L, %L)', (select threatened from posted), 'text_removed', '  '),
  'note_required', 'a decision needs a note');

select public.admin_decide_review((select threatened from posted), 'text_removed', 'Phone number in the text');
select public.admin_decide_review((select spammy from posted), 'kept', 'Not spam');

reset role;

select is((select status from public.reviews where id = (select threatened from posted)), 'text_removed',
  'removing the words keeps the stars');
select is(
  (select count(*) from public.review_reports where review_id = (select threatened from posted) and status = 'open'),
  0::bigint, 'the decision closes its reports');
select is(pg_temp.emails('review_decision_reviewer'), 1::bigint, 'the reviewer is told (only when theirs changed)');
select is(pg_temp.emails('review_decision_stylist'), 2::bigint, 'the stylist is told about both');
select is(pg_temp.emails('review_report_outcome'), 1::bigint, 'the client who reported is told');
select is((select count(*) from public.admin_actions where review_id in (select threatened from posted union
  select spammy from posted)), 2::bigint, 'both decisions are logged');

-- the reviewer appeals by the link in their email; the stylist appeals the kept spam report? (they didn't report it)
create temp table appeal_link as
select substring(payload ->> 'appeal_url' from 'token=(.*)$') as token
from public.notifications where template = 'review_decision_reviewer' and created_at >= (select started from clock);

select is(public.get_appeal_page((select token from appeal_link)) ->> 'state', 'open', 'the appeal link is open');
select is(public.submit_appeal((select token from appeal_link), 'It was my own number'), 'appealed',
  'the reviewer appeals');
select is(public.submit_appeal((select token from appeal_link), 'Again'), 'appealed', 'one appeal each');

select pg_temp.sign_in('a1111111-1111-1111-1111-111111111111');
set local role authenticated;
select is(public.appeal_review_decision((select spammy from posted), 'It is spam'), 'closed',
  'a stylist can''t appeal a report they didn''t make');
reset role;

create temp table appeal as
select id from public.review_appeals where review_id = (select threatened from posted);
grant select on appeal to authenticated;

select pg_temp.sign_in('a4444444-4444-4444-4444-444444444444', true, 'aal2');
set local role authenticated;
select public.admin_answer_appeal((select id from appeal), 'kept', 'Fair point');
reset role;

select is((select status from public.reviews where id = (select threatened from posted)), 'published',
  'changing the decision on appeal restores the review');
select is(pg_temp.emails('review_appeal_answered'), 2::bigint, 'both sides hear the answer');
select is(public.get_appeal_page((select token from appeal_link)) ->> 'state', 'closed',
  'an answered appeal can''t be appealed again');

select * from finish();
rollback;
