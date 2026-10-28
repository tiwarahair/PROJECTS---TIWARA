begin;
select plan(5);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('ac111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'owner@no-policy.test', jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'Test', 'last_name', 'Stylist', 'phone', '07700900456',
    'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'No Policy Studio', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'owner@no-policy.test')
  ), '{}');

insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes,
  starts_at, ends_at, block_ends_at, status, contact, terms, created_by, overlap_ok, paid_at, stripe_payment_intent_id)
select stylists.id, (select id from public.services where stylist_id = stylists.id order by sort limit 1), '{}',
  jsonb_build_object('service_name', mode), 6000, 140, 60, now() + interval '1 day', now() + interval '25 hours',
  now() + interval '25 hours', 'confirmed', '{"first": "Nia", "email": "nia@no-policy.test"}',
  jsonb_build_object('mode', mode, 'free_window_hours', 48, 'free_cancel_until', now() - interval '1 day'),
  'client', true, now(), 'pi_no_policy_' || mode
from public.stylists, (values ('none'), ('deposit')) as modes (mode)
where stylists.owner_id = 'ac111111-1111-1111-1111-111111111111';

create function pg_temp.terms_of(mode text)
returns jsonb
language sql
as $$
  select public.get_cancellation_terms(bookings) from public.bookings
  where snapshot ->> 'service_name' = mode and contact ->> 'email' = 'nia@no-policy.test'
$$;

select is(pg_temp.terms_of('none') ->> 'is_late', 'true', 'with no policy, past the free window still counts as late');
select is((pg_temp.terms_of('none') ->> 'fee_refund_pence')::integer, 0, 'with no policy, a cancel inside 48 hours keeps the booking fee');
select is((pg_temp.terms_of('none') ->> 'charge_pence')::integer, 0, 'with no policy, there is no late fee');
select ok(public.is_reschedule_open((select terms from public.bookings where snapshot ->> 'service_name' = 'none'
  and contact ->> 'email' = 'nia@no-policy.test')), 'with no policy, the booking can still be moved');
select ok(not public.is_reschedule_open((select terms from public.bookings where snapshot ->> 'service_name' = 'deposit'
  and contact ->> 'email' = 'nia@no-policy.test')), 'with a policy, moving closes with the free window');

select * from finish();
rollback;
