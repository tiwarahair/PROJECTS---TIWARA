begin;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('c1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'golive@studio.test', jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Go', 'last_name', 'Live', 'phone', '07700900456', 'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Go Live Test', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'golive@studio.test')
  ), '{}');

create temp table ids as
select id as stylist from public.stylists where owner_id = 'c1111111-1111-1111-1111-111111111111';

create function pg_temp.status()
returns text
language sql
as $$ select status from public.stylists where id = (select stylist from ids) $$;

update public.stylists
set availability_confirmed_at = now(), profile_confirmed_at = now()
where id = (select stylist from ids);

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values (gen_random_uuid(), 'c1111111-1111-1111-1111-111111111111', 'test', 'totp', 'verified', now(), now());

insert into public.stylist_tax_details (stylist_id, kind, company_name, company_number)
values ((select stylist from ids), 'ltd', 'Go Live Ltd', '12345678');

update public.services set status = 'active', price_pence = 5000, duration_min = 60
where id = (select id from public.services where stylist_id = (select stylist from ids) limit 1);

select is(pg_temp.status(), 'draft', 'not live until Stripe can take payments and pay out');

update public.stylists set charges_enabled = true where id = (select stylist from ids);
select is(pg_temp.status(), 'draft', 'payouts are needed too');

update public.stylists set payouts_enabled = true where id = (select stylist from ids);
select is(pg_temp.status(), 'live', 'everything done: live');

update public.stylists set stripe_requirements = 'past_due' where id = (select stylist from ids);
select is(pg_temp.status(), 'paused', 'something overdue at Stripe pauses it');

update public.stylists set stripe_requirements = 'none' where id = (select stylist from ids);
select is(pg_temp.status(), 'live', 'sorted out: live again');

update public.services set status = 'draft' where stylist_id = (select stylist from ids);
select is(pg_temp.status(), 'draft', 'no active service: back to draft');

update public.services set status = 'active'
where id = (select id from public.services where stylist_id = (select stylist from ids) limit 1);
update public.stylists set status = 'closed', closed_at = now() where id = (select stylist from ids);
update public.stylists set charges_enabled = false where id = (select stylist from ids);
select is(pg_temp.status(), 'closed', 'a closed business is left alone');

select * from finish();
rollback;
