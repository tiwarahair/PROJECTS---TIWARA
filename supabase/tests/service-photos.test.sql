begin;
select plan(9);

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
      'contact_email', 'photos@servicephotos.test'
    )
  )
$$;

select pg_temp.sign_up('b1111111-1111-1111-1111-111111111111', 'one@servicephotos.test', pg_temp.stylist_meta('Photo One Test'));
select pg_temp.sign_up('b2222222-2222-2222-2222-222222222222', 'two@servicephotos.test', pg_temp.stylist_meta('Photo Two Test'));

create temp table ids as
select
  one.id as one,
  one.slug as one_slug,
  two.id as two,
  (select id from public.services where stylist_id = one.id order by sort limit 1) as service,
  (select id from public.services where stylist_id = two.id order by sort limit 1) as two_service
from public.stylists as one, public.stylists as two
where one.owner_id = 'b1111111-1111-1111-1111-111111111111' and two.owner_id = 'b2222222-2222-2222-2222-222222222222';
grant select on ids to authenticated;

update public.services set status = 'active', price_pence = 6000, duration_min = 60
where id = (select service from ids);
update public.stylists set status = 'live' where id = (select one from ids);

insert into public.portfolio_photos (stylist_id, path, sort)
select (select one from ids), 'p/' || n, n from generate_series(1, 40) as n;

select throws_ok(
  $$insert into public.portfolio_photos (stylist_id, path, sort) values ((select one from ids), 'p/41', 41)$$,
  'P0001', 'a portfolio holds up to 40 photos', 'portfolios hold up to 40 photos'
);

select pg_temp.act_as('b1111111-1111-1111-1111-111111111111');

select lives_ok(
  $$update public.portfolio_photos set service_id = (select service from ids)
    where stylist_id = (select one from ids) and sort between 1 and 5$$,
  'an owner puts 5 photos on a service'
);
select throws_ok(
  $$update public.portfolio_photos set service_id = (select service from ids)
    where stylist_id = (select one from ids) and sort = 6$$,
  'P0001', 'a service holds up to 5 photos', 'not a 6th'
);
select lives_ok(
  $$update public.portfolio_photos set service_id = (select service from ids)
    where stylist_id = (select one from ids) and sort = 3$$,
  'saving a photo''s link again doesn''t count it twice'
);
select throws_ok(
  $$update public.portfolio_photos set service_id = (select two_service from ids)
    where stylist_id = (select one from ids) and sort = 7$$,
  'P0001', 'a photo can only go on its own stylist''s service', 'not on another stylist''s service'
);

reset role;

select is(
  (select service -> 'photos' from jsonb_array_elements(public.get_stylist_profile((select one_slug from ids)) -> 'services') as service
   where service ->> 'id' = (select service from ids)::text),
  '["p/1", "p/2", "p/3", "p/4", "p/5"]'::jsonb,
  'the public profile lists a service''s photos in portfolio order'
);
select is(
  (select count(*)::int from jsonb_array_elements(public.get_stylist_profile((select one_slug from ids)) -> 'portfolio_photos') as photo
   where photo ->> 'service_id' = (select service from ids)::text),
  5, 'portfolio photos say which service they''re on'
);

delete from public.services where id = (select service from ids);

select is(
  (select count(*)::int from public.portfolio_photos where stylist_id = (select one from ids)),
  40, 'deleting a service keeps its photos in the portfolio'
);
select is(
  (select count(*)::int from public.portfolio_photos where stylist_id = (select one from ids) and service_id is not null),
  0, 'and unlinks them'
);

select * from finish();
rollback;
