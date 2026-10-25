begin;
select plan(20);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values
  ('f1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'owner@reviews.test',
    jsonb_build_object(
      'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
      'terms_version', '2026-10',
      'stylist', jsonb_build_object(
        'business_name', 'Reviews Test', 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
        'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
        'contact_email', 'shop@reviews.test'
      )
    ), '{}'),
  ('f2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'ada@reviews.test',
    jsonb_build_object('account_type', 'client', 'first_name', 'Ada', 'last_name', 'Lovelace',
      'phone', '07700900457', 'terms_version', '2026-10'), '{}'),
  ('f3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'someone@reviews.test',
    jsonb_build_object('account_type', 'client', 'first_name', 'Some', 'last_name', 'One',
      'phone', '07700900458', 'terms_version', '2026-10'), '{}');

update public.stylists set status = 'live' where slug = 'reviews-test';

create temp table shop as
select stylists.id as stylist, stylists.slug::text as slug, services.id as service
from public.stylists
join lateral (select id from public.services where stylist_id = stylists.id order by sort limit 1) services on true
where stylists.slug = 'reviews-test';

create function pg_temp.book(
  completed interval, booking_status text default 'completed', email text default 'ada@reviews.test',
  client uuid default null
)
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, service_id, client_id, choices, snapshot, price_pence, fee_pence, minutes,
    starts_at, ends_at, block_ends_at, status, completed_at, contact, terms, created_by, overlap_ok)
  select stylist, service, client, '{}', '{"service_name": "Silk press"}', 5000, 0, 60, now() - completed - interval '2 hours',
    now() - completed - interval '1 hour', now() - completed - interval '1 hour', booking_status,
    case when booking_status = 'completed' then now() - completed end,
    jsonb_build_object('first', 'Ada', 'last', 'lovelace', 'email', email),
    jsonb_build_object('mode', 'none'), 'stylist', true
  from shop
  returning id
$$;

create function pg_temp.emails(target uuid, template_name text)
returns bigint
language sql
as $$
  select count(*) from public.notifications
  where template = template_name and payload ->> 'ref' = (select ref from public.bookings where id = target)
$$;

create function pg_temp.review(target uuid, stars integer, words text default null)
returns text
language sql
as $$
  select public.submit_review(public.create_booking_token(target, 'review', now() + interval '1 day'), stars, words)
$$;

create function pg_temp.sign_in(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

create temp table ids as
select
  pg_temp.book(interval '3 hours', client => 'f2222222-2222-2222-2222-222222222222') as due,
  pg_temp.book(interval '1 hour') as too_soon,
  pg_temp.book(interval '3 hours', 'no_show') as no_show,
  pg_temp.book(interval '3 hours', 'cancelled') as cancelled,
  pg_temp.book(interval '3 hours', email => ' ') as no_email,
  pg_temp.book(interval '3 hours') as second,
  pg_temp.book(interval '3 hours') as third,
  pg_temp.book(interval '3 hours') as fourth;

grant select on ids, shop to authenticated;

select public.send_review_invites();

select is(
  (select array_agg(pg_temp.emails(listed.id, 'review_invite') order by listed.position)
    from ids, unnest(array[due, too_soon, no_show, cancelled, no_email])
      with ordinality as listed (id, position)),
  array[1, 0, 0, 0, 0]::bigint[],
  'only completed bookings with an email are invited, 2 hours after completion');

select ok(
  (select payload ->> 'review_url' like '%/review?token=%' from public.notifications
    where template = 'review_invite' and payload ->> 'ref' = (select ref from public.bookings, ids where id = due)),
  'the invite links to the review page');

select public.send_review_invites();

select is(pg_temp.emails((select due from ids), 'review_invite'), 1::bigint, 'a booking is invited once');

update public.review_invites set sent_at = now() - interval '4 days' where booking_id in (select due from ids);
update public.review_invites set sent_at = now() - interval '4 days' where booking_id in (select second from ids);

select pg_temp.review((select second from ids), 5);
select public.send_review_invites();
select public.send_review_invites();

select is(pg_temp.emails((select due from ids), 'review_reminder'), 1::bigint, 'one reminder after 3 days');
select is(pg_temp.emails((select second from ids), 'review_reminder'), 0::bigint, 'no reminder once reviewed');

select is(pg_temp.review((select due from ids), 4, '  Lovely silk press  '), 'submitted', 'a review is submitted');
select is(pg_temp.review((select due from ids), 1), 'reviewed', 'one review per booking');
select is(pg_temp.review((select no_show from ids), 1), 'unavailable', 'a no-show can''t be reviewed');
select is(public.submit_review('nope', 5, null), 'link_not_valid', 'an unknown link is refused');

select is(
  (select body from public.reviews where booking_id = (select due from ids)), 'Lovely silk press', 'the text is trimmed');

select is(pg_temp.emails((select due from ids), 'review_received'), 1::bigint, 'the stylist is emailed');

select is(public.get_stylist_rating((select stylist from shop)),
  '{"rating": null, "review_count": 2}', 'no rating until 3 reviews');

select pg_temp.review((select third from ids), 3);

select is(public.get_stylist_rating((select stylist from shop)) ->> 'rating', '4.0', 'the average from 3 reviews');

create temp table posted as
select
  (select id from public.reviews where booking_id = due) as due,
  (select id from public.reviews where booking_id = third) as third
from ids;

grant select on posted to authenticated;

select pg_temp.sign_in('f3333333-3333-3333-3333-333333333333');
set local role authenticated;

select is(
  public.report_review((select third from posted), 'spam'),
  'reported', 'a signed-in user can report a review');

select is(
  public.report_review((select third from posted), 'abusive'),
  'already_reported', 'one report per person per review');

reset role;

select is(public.get_stylist_rating((select stylist from shop)) ->> 'rating', '4.0',
  'a spam report leaves the review counting while it''s checked');

select pg_temp.sign_in('f2222222-2222-2222-2222-222222222222');
set local role authenticated;

select throws_ok(
  format('select public.report_review(%L, %L)',
    (select due from posted), 'spam'),
  'own_review', 'a client can''t report their own review');

select is(
  (select review ->> 'author' from jsonb_array_elements(public.get_stylist_reviews((select slug from shop)) -> 'reviews') as review
    where (review ->> 'is_mine')::boolean),
  'Ada L.', 'the profile shows first name and last initial');

reset role;
select pg_temp.sign_in('f1111111-1111-1111-1111-111111111111');
set local role authenticated;

select public.reply_to_review((select due from posted), 'Thank you!');
select public.reply_to_review((select due from posted), 'Thanks Ada!');

reset role;

select ok(
  (select reply = 'Thanks Ada!' and reply_edited_at is not null from public.reviews
    where booking_id = (select due from ids)),
  'an edited reply is marked edited');

select is(pg_temp.emails((select due from ids), 'review_reply'), 1::bigint, 'only the first reply emails the client');

select * from finish();
rollback;
