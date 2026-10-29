begin;
select plan(31);

create function pg_temp.open_business(user_id uuid)
returns uuid
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', user_id || '@clients.test',
    jsonb_build_object(
      'account_type', 'stylist', 'first_name', 'Cli', 'last_name', 'Ents', 'phone', '07700900456', 'terms_version', '2026-10',
      'stylist', jsonb_build_object('business_name', 'Clients ' || user_id, 'business_type', 'shop',
        'line1', '1 High St', 'city', 'Manchester', 'postcode', 'M1 1AA', 'lat', 53.48, 'lng', -2.24,
        'categories', jsonb_build_array('braids'), 'contact_email', 'clients@clients.test', 'contact_phone', '07700900999')
    ), '{}');

  update public.services set status = 'active', price_pence = 5000, duration_min = 60
  where stylist_id = (select id from public.stylists where owner_id = user_id);

  update public.working_hours set is_open = true, start_time = '09:00', end_time = '18:00'
  where stylist_id = (select id from public.stylists where owner_id = user_id);

  update public.stylists set status = 'live', stripe_account_id = 'acct_' || left(user_id::text, 8) where owner_id = user_id;

  insert into public.payment_policies (stylist_id, mode, free_window_hours, created_at)
  select id, 'none', 48, clock_timestamp() from public.stylists where owner_id = user_id;

  select id from public.stylists where owner_id = user_id
$$;

create function pg_temp.act_as(user_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

create function pg_temp.book(stylist uuid, days int, contact jsonb)
returns uuid
language plpgsql
as $$
declare
  held jsonb := public.hold_booking(
    (select id from public.services where stylist_id = stylist order by sort limit 1), '{}',
    (((now() at time zone 'Europe/London')::date + days) + time '10:00') at time zone 'Europe/London'
  );
begin
  perform public.checkout_booking((held ->> 'id')::uuid, held ->> 'secret', contact, null, null, null, null, null);
  update public.bookings set status = 'confirmed' where id = (held ->> 'id')::uuid;

  return (held ->> 'id')::uuid;
end;
$$;

create temp table ids as
select
  pg_temp.open_business('a5111111-1111-1111-1111-111111111111') as shop,
  pg_temp.open_business('a5222222-2222-2222-2222-222222222222') as other;

grant select on ids to authenticated;

-- matching online bookings to clients
create temp table b as select
  pg_temp.book((select shop from ids), 3, '{"first":"Nia","last":"Okafor","email":"Nia@Clients.test","phone":"+44 7700 900123"}') as first_booking,
  pg_temp.book((select shop from ids), 4, '{"first":"Nia","email":"nia@clients.test"}') as same_email,
  pg_temp.book((select shop from ids), 5, '{"first":"N","phone":"07700900123"}') as same_phone,
  pg_temp.book((select shop from ids), 6, '{"first":"Kemi","email":"kemi@clients.test","phone":"07700900123"}') as new_email;

create function pg_temp.client_of(booking uuid)
returns uuid
language sql
as $$
  select stylist_client_id from public.bookings where id = booking
$$;

select is(
  (select concat_ws(' ', first, last, email, phone) from public.stylist_clients
    where id = pg_temp.client_of((select first_booking from b))),
  'Nia Okafor nia@clients.test 07700900123', 'a first booking makes a client, with tidy contact details'
);
select is(pg_temp.client_of((select same_email from b)), pg_temp.client_of((select first_booking from b)),
  'the same email is the same client');
select is(pg_temp.client_of((select same_phone from b)), pg_temp.client_of((select first_booking from b)),
  'so is the same phone with no email');
select is(
  array[public.normalise_phone('7700 900123'), public.normalise_phone('+44 07700 900123'), public.normalise_phone('07700900123')],
  array['07700900123', '07700900123', '07700900123'], 'every way of writing a mobile is stored the same'
);
select isnt(pg_temp.client_of((select new_email from b)), pg_temp.client_of((select first_booking from b)),
  'a new email is a new client, even on a shared phone');

select is(
  (select first from public.stylist_clients where email = 'nia@clients.test'),
  'Nia', 'a booking never changes the details the stylist has'
);

select is(
  (select count(*)::int from public.stylist_clients where stylist_id = (select other from ids)),
  0, 'other stylists don''t get the client'
);

-- the list, only for its owner
select pg_temp.act_as('a5111111-1111-1111-1111-111111111111');
select is(
  (select concat_ws(' ', first, upcoming, visits) from public.get_studio_clients((select shop from ids)) where first = 'Nia'),
  'Nia 3 0', 'the owner sees each client with their bookings'
);
select is((select count(*)::int from public.stylist_clients), 2, 'and can read their own clients');
select pg_temp.act_as('a5222222-2222-2222-2222-222222222222');
select is((select count(*)::int from public.get_studio_clients((select shop from ids))), 0, 'another stylist sees none');
select is((select count(*)::int from public.stylist_clients), 0, 'and can''t read them');
reset role;

-- adding and editing
select pg_temp.act_as('a5111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select public.save_stylist_client(%L, %L)', (select shop from ids), '{"first":"Ade"}'),
  'contact_required', 'a client needs a phone or an email'
);
select throws_ok(
  format('select public.save_stylist_client(%L, %L)', (select shop from ids), '{"first":"Ade","email":"KEMI@clients.test"}'),
  'duplicate_email', 'emails are one per client'
);
select lives_ok(
  format('select public.save_stylist_client(%L, %L)', (select shop from ids), '{"first":"Ade","phone":"07700900123"}'),
  'phones can be shared'
);
reset role;
update public.stylist_clients set created_at = now() + interval '1 minute' where first = 'Ade';
create temp table ade as select pg_temp.book((select shop from ids), 7, '{"first":"Ade","phone":"07700900123"}') as booking;
select is(
  (select first from public.stylist_clients where id = pg_temp.client_of((select booking from ade))),
  'Ade', 'a phone-only booking goes to the newest client with that phone'
);
select pg_temp.act_as('a5111111-1111-1111-1111-111111111111');
select public.save_stylist_client((select shop from ids),
  '{"first":"Nia","last":"Okafor","email":"nia.new@clients.test","phone":"07700900123","hair_notes":"Rosemary oil"}',
  (select id from public.stylist_clients where email = 'nia@clients.test'));
reset role;
select is(
  (select count(*)::int from public.bookings where contact ->> 'email' = 'nia.new@clients.test' and starts_at > now()),
  3, 'a new email goes on their bookings still to come'
);
select is(
  (select count(*)::int from public.bookings
    where stylist_client_id = (select id from public.stylist_clients where email = 'nia.new@clients.test')),
  3, 'and they stay Nia''s bookings'
);
select is(
  (select count(*)::int from public.booking_tokens
    where booking_id in (select id from public.bookings where contact ->> 'email' = 'nia.new@clients.test')),
  0, 'links sent to the old email stop working'
);
select is(
  (select hair_notes from public.stylist_clients where email = 'nia.new@clients.test'),
  'Rosemary oil', 'hair notes are saved'
);
select pg_temp.act_as('a5222222-2222-2222-2222-222222222222');
select throws_ok(
  format('select public.save_stylist_client(%L, %L)', (select shop from ids), '{"first":"Ade","phone":"07700900321"}'),
  'not_found', 'another stylist can''t add to the list'
);
reset role;

-- blocking
select pg_temp.act_as('a5111111-1111-1111-1111-111111111111');
select public.set_client_blocked((select id from public.stylist_clients where email = 'kemi@clients.test' and stylist_id = (select shop from ids)), true);
reset role;
select throws_ok(
  format('select pg_temp.book(%L, 8, %L)', (select shop from ids), '{"first":"Kemi","email":"kemi@clients.test"}'),
  'not_bookable_contact', 'a blocked client can''t book online'
);
select lives_ok(
  format('select pg_temp.book(%L, 9, %L)', (select shop from ids), '{"first":"Nia","email":"nia.new@clients.test","phone":"07700900123"}'),
  'someone sharing their phone, with their own email, still can'
);
select lives_ok(
  format('select pg_temp.book(%L, 10, %L)', (select other from ids), '{"first":"Kemi","email":"kemi@clients.test"}'),
  'and the block is only with this stylist'
);

-- deleting
select pg_temp.act_as('a5111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select public.delete_stylist_client(%L)', (select id from public.stylist_clients where email = 'kemi@clients.test' and stylist_id = (select shop from ids))),
  'has_upcoming', 'a client with bookings to come can''t be deleted'
);
reset role;
update public.bookings set status = 'completed'
where stylist_client_id = (select id from public.stylist_clients where email = 'kemi@clients.test' and stylist_id = (select shop from ids));
insert into public.payments (booking_id, kind, amount_pence)
select id, 'booking', 1000 from public.bookings
where stylist_client_id = (select id from public.stylist_clients where email = 'kemi@clients.test' and stylist_id = (select shop from ids)) limit 1;
select pg_temp.act_as('a5111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select public.delete_stylist_client(%L)', (select id from public.stylist_clients where email = 'kemi@clients.test' and stylist_id = (select shop from ids))),
  'recent_payment', 'nor one who paid in the last 120 days'
);
reset role;
update public.payments set created_at = now() - interval '121 days'
where booking_id in (select id from public.bookings
  where stylist_client_id = (select id from public.stylist_clients where email = 'kemi@clients.test' and stylist_id = (select shop from ids)));
-- one of their bookings was sent a confirm link nobody answered, so it was auto-cancelled still "pending"
update public.bookings set status = 'auto_cancelled', protection_status = 'pending'
where id = (select id from public.bookings
  where stylist_client_id = (select id from public.stylist_clients where email = 'kemi@clients.test' and stylist_id = (select shop from ids))
  order by starts_at limit 1);
create temp table kemi as select id from public.stylist_clients where email = 'kemi@clients.test' and stylist_id = (select shop from ids);
grant select on kemi to authenticated;
select pg_temp.act_as('a5111111-1111-1111-1111-111111111111');
select public.delete_stylist_client((select id from kemi));
reset role;
select is(
  (select concat_ws(' ', first, coalesce(email, '-'), coalesce(phone, '-'), deleted_at is not null) from public.stylist_clients where id = (select id from kemi)),
  'Deleted client - - t', 'deleting clears their details'
);
select is(
  (select count(*)::int from public.bookings where stylist_client_id = (select id from kemi) and contact ->> 'first' = 'Kemi'),
  1, 'their bookings keep the name, and stay with the deleted client'
);
select is(
  (select count(*)::int from public.bookings where stylist_client_id = (select id from kemi)
    and (contact ? 'email' or contact ? 'phone')),
  0, 'but not their email or phone'
);
create temp table reopened as
select id from public.bookings where stylist_client_id = (select id from kemi) and status = 'auto_cancelled' limit 1;
grant select on reopened to authenticated;
update public.bookings set terms = coalesce(terms, '{}'::jsonb) || '{"mode": "card"}' where id = (select id from reopened);
select pg_temp.act_as('a5111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select public.reopen_studio_booking(%L)', (select id from reopened)),
  'email_required', 'and a new confirm link can''t be "sent" to them with no email'
);
reset role;
select lives_ok(
  format('select pg_temp.book(%L, 11, %L)', (select shop from ids), '{"first":"Kemi","email":"kemi@clients.test"}'),
  'and the block goes with them'
);

select ok(
  not has_function_privilege('anon', 'public.get_studio_clients(uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.match_stylist_client(uuid, jsonb)', 'execute'),
  'the client list is for signed-in stylists; matching is server-only'
);

select * from finish();
rollback;
