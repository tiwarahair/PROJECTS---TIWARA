begin;
select plan(37);

create function pg_temp.sign_up(user_id uuid, user_email text, meta jsonb)
returns void
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', user_email, meta, '{}')
$$;

create function pg_temp.act_as(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
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
      'contact_email', 'studio@studio.test'
    )
  )
$$;

select pg_temp.sign_up('a1111111-1111-1111-1111-111111111111', 'one@studio.test', pg_temp.stylist_meta('Studio One Test'));
select pg_temp.sign_up('a2222222-2222-2222-2222-222222222222', 'two@studio.test', pg_temp.stylist_meta('Studio Two Test'));
select pg_temp.sign_up('a3333333-3333-3333-3333-333333333333', 'client@studio.test', jsonb_build_object(
  'account_type', 'client', 'first_name', 'Cli', 'last_name', 'Ent', 'phone', '07700900123', 'terms_version', '2026-10'
));

create temp table ids as
select
  (select id from public.stylists where owner_id = 'a1111111-1111-1111-1111-111111111111') as one,
  (select id from public.stylists where owner_id = 'a2222222-2222-2222-2222-222222222222') as two;
grant select on ids to authenticated;

-- defaults for a new stylist
select is((select count(*)::int from public.working_hours where stylist_id = (select one from ids)), 7, 'a new stylist gets 7 days of hours');
select is((select count(*)::int from public.working_hours where stylist_id = (select one from ids) and is_open), 6, 'open Monday to Saturday');
select is((select min_notice_hours from public.booking_rules where stylist_id = (select one from ids)), 24::smallint, 'default booking rules');
select is((select mode from public.payment_policies where stylist_id = (select one from ids)), 'none', 'starts with no payment protection');

select pg_temp.act_as('a1111111-1111-1111-1111-111111111111');

select lives_ok(
  $$insert into public.addons (stylist_id, name, price_pence, minutes) values ((select one from ids), 'Beads', 1000, 15)$$,
  'an owner adds an add-on'
);
select throws_ok(
  $$insert into public.addons (stylist_id, name) values ((select two from ids), 'Sneaky')$$,
  '42501', null, 'an owner cannot add to someone else''s catalogue'
);
select lives_ok(
  $$insert into public.service_variations (service_id, kind, label, price_delta_pence, minutes_delta, sort)
    select id, 'size', 'Small', 4500, 60, 0 from public.services where stylist_id = (select one from ids) limit 1$$,
  'an owner adds a size to a service'
);
select throws_ok(
  $$insert into public.payment_policies (stylist_id, mode, deposit_percent, refundable) values ((select one from ids), 'deposit', 30, false)$$,
  '23514', null, 'a non-refundable deposit is capped at 25%'
);
select lives_ok(
  $$insert into public.payment_policies (stylist_id, mode, deposit_percent, refundable) values ((select one from ids), 'deposit', 50, true)$$,
  'a refundable deposit can be 50%'
);
select throws_ok(
  $$update public.payment_policies set deposit_percent = 10$$,
  '42501', null, 'policies are insert-only history'
);
select lives_ok($$update public.stylists set bio = 'Hi' where id = (select one from ids)$$, 'an owner edits their bio');
select throws_ok($$update public.stylists set status = 'live'$$, '42501', null, 'an owner cannot set their own status');
select is_empty($$select * from public.addons where stylist_id = (select two from ids)$$, 'owners only see their own catalogue');

-- slugs
select ok(not public.is_slug_free('studio'), 'route names are reserved');
select ok(not public.is_slug_free('ab'), 'slugs are at least 3 characters');
select throws_ok($$select public.change_slug('Bad Slug!')$$, 'P0001', 'that booking link is not available', 'invalid slugs are refused');
select is(public.change_slug('crowned-one'), 'crowned-one', 'an owner changes their slug');
select is(public.get_stylist_profile('studio-one-test') ->> 'slug', 'crowned-one', 'the old slug finds the profile under its new one');
select throws_ok($$select public.change_slug('another-one')$$, 'P0001', 'the booking link can change once every 30 days', 'one change per 30 days');

reset role;
update public.stylists set slug_changed_at = now() - interval '31 days' where id = (select one from ids);
select pg_temp.act_as('a2222222-2222-2222-2222-222222222222');

select throws_ok($$select public.change_slug('studio-one-test')$$, 'P0001', 'that booking link is not available', 'another stylist cannot take a retired slug');

reset role;
select pg_temp.act_as('a1111111-1111-1111-1111-111111111111');

select is(public.change_slug('studio-one-test'), 'studio-one-test', 'an owner can reclaim their own old slug');

reset role;
select ok(public.get_unique_slug('Crowned One') <> 'crowned-one', 'new sign-ups avoid retired slugs');
select ok(public.is_valid_slug(public.get_unique_slug('The Best Braids and Locs in London Xtra')), 'a name cut off at a hyphen still gets a valid slug');

-- become a stylist
select pg_temp.act_as('a3333333-3333-3333-3333-333333333333');

select lives_ok(
  $$select public.become_stylist(jsonb_build_object('terms_version', '2026-10', 'stylist', (pg_temp.stylist_meta('Client Turned Stylist') -> 'stylist')))$$,
  'a signed-in client becomes a stylist'
);
select throws_ok(
  $$select public.become_stylist(jsonb_build_object('terms_version', '2026-10', 'stylist', (pg_temp.stylist_meta('Twice') -> 'stylist')))$$,
  'P0001', 'this account already has a business', 'only one business per account'
);

reset role;
select is(
  (select raw_app_meta_data ->> 'is_stylist' from auth.users where id = 'a3333333-3333-3333-3333-333333333333'),
  'true', 'becoming a stylist sets the flag'
);

-- photos
insert into public.portfolio_photos (stylist_id, path, sort)
select (select one from ids), 'p/' || n, n from generate_series(1, 40) as n;
select throws_ok(
  $$insert into public.portfolio_photos (stylist_id, path, sort) values ((select one from ids), 'p/41', 41)$$,
  'P0001', 'a portfolio holds up to 40 photos', 'portfolios hold up to 40 photos'
);
select lives_ok(
  $$insert into public.portfolio_photos (stylist_id, path, sort) values ((select two from ids), 'p/1', 0)$$,
  'another stylist can use the same photo path'
);
select throws_ok(
  $$insert into public.portfolio_photos (stylist_id, path, sort) values ((select two from ids), 'p/1', 1)$$,
  '23505', null, 'a stylist can''t list the same photo twice'
);

-- closing a business
insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
  ends_at, block_ends_at, status)
select (select one from ids), id, '{}', '{}', 5000, 0, 60, now() + interval '1 day', now() + interval '1 day 1 hour',
  now() + interval '1 day 1 hour', 'confirmed'
from public.services where stylist_id = (select one from ids) limit 1;

select pg_temp.act_as('a1111111-1111-1111-1111-111111111111');
select throws_ok($$select public.close_business()$$, 'P0001', 'has_upcoming',
  'a business with bookings still to come can''t close');
reset role;

delete from public.bookings where stylist_id = (select one from ids) and status = 'confirmed';

select pg_temp.act_as('a1111111-1111-1111-1111-111111111111');

select lives_ok($$select public.close_business()$$, 'an owner closes their business');
select throws_ok($$select public.close_business()$$, 'P0001', 'no open business on this account', 'a closed business cannot close again');
select lives_ok($$select public.reopen_business()$$, 'it can be reopened within 15 days');
select lives_ok($$select public.close_business()$$, 'and closed again');

reset role;
update public.stylists set closed_at = now() - interval '16 days' where id = (select one from ids);
select pg_temp.act_as('a1111111-1111-1111-1111-111111111111');

select throws_ok($$select public.reopen_business()$$, 'P0001', 'this business can no longer be reopened', 'not after 15 days');

reset role;
select is((select count(*)::int from public.get_due_closure_photos()), 40, 'the clean-up lists the photos to delete first');
select public.purge_closed_businesses();
select ok(
  (select owner_id is null and business_name = 'Closed business' and location is null from public.stylists where id = (select one from ids))
  and not exists (select 1 from public.services where stylist_id = (select one from ids))
  and (select raw_app_meta_data ->> 'is_stylist' from auth.users where id = 'a1111111-1111-1111-1111-111111111111') is null
  and (select status from public.stylists where id = (select two from ids)) <> 'closed',
  'it anonymises only that business, keeps the row and removes the stylist flag'
);

select * from finish();
rollback;
