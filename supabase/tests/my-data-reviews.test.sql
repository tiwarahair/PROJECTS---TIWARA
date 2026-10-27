begin;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data)
values ('e1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@datareviews.test', now(),
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Crown Studio', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@datareviews.test')
  ), '{}'),
  ('e2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'nia@datareviews.test', now(), '{"first_name": "Nia"}', '{}'),
  ('e3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'kemi@datareviews.test', now(), '{"first_name": "Kemi"}', '{}');

create function pg_temp.book(client uuid, email text)
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, client_id, service_id, choices, snapshot, price_pence, fee_pence, minutes,
    starts_at, ends_at, block_ends_at, status, contact, terms, created_by, overlap_ok)
  select stylists.id, client, (select id from public.services where stylist_id = stylists.id order by sort limit 1),
    '{}', '{"service_name": "Silk press"}', 6000, 140, 60, now() - interval '3 days',
    now() - interval '3 days' + interval '1 hour', now() - interval '3 days' + interval '1 hour', 'completed',
    jsonb_build_object('first', 'Someone', 'email', email), '{"mode": "deposit"}', 'client', true
  from public.stylists where owner_id = 'e1111111-1111-1111-1111-111111111111'
  returning id
$$;

create function pg_temp.review(booking uuid, client uuid, rating integer, body text)
returns uuid
language sql
as $$
  insert into public.reviews (booking_id, stylist_id, client_id, rating, body)
  select booking, stylist_id, client, rating, body from public.bookings where id = booking
  returning id
$$;

create temp table ids as
select pg_temp.review(pg_temp.book('e2222222-2222-2222-2222-222222222222', 'nia@datareviews.test'),
    'e2222222-2222-2222-2222-222222222222', 5, 'Lovely silk press') as linked,
  pg_temp.review(pg_temp.book(null, 'NIA@datareviews.test'), null, 4, 'Good as a guest too') as guest,
  pg_temp.review(pg_temp.book('e3333333-3333-3333-3333-333333333333', 'kemi@datareviews.test'),
    'e3333333-3333-3333-3333-333333333333', 1, 'Kemi was unhappy') as other;

update public.reviews set reply = 'Thank you, Nia', replied_at = now() where id = (select linked from ids);

insert into public.review_decisions (review_id, outcome, note)
values ((select linked from ids), 'text_removed', 'internal note stays out');

insert into public.review_appeals (decision_id, review_id, appellant, body)
select id, review_id, 'reviewer', 'Please put my words back' from public.review_decisions
where review_id = (select linked from ids);

insert into public.review_reports (review_id, reporter_id, is_stylist, reason, details)
values ((select other from ids), 'e2222222-2222-2222-2222-222222222222', false, 'spam', 'Looks fake');

select set_config('request.jwt.claims', json_build_object('sub', 'e2222222-2222-2222-2222-222222222222',
  'role', 'authenticated')::text, true);
set local role authenticated;

create temp table export as select public.get_my_data() as data;

create temp table linked_review as
select review from export, jsonb_array_elements(data -> 'reviews') as review
where review ->> 'text' = 'Lovely silk press';

select is((select jsonb_array_length(data -> 'reviews') from export), 2,
  'the download has the client''s reviews, including one left as a guest under their email');

select is((select review ->> 'stylist_reply' from linked_review), 'Thank you, Nia', 'with the stylist''s reply');

select is((select review #>> '{decisions,0,outcome}' from linked_review), 'text_removed',
  'and what moderation decided');

select ok((select position('internal note' in data::text) = 0 from export), 'but not the admin''s own notes');

select is((select review #>> '{appeals,0,text}' from linked_review), 'Please put my words back',
  'their appeal is there');

select is((select data #>> '{reviews_reported,0,reason}' from export), 'spam', 'so are the reviews they reported');

select ok((select position('Kemi was unhappy' in data::text) = 0 from export),
  'someone else''s review stays out');

select * from finish();
rollback;
