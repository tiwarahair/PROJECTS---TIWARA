begin;
select plan(8);

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
        'contact_email', 'studio@save-service.test'
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

select pg_temp.sign_up('b1111111-1111-1111-1111-111111111111', 'one@save-service.test', 'Save Service One');
select pg_temp.sign_up('b2222222-2222-2222-2222-222222222222', 'two@save-service.test', 'Save Service Two');

insert into public.addons (stylist_id, name, price_pence, minutes)
select id, 'Beads', 1000, 15 from public.stylists where owner_id = 'b1111111-1111-1111-1111-111111111111';

create temp table ids as
select services.*, addons.id as addon_id
from public.services
join public.addons on addons.stylist_id = services.stylist_id
join public.stylists on stylists.id = services.stylist_id
where stylists.owner_id = 'b1111111-1111-1111-1111-111111111111'
limit 1;
grant select on ids to authenticated;

create function pg_temp.service(service_name text)
returns jsonb
language sql
as $$
  select to_jsonb(ids) - 'addon_id' || jsonb_build_object('name', service_name) from ids
$$;

select pg_temp.act_as('b1111111-1111-1111-1111-111111111111');

select lives_ok(
  $$select public.save_service(
    pg_temp.service('Knotless'),
    jsonb_build_array(
      jsonb_build_object('kind', 'size', 'label', 'Small', 'offered', true, 'price_delta_pence', 0, 'minutes_delta', 0, 'sort', 0),
      jsonb_build_object('kind', 'own', 'group_name', 'Parting', 'label', 'Middle', 'price_delta_pence', 500, 'minutes_delta', 10, 'sort', 0)
    ),
    jsonb_build_array(jsonb_build_object('addon_id', (select addon_id from ids), 'price_override_pence', 800))
  )$$,
  'an owner saves a service with its options and add-ons'
);
select is((select name from public.services where id = (select id from ids)), 'Knotless', 'the service is saved');
select is((select count(*)::int from public.service_variations where service_id = (select id from ids)), 2, 'with its options');
select is((select price_override_pence from public.service_addons where service_id = (select id from ids)), 800, 'and its add-on link');

select throws_ok(
  $$select public.save_service(
    pg_temp.service('Half saved'),
    jsonb_build_array(jsonb_build_object('kind', 'size', 'label', '', 'sort', 0)),
    '[]'
  )$$,
  '23514', null, 'a bad option fails the whole save'
);
select ok(
  (select name from public.services where id = (select id from ids)) = 'Knotless'
  and (select count(*)::int from public.service_variations where service_id = (select id from ids)) = 2
  and exists (select 1 from public.service_addons where service_id = (select id from ids)),
  'and leaves the saved service, options and add-ons as they were'
);

select pg_temp.act_as('b2222222-2222-2222-2222-222222222222');

select throws_ok(
  $$select public.save_service(pg_temp.service('Taken over'), '[]', '[]')$$,
  '42501', null, 'another stylist cannot save over the service'
);

reset role;
set local role anon;

select throws_ok(
  $$select public.save_service(pg_temp.service('Anon'), '[]', '[]')$$,
  '42501', null, 'signed-out visitors cannot call it'
);

select * from finish();
rollback;
