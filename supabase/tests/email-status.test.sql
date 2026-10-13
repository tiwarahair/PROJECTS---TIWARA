begin;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'Client@Email-Status.test', '{}', '{}');

select is(public.get_account_kind(' client@email-status.test '), 'customer', 'an account without a stylist is a customer');
select is(public.get_account_kind('nobody@email-status.test'), 'none', 'an unknown email has no account');

select ok(
  public.hit_rate_limit('test:probe', 2, 3600) and public.hit_rate_limit('test:probe', 2, 3600),
  'hits within the limit pass'
);
select ok(not public.hit_rate_limit('test:probe', 2, 3600), 'the hit over the limit fails');

set local role anon;

select throws_ok($$select public.get_account_kind('client@email-status.test')$$, '42501', null, 'anon cannot look up accounts');
select throws_ok($$select public.hit_rate_limit('test:probe', 2, 3600)$$, '42501', null, 'anon cannot touch rate limits');

select * from finish();
rollback;
