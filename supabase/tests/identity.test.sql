begin;
select plan(14);

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

select lives_ok(
  $$select pg_temp.sign_up('11111111-1111-1111-1111-111111111111', 'ada@identity.test',
    '{"account_type": "client", "first_name": "Ada", "last_name": "Obi", "phone": "07700 900123", "terms_version": "2026-10"}')$$,
  'a client signs up'
);

select results_eq(
  $$select first_name, client_terms_version from public.profiles where id = '11111111-1111-1111-1111-111111111111'$$,
  $$values ('Ada'::text, '2026-10'::text)$$,
  'the client profile is created with the accepted terms'
);

select lives_ok(
  $$select pg_temp.sign_up('22222222-2222-2222-2222-222222222222', 'kemi@identity.test', '{
    "account_type": "stylist", "first_name": "Kemi", "last_name": "Ade", "phone": "7700900456", "terms_version": "2026-10",
    "stylist": {"business_name": "Identity Test Studio", "business_type": "shop", "line1": "1 High St", "city": "Manchester",
      "postcode": "m14 5tq", "lat": 53.45, "lng": -2.22, "categories": ["locs", "braids"], "contact_email": "kemi@identity.test"}
  }')$$,
  'a stylist signs up'
);

select is(
  (select raw_app_meta_data ->> 'is_stylist' from auth.users where id = '22222222-2222-2222-2222-222222222222'),
  'true',
  'the stylist is flagged in app_metadata'
);

select results_eq(
  $$select slug::text, status, (select postcode from public.stylist_private where stylist_id = stylists.id)
    from public.stylists where owner_id = '22222222-2222-2222-2222-222222222222'$$,
  $$values ('identity-test-studio', 'draft', 'M14 5TQ')$$,
  'a draft stylist with a slug and private address is created'
);

select results_eq(
  $$select service_group_id from public.stylist_categories
    where stylist_id = (select id from public.stylists where owner_id = '22222222-2222-2222-2222-222222222222') order by sort$$,
  $$values ('locs'::text), ('braids')$$,
  'categories follow the picked order'
);

select results_eq(
  $$select status, service_group_id, count(*)::int from public.services
    where stylist_id = (select id from public.stylists where owner_id = '22222222-2222-2222-2222-222222222222') group by 1, 2$$,
  $$values ('draft'::text, 'locs'::text, 2)$$,
  'two draft services come from the primary group'
);

select throws_ok(
  $$select pg_temp.sign_up('33333333-3333-3333-3333-333333333333', 'bad@identity.test',
    '{"account_type": "client", "first_name": "Bad", "last_name": "Phone", "phone": "12", "terms_version": "2026-10"}')$$,
  'a valid UK mobile is required'
);

select throws_ok(
  $$select pg_temp.sign_up('44444444-4444-4444-4444-444444444444', 'nocats@identity.test', '{
    "account_type": "stylist", "first_name": "No", "last_name": "Cats", "phone": "07700900789", "terms_version": "2026-10",
    "stylist": {"business_name": "Empty", "business_type": "shop", "postcode": "M1 1AA", "lat": 53, "lng": -2, "categories": [],
      "contact_email": "nocats@identity.test"}
  }')$$,
  'stylist details and at least one category are required'
);

select lives_ok(
  $$select pg_temp.sign_up('55555555-5555-5555-5555-555555555555', 'google@identity.test', '{"full_name": "Goo Gle"}')$$,
  'a Google sign-up gets an empty profile to finish later'
);

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

select is_empty($$select * from public.stylists$$, 'a client cannot see another account''s stylist');
select is((select count(*)::int from public.profiles), 1, 'a user only sees their own profile');

reset role;
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');

select is((select count(*)::int from public.services), 2, 'the owner sees their services');

reset role;
set local role anon;

select throws_ok($$select * from public.profiles$$, '42501', null, 'anon cannot read profiles');

select * from finish();
rollback;
