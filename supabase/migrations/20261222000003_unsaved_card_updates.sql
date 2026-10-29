-- a new card the client set up whose save didn't reach us: the hourly check-cards job looks it up in Stripe
create function public.get_unsaved_card_updates(batch_size integer)
returns table (booking_id uuid, setup_intent_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, card_setup_intent_id
  from public.bookings
  where status = 'confirmed' and card_update_requested_at is not null and card_setup_intent_id is not null
    and starts_at > now()
  order by starts_at
  limit batch_size
$$;

revoke execute on function public.get_unsaved_card_updates(integer) from public, anon, authenticated;
grant execute on function public.get_unsaved_card_updates(integer) to service_role;

select cron.schedule(
  'check-cards',
  '20 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/check-cards',
    headers := jsonb_build_object(
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
    and (exists (select 1 from public.claim_card_checks(1)) or exists (select 1 from public.get_unsaved_card_updates(1)))
  $$
);
