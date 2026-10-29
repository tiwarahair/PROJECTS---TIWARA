begin;
select plan(15);

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
        'contact_email', 'resend@resend.test'
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

select pg_temp.sign_up('c6111111-1111-1111-1111-111111111111', 'owner@resend.test', 'Resend Test');
select pg_temp.sign_up('c6222222-2222-2222-2222-222222222222', 'other@resend.test', 'Other Resend');

create function pg_temp.book(starts_in interval)
returns uuid
language plpgsql
as $$
declare
  booking_id uuid;
begin
  insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, starts_at,
    ends_at, block_ends_at, status, contact, terms, due_today_pence)
  select stylists.id, services.id, '{}', '{"service_name": "Silk press"}', 10000, 163, 10,
    now() + starts_in, now() + starts_in + interval '10 minutes', now() + starts_in + interval '10 minutes', 'held',
    '{"first": "Nia", "last": "Okafor", "email": "nia@resend.test", "phone": "07700900123"}',
    '{"grace_minutes": 0, "mode": "none"}', 163
  from public.stylists
  join public.services on services.stylist_id = stylists.id
  where stylists.slug = 'resend-test'
  order by services.sort
  limit 1
  returning id into booking_id;

  update public.bookings set status = 'arrived', arrived_at = now() where id = booking_id;

  return booking_id;
end;
$$;

create function pg_temp.check_out(target uuid)
returns text
language sql
as $$
  with input as (
    select '{"method": "record", "tip_pence": 0, "via": "cash", "lines": [{"name": "Silk press", "subtitle": "",
      "base_pence": 10000, "adjustment_pence": 0, "reason": ""}]}'::jsonb as body
  )
  select public.finish_checkout(target, body || jsonb_build_object(
    'final_pence', (claim ->> 'final_pence')::integer, 'charge_pence', (claim ->> 'charge_pence')::integer
  ))
  from input, public.claim_checkout(target, 'c6111111-1111-1111-1111-111111111111', body) as claim
$$;

create function pg_temp.receipts(address text)
returns integer
language sql
as $$
  select count(*)::int from public.notifications where template = 'checkout_receipt' and to_address = address
$$;

create temp table b as select pg_temp.book(interval '-1 hour') as paid, pg_temp.book(interval '-2 hours') as open;
grant select on b to authenticated;
select pg_temp.check_out((select paid from b));

select pg_temp.act_as('c6222222-2222-2222-2222-222222222222');
select throws_ok(
  format('select public.resend_checkout_receipt(%L, %L)', (select paid from b), 'nia@resend.test'),
  'not_found', 'another stylist can’t resend it'
);

select pg_temp.act_as('c6111111-1111-1111-1111-111111111111');
select throws_ok(
  format('select public.resend_checkout_receipt(%L, %L)', (select open from b), 'nia@resend.test'),
  'receipt_not_available', 'a booking that isn’t checked out has no receipt'
);
select throws_ok(
  format('select public.resend_checkout_receipt(%L, %L)', (select paid from b), 'not an email'),
  'invalid_email', 'the address must be an email'
);
select lives_ok(
  format('select public.resend_checkout_receipt(%L, %L)', (select paid from b), ' copy@resend.test '),
  'the owner can resend it'
);
reset role;

select is(pg_temp.receipts('copy@resend.test'), 1, 'the receipt is queued to the chosen address');
select is(
  (select payload - 'corrected' from public.notifications where to_address = 'copy@resend.test'),
  public.get_receipt_details((select paid from b)),
  'with the checkout receipt’s details'
);
select is(
  (select contact ->> 'email' from public.bookings where id = (select paid from b)),
  'nia@resend.test', 'the client’s email isn’t changed'
);

select pg_temp.act_as('c6111111-1111-1111-1111-111111111111');
select public.resend_checkout_receipt((select paid from b), 'copy@resend.test');
select public.resend_checkout_receipt((select paid from b), 'copy@resend.test');
select throws_ok(
  format('select public.resend_checkout_receipt(%L, %L)', (select paid from b), 'copy@resend.test'),
  'resend_limit', 'three resends a day at most'
);
reset role;

select is(pg_temp.receipts('copy@resend.test'), 3, 'only the allowed resends are queued');

update public.booking_events set created_at = now() - interval '25 hours'
where booking_id = (select paid from b) and kind = 'receipt_resent';
select pg_temp.act_as('c6111111-1111-1111-1111-111111111111');
select lives_ok(
  format('select public.resend_checkout_receipt(%L, %L)', (select paid from b), 'copy@resend.test'),
  'a day later it can be resent again'
);
reset role;

insert into public.refunds (booking_id, amount_pence, reason, method)
values ((select paid from b), 2000, 'manual', 'card'), ((select paid from b), 500, 'manual', 'cash');
select is(
  (select concat_ws(' ', refunded_pence, given_back_pence, given_back_via)
    from jsonb_to_record(public.get_receipt_details((select paid from b)))
      as receipt(refunded_pence int, given_back_pence int, given_back_via text)),
  '2000 500 cash', 'a refund after checkout is on the receipt'
);
insert into public.refunds (booking_id, amount_pence, reason, method)
values ((select paid from b), 300, 'manual', 'bank'), ((select paid from b), 200, 'manual', 'cash');
select is(
  public.get_receipt_details((select paid from b)) -> 'given_back',
  '[{"method": "bank", "amount_pence": 300}, {"method": "cash", "amount_pence": 700}]'::jsonb,
  'money given back is listed once per method'
);
select ok(
  (public.get_receipt_details((select paid from b)) ->> 'refunded_at') is not null,
  'with when the card refund was made'
);
select is(
  (public.get_receipt_details((select paid from b)) ->> 'final_pence')::int, 10000,
  'and the total stays the checkout’s'
);

select ok(
  has_function_privilege('authenticated', 'public.resend_checkout_receipt(uuid, text)', 'execute')
    and not has_function_privilege('anon', 'public.resend_checkout_receipt(uuid, text)', 'execute'),
  'only signed-in users can call it'
);

select * from finish();
rollback;
