begin;
select plan(15);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('a7111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@shared.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Crown Studio', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@shared.test')
  ), '{}'),
  ('a7222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'nia@shared.test', '{"first_name": "Nia"}', '{}');

update public.profiles set first_name = 'Nia' where id = 'a7222222-2222-2222-2222-222222222222';

create temp table shop as
select id from public.stylists where owner_id = 'a7111111-1111-1111-1111-111111111111';

create function pg_temp.book(client uuid, allergies text, days integer, contact jsonb)
returns uuid
language sql
as $$
  insert into public.bookings (stylist_id, client_id, service_id, choices, snapshot, price_pence, fee_pence, minutes,
    starts_at, ends_at, block_ends_at, status, contact, allergies, allergies_consented_at, terms, created_by,
    overlap_ok)
  select shop.id, client, (select id from public.services where stylist_id = shop.id order by sort limit 1), '{}',
    '{"service_name": "Silk press"}', 6000, 140, 60, now() + make_interval(days => days),
    now() + make_interval(days => days, hours => 1), now() + make_interval(days => days, hours => 1), 'held',
    contact, allergies, case when allergies is null then null else now() end, '{"mode": "deposit"}', 'client', true
  from shop
  returning id
$$;

create function pg_temp.confirm(booking uuid)
returns void
language sql
as $$
  update public.bookings set status = 'confirmed' where id = booking
$$;


create function pg_temp.sign_in(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true)
$$;

-- Studio's view, as the stylist, then back as whoever was signed in
create function pg_temp.studio_allergies(client_email text)
returns text
language plpgsql
as $$
declare
  signed_in text := current_setting('request.jwt.claims', true);
  shown text;
begin
  perform pg_temp.sign_in('a7111111-1111-1111-1111-111111111111');
  select allergies into shown from public.get_studio_clients((select id from shop)) where email = client_email;
  perform set_config('request.jwt.claims', coalesce(signed_in, ''), true);

  return shown;
end;
$$;

create temp table ids as
select pg_temp.book('a7222222-2222-2222-2222-222222222222', 'Sensitive scalp', -20,
  '{"first": "Nia", "email": "nia@shared.test"}') as past;

select pg_temp.confirm((select past from ids));

select is((select text from public.client_sensitivities), 'Sensitive scalp',
  'a signed-in booking saves what the client shares with that stylist');

select is((select consent_wording from public.client_sensitivities),
  'I have allergies or sensitivities to share with Crown Studio. By sharing this, you agree to Tiwára''s House and '
    || 'Crown Studio storing this health information to keep you safe.', 'with the booking''s exact consent wording');

select is((select booking_id from public.client_sensitivities), (select past from ids), 'and the booking it came from');

alter table ids add column upcoming uuid;
update ids set upcoming = pg_temp.book('a7222222-2222-2222-2222-222222222222', 'Sensitive scalp, no relaxers', 5,
  '{"first": "Nia", "email": "nia@shared.test"}');
select pg_temp.confirm((select upcoming from ids));

alter table ids add column no_note uuid;
update ids set no_note = pg_temp.book('a7222222-2222-2222-2222-222222222222', null, 6,
  '{"first": "Nia", "email": "nia@shared.test"}');
select pg_temp.confirm((select no_note from ids));

select is((select text from public.client_sensitivities), 'Sensitive scalp, no relaxers',
  'a booking without a note leaves what they share alone');

select pg_temp.sign_in('a7222222-2222-2222-2222-222222222222');

select is(public.get_my_sensitivity((select slug::text from public.stylists where id = (select id from shop))),
  'Sensitive scalp, no relaxers',
  'a later booking replaces it, and it fills the next booking form');

select is(jsonb_array_length(public.get_my_sensitivities()), 1, 'the account lists the stylist');

select is(pg_temp.studio_allergies('nia@shared.test'), 'Sensitive scalp, no relaxers', 'Studio shows it');

select public.save_my_sensitivity((select id from shop), 'Sensitive scalp');

select ok((select consent_wording like 'I agree to share this with Crown Studio. By sharing this,%'
  from public.client_sensitivities), 'an account edit records the account''s consent wording');

select is((select allergies from public.bookings where id = (select upcoming from ids)), 'Sensitive scalp',
  'and the upcoming booking shows the same');

select public.save_my_sensitivity((select id from shop), '  ');

select is((select count(*) from public.client_sensitivities), 0::bigint, 'emptying it removes it');
select is(pg_temp.studio_allergies('nia@shared.test'), null, 'so Studio stops showing it');

select is((select allergies from public.bookings where id = (select past from ids)), 'Sensitive scalp',
  'past bookings keep what was shared for them');

select throws_ok($$ select public.save_my_sensitivity(gen_random_uuid(), 'Nuts') $$, 'not_found',
  'nothing can be shared with a stylist the client isn''t linked to');

alter table ids add column guest uuid;
update ids set guest = pg_temp.book(null, 'Latex', 8, '{"first": "Kemi", "email": "kemi@shared.test"}');
select pg_temp.confirm((select guest from ids));

select is(pg_temp.studio_allergies('kemi@shared.test'), 'Latex',
  'a client only seen as a guest still shows their latest booking''s note');

select public.save_my_sensitivity((select id from shop), 'Sensitive scalp');

select is(public.get_my_data() #>> '{shared_with_stylists,0,text}', 'Sensitive scalp',
  'the data download includes it');

select * from finish();
rollback;
