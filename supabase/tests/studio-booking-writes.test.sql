begin;
select plan(77);

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
        'contact_email', 'studio@writes.test', 'contact_phone', '07700900999'
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

select pg_temp.sign_up('e1111111-1111-1111-1111-111111111111', 'owner@writes.test', 'Writes Test');
select pg_temp.sign_up('e2222222-2222-2222-2222-222222222222', 'other@writes.test', 'Other Writes');

-- a draft (not live) stylist with one active £100 service, a 20% refundable deposit policy and a ready Stripe account
update public.stylists set charges_enabled = true, stripe_account_id = 'acct_writes' where slug = 'writes-test';

update public.services set status = 'active', price_pence = 10000, duration_min = 60, sizes_on = false, lengths_on = false
where id = (select id from public.services where stylist_id = (select id from public.stylists where slug = 'writes-test')
  order by sort limit 1);

insert into public.addons (stylist_id, name, price_pence, minutes, status)
select id, 'Beads', 500, 15, 'active' from public.stylists where slug = 'writes-test';

insert into public.service_addons (service_id, addon_id)
select services.id, addons.id from public.services
join public.addons on addons.stylist_id = services.stylist_id
where services.status = 'active' and services.stylist_id = (select id from public.stylists where slug = 'writes-test');

insert into public.payment_policies (stylist_id, mode, deposit_percent, refundable, free_window_hours, late_on, no_show_on,
  created_at)
select id, 'deposit', 20, true, 48, true, true, now() + interval '1 second' from public.stylists where slug = 'writes-test';

create temp table s as
select services.id as service, addons.id as addon, stylists.id as stylist
from public.stylists
join public.services on services.stylist_id = stylists.id and services.status = 'active'
join public.addons on addons.stylist_id = stylists.id
where stylists.slug = 'writes-test';

create temp table r (name text primary key, result jsonb);

grant select on s to authenticated;
grant all on r to authenticated;

-- a day at 10:00 London, `days` from today
create function pg_temp.at(days integer, clock text default '10:00')
returns timestamptz
language sql
stable
as $$
  select ((current_date + days)::text || ' ' || clock)::timestamp at time zone 'Europe/London'
$$;

create function pg_temp.create(name text, starts timestamptz, contact jsonb, protect boolean, overlap boolean default false)
returns void
language sql
as $$
  insert into r values (name, public.create_studio_booking(
    (select service from s), '{}', starts, 60, 10, 10000, '[]', contact, null, 'Bring photos', protect, overlap,
    'http://localhost:5173'))
$$;

create function pg_temp.id(name text)
returns uuid
language sql
stable
as $$
  select (result ->> 'id')::uuid from r where r.name = $1
$$;

create function pg_temp.token(target uuid)
returns text
language plpgsql
as $$
declare
  token text := 'tok-' || gen_random_uuid();
begin
  insert into public.booking_tokens (booking_id, purpose, token_hash, expires_at)
  select id, 'confirm', sha256(convert_to(token, 'UTF8')), confirm_by from public.bookings where id = target;

  return token;
end;
$$;

-- ownership
select pg_temp.act_as('e2222222-2222-2222-2222-222222222222');
select throws_ok(
  format('select public.create_studio_booking(%L, %L, %L, 60, 10, 10000, %L, null, null, null, false, false, null)',
    (select service from s), '{}', pg_temp.at(3), '[]'),
  'not_found', 'another stylist can''t book into this studio'
);

select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');

select pg_temp.create('protected', pg_temp.at(5), '{"first": "Nia", "last": "Okafor", "email": "NIA@writes.test"}', true);
select pg_temp.create('skipped', pg_temp.at(6), '{"first": "Ruth", "phone": "07700 900111"}', false);
select pg_temp.create('walk_in', pg_temp.at(7), null, false);

reset role;

select is(
  (select concat_ws(' ', status, protection_status, fee_pence, due_today_pence, created_by, confirm_sends)
    from public.bookings where id = pg_temp.id('protected')),
  'awaiting_confirmation pending 200 2200 stylist 1',
  'a protected booking waits for the client: 20% deposit + booking fee to pay'
);
select ok(
  (select confirm_by = least(created_at + interval '48 hours', starts_at - interval '2 hours')
    from public.bookings where id = pg_temp.id('protected')),
  'it auto-cancels 48 hours after it''s made, or 2 hours before the start'
);
select is(
  (select concat_ws(' ', to_address, payload ->> 'due_pence', payload ->> 'confirm_url' like 'http://localhost:5173/confirm?token=%')
    from public.notifications where template = 'confirm_booking' and payload ->> 'ref' = (select ref from public.bookings where id = pg_temp.id('protected'))),
  'nia@writes.test 2200 t',
  'the client is emailed a link to confirm and pay'
);
select is(
  (select concat_ws(' ', status, protection_status, fee_pence, due_today_pence, terms ->> 'mode', terms ->> 'late_on')
    from public.bookings where id = pg_temp.id('skipped')),
  'confirmed overridden 0 0 none false',
  'skipping protection confirms it straight away, with no fees to enforce'
);
select ok(
  (select protection_overridden_at is not null and contact ->> 'phone' = '07700 900111' and (select note from public.booking_notes where booking_id = pg_temp.id('skipped')) = 'Bring photos'
    from public.bookings where id = pg_temp.id('skipped')),
  'and records the override'
);
select is(
  (select count(*)::int from public.notifications where template = 'booking_added_by_stylist'
    and payload ->> 'ref' = (select ref from public.bookings where id = pg_temp.id('skipped'))),
  0, 'a client with only a phone number isn''t emailed'
);
select is(
  (select concat_ws(' ', status, protection_status, contact is null, fee_pence)
    from public.bookings where id = pg_temp.id('walk_in')),
  'confirmed not_required t 0',
  'a walk-in has no client and no protection'
);

-- times
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select pg_temp.create(%L, %L, null, false)', 'yesterday', pg_temp.at(-1)),
  'start_too_early', 'nothing before today'
);
select pg_temp.create('earlier', now() - interval '1 minute', '{"first": "Kemi", "email": "kemi@writes.test"}', false, true);
reset role;
select is(
  (select concat_ws(' ', status, protection_status, arrived_at is not null) from public.bookings where id = pg_temp.id('earlier')),
  'arrived overridden t', 'a start earlier today is logged as arrived, unprotected'
);
select is(
  (select count(*)::int from public.notifications where payload ->> 'ref' = (select ref from public.bookings where id = pg_temp.id('earlier'))),
  0, 'and nothing is sent'
);
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select pg_temp.create(%L, %L, %L, true)', 'soon', now() + interval '90 minutes', '{"first": "Ama", "email": "ama@writes.test"}'),
  'too_late_to_protect', 'protection needs more than 2 hours before the start'
);
select throws_ok(
  format('select pg_temp.create(%L, %L, %L, true)', 'past_protect', now() - interval '5 minutes', '{"first": "Ama", "email": "ama@writes.test"}'),
  'invalid_booking', 'a past start can''t be protected'
);
select throws_ok(
  format('select pg_temp.create(%L, %L, null, true)', 'walk_in_protect', pg_temp.at(8)),
  'invalid_booking', 'nor can a walk-in'
);

-- clients
select throws_ok(
  format('select pg_temp.create(%L, %L, %L, false)', 'no_contact', pg_temp.at(9), '{"first": "Ama"}'),
  'contact_required', 'a client needs a phone or an email'
);
select throws_ok(
  format('select pg_temp.create(%L, %L, %L, false)', 'bad_phone', pg_temp.at(9), '{"first": "Ama", "phone": "0161 000 0000"}'),
  'invalid_phone', 'a phone must be a UK mobile'
);

-- clashes
select throws_ok(
  format('select pg_temp.create(%L, %L, null, false)', 'clash', pg_temp.at(5, '10:30')),
  'slot_taken', 'it can''t overlap another booking'
);
select pg_temp.create('double', pg_temp.at(5, '10:30'), null, false, true);
select ok(pg_temp.id('double') is not null, 'unless the stylist books it anyway');

-- policies
reset role;
update public.stylists set charges_enabled = false where slug = 'writes-test';
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select pg_temp.create(%L, %L, %L, true)', 'no_stripe', pg_temp.at(10), '{"first": "Ama", "email": "ama@writes.test"}'),
  'cannot_protect', 'a deposit can''t be asked for until Stripe can pay the stylist'
);
reset role;
update public.stylists set charges_enabled = true where slug = 'writes-test';

-- a draft stylist can book in Studio, but online pricing still needs a live one
select throws_ok(
  format('select public.price_booking(%L, %L)', (select service from s), '{}'),
  'not_bookable', 'online booking still needs the stylist to be live'
);

-- add-on prices for this booking only
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
insert into r values ('addon', public.create_studio_booking(
  (select service from s), jsonb_build_object('addons', jsonb_build_array((select addon from s))), pg_temp.at(11), 90, 0, 11200,
  jsonb_build_array(jsonb_build_object('id', (select addon from s), 'price_pence', 600, 'minutes', 30, 'quantity', 2)),
  null, null, null, false, false, null));
reset role;
select is(
  (select (snapshot -> 'addons' -> 0) ->> 'price_pence' || ' x' || ((snapshot -> 'addons' -> 0) ->> 'quantity') || ' ' || price_pence
    from public.bookings where id = pg_temp.id('addon')),
  '600 x2 11200', 'a booking keeps its own add-on prices and quantities'
);

-- the confirm link
create temp table t as select pg_temp.token(pg_temp.id('protected')) as first;
grant select on t to authenticated;

select is(public.get_booking_confirmation((select first from t)) ->> 'state', 'open', 'the client''s link opens');
select is(public.get_booking_confirmation('nope'), null, 'an unknown link doesn''t');

-- editing while the client still has to confirm: new price, new link
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select public.update_studio_booking(pg_temp.id('protected'), (select service from s), '{}', pg_temp.at(5), 60, 10, 15000, '[]', 'Longer hair', false);
reset role;
select is(
  (select concat_ws(' ', fee_pence, due_today_pence, terms ->> 'deposit_pence', confirm_sends, snapshot ->> 'price_reason')
    from public.bookings where id = pg_temp.id('protected')),
  '275 3275 3000 1 Longer hair', 'a price change updates the deposit and fee to pay (not a resend)'
);
select is(public.get_booking_confirmation((select first from t)) ->> 'state', 'changed', 'the old link says the booking changed');
select is(
  (select count(*)::int from public.notifications where template = 'confirm_booking_changed'
    and payload ->> 'ref' = (select ref from public.bookings where id = pg_temp.id('protected'))),
  1, 'and the client gets a new one'
);

-- paying
create temp table t2 as select pg_temp.token(pg_temp.id('protected')) as second;
select is(public.start_booking_confirmation((select second from t2)) ->> 'due_today_pence', '3275', 'paying starts at the new amount');
select ok((select policy_accepted_at is not null from public.bookings where id = pg_temp.id('protected')), 'with the policy accepted');
update public.bookings set stripe_payment_intent_id = 'pi_writes_protected' where id = pg_temp.id('protected');
select is(public.confirm_booking_payment('pi_writes_protected', 2200), 'refund', 'a payment for the old amount is refunded');
select is((select status from public.bookings where id = pg_temp.id('protected')), 'awaiting_confirmation', 'and it still waits');
select is(public.confirm_booking_payment('pi_writes_protected', 3275), 'confirmed', 'the right amount confirms it');
select is(
  (select concat_ws(' ', status, protection_status, paid_at is not null, confirm_by is null) from public.bookings where id = pg_temp.id('protected')),
  'confirmed protected t t', 'protected, paid'
);
select is(
  (select concat_ws(' ', amount_pence, platform_fee_pence) from public.payments where booking_id = pg_temp.id('protected')),
  '3275 275', 'the payment is recorded with the platform''s fee'
);
select is(public.get_booking_confirmation((select second from t2)) ->> 'state', 'confirmed', 'the link now says it''s confirmed');
select is(public.confirm_booking_payment('pi_writes_protected', 3275), 'duplicate', 'a repeated webhook changes nothing');

-- once paid the client can't be swapped
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select public.change_booking_client(%L, %L, false)', pg_temp.id('protected'), '{"first": "Ama", "email": "ama@writes.test"}'),
  'client_locked', 'a paid booking''s client can''t be changed'
);

-- a confirmed, paid booking edited: the client is told
select public.update_studio_booking(pg_temp.id('protected'), (select service from s), '{}', pg_temp.at(5, '11:00'), 60, 10, 15000, '[]', null, true);
reset role;
select is(
  (select concat_ws(' ', fee_pence, due_today_pence) from public.bookings where id = pg_temp.id('protected')),
  '275 3275', 'what was paid stays as it was'
);
select is(
  (select count(*)::int from public.notifications where template = 'booking_updated_by_stylist'
    and payload ->> 'ref' = (select ref from public.bookings where id = pg_temp.id('protected'))),
  1, 'and the client is told about the change'
);

-- a new client for an unprotected booking, asked for protection this time
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select public.change_booking_client(pg_temp.id('skipped'), '{"first": "Ama", "email": "ama@writes.test"}', true);
reset role;
select is(
  (select concat_ws(' ', status, protection_status, contact ->> 'first', fee_pence, confirm_sends)
    from public.bookings where id = pg_temp.id('skipped')),
  'awaiting_confirmation pending Ama 200 1', 'the new client is asked to confirm'
);

-- confirming without protection, then the client pays anyway
create temp table t3 as select pg_temp.token(pg_temp.id('skipped')) as link;
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select public.confirm_without_protection(pg_temp.id('skipped'));
reset role;
select is(
  (select concat_ws(' ', status, protection_status, fee_pence) from public.bookings where id = pg_temp.id('skipped')),
  'confirmed overridden 0', 'confirmed without protection'
);
select is(public.get_booking_confirmation((select link from t3)) ->> 'state', 'confirmed', 'the client''s link shows it''s confirmed');
update public.bookings set stripe_payment_intent_id = 'pi_writes_late' where id = pg_temp.id('skipped');
select is(public.confirm_booking_payment('pi_writes_late', 2200), 'refund', 'a payment after the override is refunded');

select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select public.confirm_without_protection(%L)', pg_temp.id('protected')),
  'status_not_allowed', 'a protected booking can''t be confirmed by hand'
);

-- resends: two after the first
select pg_temp.create('chase', pg_temp.at(12), '{"first": "Zara", "email": "zara@writes.test"}', true);
select is(public.resend_confirm_link(pg_temp.id('chase'))::int, 2, 'a first resend');
select is(public.resend_confirm_link(pg_temp.id('chase'))::int, 3, 'a second');
select throws_ok(format('select public.resend_confirm_link(%L)', pg_temp.id('chase')), 'resend_not_allowed', 'no third');
select throws_ok(
  format('select pg_temp.create(%L, %L, %L, true)', 'phone_only', pg_temp.at(12, '14:00'), '{"first": "Bisi", "phone": "07700900111"}'),
  'email_required', 'a client with no email can''t be sent a confirm link, so the booking can''t ask for protection');
select ok(public.get_confirm_url(pg_temp.id('chase')) like 'http://localhost:5173/confirm?token=%', 'copying the link has no limit');

-- auto-cancel
reset role;
update public.bookings set confirm_by = now() + interval '30 minutes', created_at = now() - interval '47 hours'
where id = pg_temp.id('chase');
select public.auto_cancel_unconfirmed();
select public.auto_cancel_unconfirmed();
select is(
  (select count(*)::int from public.notifications where template = 'auto_cancel_soon' and to_address = 'owner@writes.test'),
  1, 'the stylist is warned once, an hour before'
);
update public.bookings set confirm_by = now() - interval '1 minute' where id = pg_temp.id('chase');
select public.auto_cancel_unconfirmed();
select is(
  (select concat_ws(' ', status, cancelled_at is not null) from public.bookings where id = pg_temp.id('chase')),
  'auto_cancelled t', 'not confirmed in time: auto-cancelled'
);
select is(
  (select string_agg(template, ' ' order by template) from public.notifications
    where template in ('booking_auto_cancelled', 'auto_cancelled')
      and payload ->> 'ref' = (select ref from public.bookings where id = pg_temp.id('chase'))),
  'auto_cancelled booking_auto_cancelled', 'client and stylist are told'
);
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select public.reopen_studio_booking(pg_temp.id('chase'));
reset role;
select is(
  (select concat_ws(' ', status, confirm_sends, confirm_by > now()) from public.bookings where id = pg_temp.id('chase')),
  'awaiting_confirmation 1 t', '"Send a new link" reopens it with a new deadline'
);

-- moving an awaiting booking replaces its link
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select public.reschedule_studio_booking(pg_temp.id('chase'), pg_temp.at(13), false);
reset role;
select is(
  (select count(*)::int from public.notifications where template = 'confirm_booking_changed'
    and payload ->> 'ref' = (select ref from public.bookings where id = pg_temp.id('chase'))),
  1, 'moving it sends a new link'
);

-- the client's manage link; walk-ins have none
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select ok(public.get_manage_url(pg_temp.id('protected'), false) like 'http://localhost:5173/manage?token=%', 'the stylist can copy the client''s manage link');
select throws_ok(format('select public.get_manage_url(%L, false)', pg_temp.id('walk_in')), 'link_not_available', 'a walk-in has none');
select public.set_stylist_note(pg_temp.id('walk_in'), '  Cash  ');
reset role;
select is((select note from public.booking_notes where booking_id = pg_temp.id('walk_in')), 'Cash', 'the stylist''s own note is saved');

-- a booking logged after it started stays where it happened
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select public.reschedule_studio_booking(%L, %L, true)', pg_temp.id('earlier'), pg_temp.at(20)),
  'reschedule_not_allowed', 'a booking logged after it started can''t be moved'
);

-- swapping the client tells the previous one their booking is cancelled
select pg_temp.create('swap', pg_temp.at(21), '{"first": "Ife", "email": "ife@writes.test"}', false);
select public.change_booking_client(pg_temp.id('swap'), '{"first": "Tomi", "email": "tomi@writes.test"}', false);
reset role;
select is(
  (select count(*)::int from public.notifications where template = 'booking_cancelled_by_stylist' and to_address = 'ife@writes.test'),
  1, 'the previous client is told their booking is cancelled'
);
select is(
  (select count(*)::int from public.notifications where template = 'booking_added_by_stylist' and to_address = 'tomi@writes.test'),
  1, 'and the new one gets the booking'
);

-- the previous client's link shows nothing about the new one
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select pg_temp.create('swap_link', pg_temp.at(25), '{"first": "Ife", "email": "ife@writes.test"}', true);
reset role;
create temp table old_link as select pg_temp.token(pg_temp.id('swap_link')) as old;
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select public.change_booking_client(pg_temp.id('swap_link'), '{"first": "Tomi", "email": "tomi@writes.test"}', true);
reset role;
select is(public.get_booking_confirmation((select old from old_link)), null, 'an old client''s link stops working entirely');

-- editing the time follows the reschedule rules
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select public.update_studio_booking(%L, %L, ''{}'', %L, 60, 10, 9000, ''[]'', '''', true)',
    pg_temp.id('walk_in'), (select service from s), now() - interval '5 minutes'),
  'reschedule_not_allowed', 'a booking can''t move to a time that has passed'
);
select throws_ok(
  format('select public.update_studio_booking(%L, %L, ''{}'', %L, 60, 10, 9000, ''[]'', '''', true)',
    pg_temp.id('earlier'), (select service from s), pg_temp.at(23)),
  'reschedule_not_allowed', 'a booking logged after it started can''t be moved by editing'
);
select lives_ok(
  format('select public.update_studio_booking(%L, %L, ''{}'', (select starts_at from public.bookings where id = %L), 60, 10, 9500, ''[]'', '''', true)',
    pg_temp.id('earlier'), (select service from s), pg_temp.id('earlier')),
  'but its price can still change'
);
reset role;
update public.bookings set status = 'arrived', arrived_at = now() where id = pg_temp.id('walk_in');
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select public.update_studio_booking(pg_temp.id('walk_in'), (select service from s), '{}', pg_temp.at(24), 60, 10, 9000, '[]', '', true);
reset role;
select is((select concat_ws(' ', status, arrived_at is null) from public.bookings where id = pg_temp.id('walk_in')),
  'confirmed t', 'moving an arrived booking makes it confirmed again');

-- the add-booking warning: a fee this client owes
insert into public.booking_fees (booking_id, kind, amount_pence, kept_pence, refund_pence, charge_pence, status, charge_after)
values (pg_temp.id('walk_in'), 'no_show', 3500, 0, 0, 3500, 'unpaid', now());
update public.bookings set contact = '{"first": "Owes", "email": "owes@writes.test", "phone": "07700900333"}'
where id = pg_temp.id('walk_in');
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select is(
  public.get_client_unpaid_fee((select stylist from s), 'OWES@writes.test', '') ->> 'amount_pence', '3500',
  'the stylist sees what a client they''re booking owes them, by email'
);
select pg_temp.act_as('e2222222-2222-2222-2222-222222222222');
select is(
  public.get_client_unpaid_fee((select stylist from s), 'owes@writes.test', '07700 900333'), null,
  'but no other stylist can look it up'
);
reset role;

-- a home-based stylist's address stays private until the client has confirmed
update public.stylists set business_type = 'home_based', area_label = 'Ancoats' where slug = 'writes-test';
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select pg_temp.create('home', pg_temp.at(22), '{"first": "Bisi", "email": "bisi@writes.test"}', true);
reset role;
create temp table t4 as select pg_temp.token(pg_temp.id('home')) as link;
select is(public.get_booking_confirmation((select link from t4)) ->> 'where', 'Writes Test, Ancoats',
  'before confirming, the client sees a home-based stylist''s area, not their address');
select is(
  (select payload ->> 'where' from public.notifications where template = 'confirm_booking' and to_address = 'bisi@writes.test'),
  'Writes Test, Ancoats', 'and so does the confirm email'
);
update public.bookings set stripe_payment_intent_id = 'pi_writes_home' where id = pg_temp.id('home');
select public.confirm_booking_payment('pi_writes_home', (select due_today_pence from public.bookings where id = pg_temp.id('home')));
select ok(public.get_booking_confirmation((select link from t4)) ->> 'where' like 'Writes Test, 1 High St%',
  'once confirmed, the address is shown');

-- the client can't read the stylist's note
update public.bookings set client_id = 'e2222222-2222-2222-2222-222222222222' where id = pg_temp.id('walk_in');
select pg_temp.act_as('e2222222-2222-2222-2222-222222222222');
select is((select count(*)::int from public.booking_notes where booking_id = pg_temp.id('walk_in')), 0,
  'a client never sees the stylist''s note on their booking');
reset role;

-- cancelling a booking the client hasn't confirmed takes no fee
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select pg_temp.create('unconfirmed', now() + interval '3 hours', '{"first": "Lola", "email": "lola@writes.test"}', true);
reset role;
select is(
  public.get_studio_cancellation(pg_temp.id('unconfirmed'), 'e1111111-1111-1111-1111-111111111111', 'client', false) ->> 'charge_pence',
  '0', 'an unconfirmed booking has nothing to keep or charge'
);

-- a payment for an intent the booking no longer points to is refunded
select is(public.confirm_booking_payment('pi_writes_orphan', 2200, pg_temp.id('unconfirmed')), 'refund',
  'a payment the booking no longer expects is refunded');
select throws_ok(
  format('select public.confirm_booking_payment(%L, 100, %L)', 'pi_elsewhere', gen_random_uuid()),
  'booking_not_found', 'one for a booking from somewhere else is left alone'
);

-- editing an online booking keeps its options
update public.bookings set choices = '{"variations": [], "addons": [], "colour": "1B"}' where id = pg_temp.id('walk_in');
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select public.update_studio_booking(pg_temp.id('walk_in'), (select service from s), '{}', pg_temp.at(7), 60, 10, 9000, '[]', '', true);
reset role;
select is((select choices ->> 'colour' from public.bookings where id = pg_temp.id('walk_in')), '1B',
  'an edit keeps the options the client chose');

-- phones match however they're written
select is(public.normalise_phone('+44 7700 900333'), '07700900333', 'a +44 number matches its 07 form');
select pg_temp.act_as('e1111111-1111-1111-1111-111111111111');
select is(public.get_client_unpaid_fee((select stylist from s), '', '+447700900333') ->> 'amount_pence', '3500',
  'so the unpaid-fee warning finds it');
reset role;

select ok(
  has_function_privilege('authenticated', 'public.create_studio_booking(uuid, jsonb, timestamptz, integer, integer, integer, jsonb, jsonb, jsonb, text, boolean, boolean, text)', 'execute')
    and not has_function_privilege('anon', 'public.create_studio_booking(uuid, jsonb, timestamptz, integer, integer, integer, jsonb, jsonb, jsonb, text, boolean, boolean, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.start_booking_confirmation(text)', 'execute')
    and not has_function_privilege('authenticated', 'public.confirm_booking_payment(text, integer, uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.auto_cancel_unconfirmed()', 'execute'),
  'stylists book through Studio; confirming and auto-cancelling are server-only'
);

select * from finish();
rollback;
