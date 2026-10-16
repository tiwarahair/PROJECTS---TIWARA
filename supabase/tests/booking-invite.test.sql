begin;
select plan(19);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('c1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'owner@invite.test',
  jsonb_build_object(
    'account_type', 'stylist', 'first_name', 'In', 'last_name', 'Vite', 'phone', '07700900456', 'terms_version', '2026-10',
    'stylist', jsonb_build_object('business_name', 'Invite Test', 'business_type', 'shop', 'line1', '1 High St',
      'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24, 'categories', jsonb_build_array('braids'),
      'contact_email', 'shop@invite.test', 'contact_phone', '07700900999')
  ), '{}');

update public.services set status = 'active', price_pence = 10000, duration_min = 60
where stylist_id = (select id from public.stylists where slug = 'invite-test');

update public.working_hours set is_open = true, start_time = '09:00', end_time = '18:00'
where stylist_id = (select id from public.stylists where slug = 'invite-test');

update public.stylists set status = 'live' where slug = 'invite-test';

insert into public.payment_policies (stylist_id, mode, deposit_percent)
values ((select id from public.stylists where slug = 'invite-test'), 'none', 0);

create function pg_temp.book(at_time text, email text)
returns jsonb
language plpgsql
as $$
declare
  stylist uuid := (select id from public.stylists where slug = 'invite-test');
  held jsonb;
begin
  held := public.hold_booking(
    (select id from public.services where stylist_id = stylist order by sort limit 1), '{}',
    (((now() at time zone 'Europe/London')::date + 5) + at_time::time) at time zone 'Europe/London'
  );

  perform public.checkout_booking((held ->> 'id')::uuid, held ->> 'secret',
    jsonb_build_object('first', 'Nia', 'last', 'Okafor', 'email', email, 'phone', '07700900123'), '', null, null, null, null);

  update public.bookings set stripe_payment_intent_id = 'pi_' || (held ->> 'ref') where id = (held ->> 'id')::uuid;
  perform public.confirm_booking_payment('pi_' || (held ->> 'ref'));

  return held || jsonb_build_object('invite', (
    select split_part(payload ->> 'save_details_url', 'token=', 2) from public.notifications
    where template = 'booking_confirmed' and payload ->> 'ref' = held ->> 'ref'
  ));
end;
$$;

create temp table b as
select pg_temp.book('09:00', 'nia@invite.test') as first, pg_temp.book('11:00', 'Nia@Invite.test') as second,
  pg_temp.book('13:00', 'ade@invite.test') as late;

select throws_ok($$ select public.get_booking_invite('nope') $$, 'link_not_valid', 'an unknown invite is not valid');

select is((select public.get_booking_invite(first ->> 'invite') ->> 'state' from b), 'valid', 'a fresh invite is valid');

select is((select public.get_booking_invite(first ->> 'invite') ->> 'email' from b), 'nia@invite.test',
  'the invite carries the guest''s email');

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('c2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'someone@invite.test', '{}', '{}');

select throws_ok($$ select public.claim_booking_invite((select first ->> 'invite' from b), 'c2222222-2222-2222-2222-222222222222') $$,
  'link_not_valid', 'an account with another email can''t claim the invite');

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('c3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'nia@invite.test',
  '{"account_type":"client","first_name":"Nia","last_name":"Okafor","phone":"07700900123","terms_version":"2026-10"}', '{}');

select is((select public.claim_booking_invite(first ->> 'invite', 'c3333333-3333-3333-3333-333333333333') from b), 2,
  'claiming links every guest booking with that email, in any case');

select is((select count(*)::int from public.bookings where client_id = 'c3333333-3333-3333-3333-333333333333'), 2,
  'both bookings belong to the new account');

select throws_ok($$ select public.claim_booking_invite((select first ->> 'invite' from b), 'c3333333-3333-3333-3333-333333333333') $$,
  'link_not_valid', 'an invite can''t be used twice');

select is((select public.get_booking_invite(first ->> 'invite') ->> 'state' from b), 'account_exists',
  'after claiming, the invite says the account exists');

select throws_ok($$ select public.renew_booking_invite((select second ->> 'invite' from b)) $$, 'cannot_renew',
  'only an expired invite can be renewed');

update public.booking_tokens set expires_at = now() - interval '1 minute'
where token_hash = sha256(convert_to((select late ->> 'invite' from b), 'UTF8'));

select is((select public.get_booking_invite(late ->> 'invite') ->> 'state' from b), 'expired', 'an old invite is expired');

select lives_ok($$ select public.renew_booking_invite((select late ->> 'invite' from b)) $$, 'an expired invite can be renewed');

select is((select public.get_booking_invite(late ->> 'invite') ->> 'state' from b), 'expired',
  'renewing retires the old invite, which still offers a new link');

select is(
  (select public.get_booking_invite(split_part(payload ->> 'save_details_url', 'token=', 2)) ->> 'state'
   from public.notifications where template = 'booking_invite' and to_address = 'ade@invite.test'),
  'valid', 'the new link is emailed and valid');

grant select on b to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c3333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

select set_config('test.owner_token', (select public.get_owner_manage_token(first ->> 'ref') from b), true);

select is(
  public.get_managed_booking(current_setting('test.owner_token')) ->> 'ref',
  (select first ->> 'ref' from b), 'the owner gets a manage link from the booking ref');

select throws_ok($$ select public.get_owner_manage_token((select late ->> 'ref' from b)) $$, 'link_not_valid',
  'someone else''s booking ref gives no link');

select throws_ok($$ select public.get_booking_invite('nope') $$, '42501', null, 'signed-in users can''t read invites');

reset role;
set local role anon;

select throws_ok($$ select public.get_owner_manage_token('TH-000000') $$, '42501', null, 'guests can''t use booking refs');

reset role;

update public.booking_tokens set expires_at = now() - interval '31 days'
where token_hash = sha256(convert_to((select second ->> 'invite' from b), 'UTF8'));

select ok(public.purge_expired_booking_tokens() >= 1, 'the nightly job deletes links expired over 30 days ago');

select throws_ok($$ select public.get_booking_invite((select second ->> 'invite' from b)) $$, 'link_not_valid',
  'a deleted link is no longer valid, while newer expired ones stay');

select * from finish();
rollback;
