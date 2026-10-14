begin;
select plan(6);

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
        'contact_email', user_email
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

select pg_temp.sign_up('e1111111-1111-1111-1111-111111111111', 'prefs-one@studio.test', 'Prefs One Test');
select pg_temp.sign_up('e2222222-2222-2222-2222-222222222222', 'prefs-two@studio.test', 'Prefs Two Test');

create temp table ids as
select
  (select id from public.stylists where owner_id = 'e1111111-1111-1111-1111-111111111111') as mine,
  (select id from public.stylists where owner_id = 'e2222222-2222-2222-2222-222222222222') as theirs;

grant select on ids to authenticated;

-- old and recent emails for the clean-up
insert into public.notifications (channel, to_address, template, status, created_at) values
  ('email', 'old-sent@studio.test', 'tax_details_updated', 'sent', now() - interval '91 days'),
  ('email', 'old-failed@studio.test', 'tax_details_updated', 'failed', now() - interval '91 days'),
  ('email', 'old-pending@studio.test', 'tax_details_updated', 'pending', now() - interval '91 days'),
  ('email', 'new-sent@studio.test', 'tax_details_updated', 'sent', now() - interval '89 days');

select is(public.purge_old_notifications(), 2, 'clears sent and failed emails older than 90 days');

select is(
  (select array_agg(to_address order by to_address) from public.notifications where to_address like '%@studio.test'
    and to_address in ('old-pending@studio.test', 'new-sent@studio.test')),
  array['new-sent@studio.test', 'old-pending@studio.test'],
  'keeps pending emails and anything newer'
);

select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');

select lives_ok(
  $$insert into public.notification_preferences (stylist_id, event, email, sms)
    values ((select mine from ids), 'new_booking', false, true)
    on conflict (stylist_id, event) do update set email = excluded.email, sms = excluded.sms$$,
  'an owner saves a preference'
);

select is(
  (select email from public.notification_preferences where event = 'new_booking'),
  false,
  'and reads it back'
);

select throws_ok(
  $$insert into public.notification_preferences (stylist_id, event) values ((select theirs from ids), 'new_booking')$$,
  '42501', null, 'nobody saves preferences for someone else''s business'
);

select throws_ok(
  $$insert into public.notification_preferences (stylist_id, event) values ((select mine from ids), 'made_up')$$,
  '23514', null, 'only known events'
);

select * from finish();
rollback;
