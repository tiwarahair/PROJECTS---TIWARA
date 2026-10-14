-- A stylist's email / SMS choice per event. No row means the default: email on, SMS off.
create table public.notification_preferences (
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  event text not null check (event in (
    'new_booking', 'client_cancelled', 'client_rescheduled', 'payment_paid', 'payment_failed',
    'fee_charged', 'fee_failed', 'auto_cancel_soon', 'auto_cancelled', 'review_received'
  )),
  email boolean not null default true,
  sms boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (stylist_id, event)
);

alter table public.notification_preferences enable row level security;

create policy "Owners manage their notification preferences" on public.notification_preferences
  for all to authenticated
  using (public.is_stylist_owner(stylist_id))
  with check (public.is_stylist_owner(stylist_id));

grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.notification_preferences to service_role;

/** Sent and failed emails are kept for 90 days; pending and sending ones are never touched. */
create function public.purge_old_notifications()
returns integer
language sql
security definer
set search_path = ''
as $$
  with purged as (
    delete from public.notifications
    where status in ('sent', 'failed') and created_at < now() - interval '90 days'
    returning 1
  )
  select count(*)::integer from purged
$$;

revoke execute on function public.purge_old_notifications() from public, anon, authenticated;

select cron.schedule('purge-old-notifications', '45 3 * * *', $$select public.purge_old_notifications()$$);
