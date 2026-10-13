-- Notifications outbox: server code queues a row, the send-notifications Edge Function (every minute) claims it,
-- renders the template and sends it. Failed sends retry with backoff, then stop as 'failed'.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  channel text not null check (channel in ('email', 'sms')),
  to_address text not null,
  template text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  send_after timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index notifications_due on public.notifications (send_after) where status in ('pending', 'sending');
create index notifications_user on public.notifications (user_id);

-- No client policies: only the service role and security definer functions touch the outbox.
alter table public.notifications enable row level security;

revoke all on public.notifications from public, anon, authenticated;
grant select, insert, update, delete on public.notifications to service_role;

/** For other SQL functions and Edge Functions: queues an email for the next sender run. */
create function public.queue_email(to_address text, template text, payload jsonb, user_id uuid default null)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, channel, to_address, template, payload)
  values (queue_email.user_id, 'email', queue_email.to_address, queue_email.template, queue_email.payload)
  returning id
$$;

/**
 * Hands the sender a batch of due rows, each claimed once even with overlapping runs. A claim holds the row for
 * 5 minutes (send_after); if the sender dies before reporting back, the row is claimed again after that.
 */
create function public.claim_notifications(batch_size integer default 20)
returns setof public.notifications
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notifications
  set status = 'failed', last_error = coalesce(last_error, 'sender stopped before finishing')
  where status = 'sending' and send_after <= now() and attempts >= 5;

  return query
  update public.notifications
  set status = 'sending', attempts = attempts + 1, send_after = now() + interval '5 minutes'
  where id in (
    select id from public.notifications
    where status in ('pending', 'sending') and send_after <= now()
    order by send_after
    limit batch_size
    for update skip locked
  )
  returning *;
end;
$$;

create function public.mark_notification_sent(notification_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set status = 'sent', sent_at = now(), last_error = null
  where id = notification_id and status = 'sending'
$$;

/** Retries after 2, 4, 8 then 16 minutes; the fifth failed attempt is final. */
create function public.mark_notification_failed(notification_id uuid, error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set status = case when attempts >= 5 then 'failed' else 'pending' end,
    send_after = now() + interval '1 minute' * power(2, attempts),
    last_error = error
  where id = notification_id and status = 'sending'
$$;

revoke execute on function
  public.queue_email(text, text, jsonb, uuid), public.claim_notifications(integer),
  public.mark_notification_sent(uuid), public.mark_notification_failed(uuid, text)
  from public, anon, authenticated;
grant execute on function
  public.queue_email(text, text, jsonb, uuid), public.claim_notifications(integer),
  public.mark_notification_sent(uuid), public.mark_notification_failed(uuid, text)
  to service_role;

-- every minute while anything is due: the Edge Function sends the outbox (its URL and secret live in Vault)
select cron.schedule(
  'send-notifications',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
    and exists (
      select 1 from public.notifications where status in ('pending', 'sending') and send_after <= now()
    )
  $$
);
