begin;
select plan(25);

-- Grants: clients never touch the outbox or its functions.
select ok(
  (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'notifications'),
  'RLS is enabled on notifications'
);

select ok(
  not has_table_privilege('anon', 'public.notifications', 'select')
    and not has_table_privilege('authenticated', 'public.notifications', 'select')
    and not has_table_privilege('authenticated', 'public.notifications', 'insert'),
  'clients have no table grants on notifications'
);

select ok(
  has_table_privilege('service_role', 'public.notifications', 'select, insert, update'),
  'the service role can use notifications'
);

select ok(
  not has_function_privilege('anon', 'public.queue_email(text, text, jsonb, uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.queue_email(text, text, jsonb, uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.claim_notifications(integer)', 'execute')
    and not has_function_privilege('authenticated', 'public.mark_notification_sent(uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.mark_notification_failed(uuid, text)', 'execute'),
  'clients cannot run the outbox functions'
);

select ok(
  has_function_privilege('service_role', 'public.queue_email(text, text, jsonb, uuid)', 'execute')
    and has_function_privilege('service_role', 'public.claim_notifications(integer)', 'execute'),
  'the service role can queue and claim'
);

select isnt_empty(
  $$select 1 from cron.job where jobname = 'send-notifications' and schedule = '* * * * *'$$,
  'the sender runs every minute'
);

-- queue_email
select lives_ok(
  $$select set_config('test.first', public.queue_email('one@outbox.test', 'tax_details_updated',
    '{"changed_at": "2026-10-16T10:00:00Z"}')::text, true)$$,
  'queue_email queues an email'
);

select results_eq(
  $$select channel, to_address, template, status, attempts, user_id from public.notifications
    where id = current_setting('test.first')::uuid$$,
  $$values ('email', 'one@outbox.test', 'tax_details_updated', 'pending', 0, null::uuid)$$,
  'a queued email is pending with no attempts'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select throws_ok($$select * from public.notifications$$, '42501', null, 'users cannot read notifications');

select throws_ok(
  $$insert into public.notifications (channel, to_address, template) values ('email', 'x@outbox.test', 'x')$$,
  '42501',
  null,
  'users cannot insert notifications'
);

select throws_ok(
  $$select public.queue_email('x@outbox.test', 'tax_details_updated', '{}')$$,
  '42501',
  null,
  'users cannot call queue_email'
);

set local role anon;

select throws_ok($$select * from public.notifications$$, '42501', null, 'anon cannot read notifications');

reset role;

-- Claiming
select public.queue_email('later@outbox.test', 'tax_details_updated', '{}');
update public.notifications set send_after = now() + interval '1 hour' where to_address = 'later@outbox.test';

select results_eq(
  $$select to_address, status, attempts from public.claim_notifications()$$,
  $$values ('one@outbox.test', 'sending', 1)$$,
  'claim takes due rows only, marks them sending and counts the attempt'
);

select is_empty($$select * from public.claim_notifications()$$, 'a claimed row is not claimed again');

select ok(
  (select send_after > now() + interval '4 minutes' from public.notifications where to_address = 'one@outbox.test'),
  'a claim holds the row for 5 minutes'
);

-- Sent
select public.mark_notification_sent(current_setting('test.first')::uuid);

select results_eq(
  $$select status, sent_at is not null from public.notifications where id = current_setting('test.first')::uuid$$,
  $$values ('sent', true)$$,
  'mark_notification_sent records the send'
);

-- Failed: retries with backoff, then stops
select set_config('test.retry', public.queue_email('retry@outbox.test', 'tax_details_updated', '{}')::text, true);
select public.claim_notifications();
select public.mark_notification_failed(current_setting('test.retry')::uuid, 'resend said no');

select results_eq(
  $$select status, attempts, last_error from public.notifications where id = current_setting('test.retry')::uuid$$,
  $$values ('pending', 1, 'resend said no')$$,
  'a failed attempt goes back to pending with the error'
);

select ok(
  (select send_after between now() + interval '119 seconds' and now() + interval '121 seconds'
    from public.notifications where id = current_setting('test.retry')::uuid),
  'the first retry waits 2 minutes'
);

select is_empty($$select * from public.claim_notifications()$$, 'a row waiting to retry is not claimed');

-- three more failed attempts
update public.notifications set send_after = now() where id = current_setting('test.retry')::uuid;
select public.claim_notifications();
select public.mark_notification_failed(current_setting('test.retry')::uuid, 'again');
update public.notifications set send_after = now() where id = current_setting('test.retry')::uuid;
select public.claim_notifications();
select public.mark_notification_failed(current_setting('test.retry')::uuid, 'again');
update public.notifications set send_after = now() where id = current_setting('test.retry')::uuid;
select public.claim_notifications();
select public.mark_notification_failed(current_setting('test.retry')::uuid, 'again');

select ok(
  (select send_after between now() + interval '959 seconds' and now() + interval '961 seconds'
    from public.notifications where id = current_setting('test.retry')::uuid),
  'the fourth retry waits 16 minutes'
);

update public.notifications set send_after = now() where id = current_setting('test.retry')::uuid;
select public.claim_notifications();
select public.mark_notification_failed(current_setting('test.retry')::uuid, 'last try');

select results_eq(
  $$select status, attempts, last_error from public.notifications where id = current_setting('test.retry')::uuid$$,
  $$values ('failed', 5, 'last try')$$,
  'the fifth failed attempt is final'
);

update public.notifications set send_after = now() where id = current_setting('test.retry')::uuid;
select is_empty($$select * from public.claim_notifications()$$, 'a failed row is never claimed');

-- A sender that dies mid-send: the row is claimed again once the hold ends, and fails after the last attempt.
select set_config('test.stuck', public.queue_email('stuck@outbox.test', 'tax_details_updated', '{}')::text, true);
select public.claim_notifications();
update public.notifications set send_after = now() where id = current_setting('test.stuck')::uuid;

select results_eq(
  $$select to_address, attempts from public.claim_notifications()$$,
  $$values ('stuck@outbox.test', 2)$$,
  'an abandoned claim is claimed again after its hold'
);

update public.notifications set attempts = 5, send_after = now() where id = current_setting('test.stuck')::uuid;

select is_empty($$select * from public.claim_notifications()$$, 'an abandoned last attempt is not claimed again');

select results_eq(
  $$select status, last_error from public.notifications where id = current_setting('test.stuck')::uuid$$,
  $$values ('failed', 'sender stopped before finishing')$$,
  'an abandoned last attempt is marked failed'
);

select * from finish();
rollback;
