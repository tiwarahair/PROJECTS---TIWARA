begin;
select plan(13);

create function pg_temp.sign_up(user_id uuid, user_email text, business text)
returns void
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', user_email,
    jsonb_build_object(
      'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
      'terms_version', '2026-10',
      'stylist', jsonb_build_object(
        'business_name', business, 'business_type', 'shop', 'line1', '1 High St', 'city', 'Manchester',
        'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
        'contact_email', 'shop@unattended.test'
      )
    ), '{}')
$$;

create function pg_temp.act_as(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.sign_up('c7111111-1111-1111-1111-111111111111', 'owner@unattended.test', 'Unattended Test');
select pg_temp.sign_up('c7222222-2222-2222-2222-222222222222', 'other@unattended.test', 'Other Unattended');

create function pg_temp.book(completed interval, from_status text, checked_out boolean default false)
returns uuid
language plpgsql
as $$
declare
  booking_id uuid;
begin
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
    ends_at, block_ends_at, status, completed_at, unpaid_at, checkout, contact, terms, created_by, overlap_ok)
  select stylists.id, services.id, '{}', '{"service_name": "Silk press"}', 5000, 0, 60,
    now() - completed - interval '24 hours', now() - completed - interval '23 hours',
    now() - completed - interval '23 hours', 'completed', now() - completed,
    case when checked_out then null else now() - completed end, case when checked_out then '{}'::jsonb end,
    '{"first": "Ada", "last": "Lovelace", "email": "ada@unattended.test"}', '{"mode": "none"}', 'stylist', true
  from public.stylists
  join public.services on services.stylist_id = stylists.id
  where stylists.slug = 'unattended-test'
  order by services.sort
  limit 1
  returning id into booking_id;

  insert into public.booking_events (booking_id, kind, data)
  values (booking_id, 'auto_completed', jsonb_build_object('from', from_status));

  return booking_id;
end;
$$;

create function pg_temp.invites(target uuid)
returns bigint
language sql
as $$
  select count(*) from public.notifications
  where template = 'review_invite' and payload ->> 'ref' = (select ref from public.bookings where id = target)
$$;

create temp table b as
select
  pg_temp.book(interval '3 hours', 'confirmed') as unmarked,
  pg_temp.book(interval '25 hours', 'confirmed') as unmarked_day,
  pg_temp.book(interval '3 hours', 'arrived') as arrived,
  pg_temp.book(interval '3 hours', 'confirmed', true) as checked_out,
  pg_temp.book(interval '25 hours', 'confirmed') as skipped;

grant select on b to authenticated;

select pg_temp.act_as('c7222222-2222-2222-2222-222222222222');
select throws_ok(
  format('select public.skip_review_invite(%L)', (select skipped from b)),
  'not_found', 'another stylist can’t stop the invite'
);

select pg_temp.act_as('c7111111-1111-1111-1111-111111111111');
select ok(
  (select can_skip_review_invite(bookings) from public.bookings where id = (select skipped from b)),
  'Studio can offer "Didn’t attend" on a booking never marked arrived'
);
select ok(
  not (select can_skip_review_invite(bookings) from public.bookings where id = (select arrived from b)),
  'but not on one marked arrived'
);
select ok(
  not (select can_skip_review_invite(bookings) from public.bookings where id = (select checked_out from b)),
  'or one checked out'
);
select lives_ok(
  format('select public.skip_review_invite(%L)', (select skipped from b)),
  'the owner can say the client didn’t attend'
);
select throws_ok(
  format('select public.skip_review_invite(%L)', (select skipped from b)),
  'skip_not_allowed', 'once'
);
reset role;

select public.send_review_invites();

select is(pg_temp.invites((select unmarked from b)), 0::bigint, 'an unmarked booking isn’t invited after 2 hours');
select is(pg_temp.invites((select unmarked_day from b)), 1::bigint, 'it is after a day');
select is(pg_temp.invites((select arrived from b)), 1::bigint, 'a booking marked arrived is invited after 2 hours');
select is(pg_temp.invites((select checked_out from b)), 1::bigint, 'so is one checked out');
select is(pg_temp.invites((select skipped from b)), 0::bigint, '"Didn’t attend" stops the invite');

select pg_temp.act_as('c7111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select public.skip_review_invite(%L)', (select unmarked_day from b)),
  'skip_not_allowed', 'an invite already sent can’t be stopped'
);
reset role;

select ok(
  has_function_privilege('authenticated', 'public.skip_review_invite(uuid)', 'execute')
    and not has_function_privilege('anon', 'public.skip_review_invite(uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.is_unattended(public.bookings)', 'execute'),
  'only signed-in stylists can call it'
);

select * from finish();
rollback;
