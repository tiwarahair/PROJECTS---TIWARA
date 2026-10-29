-- a card setup the client started and left isn't looked up in Stripe every hour until the appointment: it's checked
-- at most every 6 hours, so it can't crowd out a setup Stripe did confirm
alter table public.bookings add column card_setup_checked_at timestamptz;

create or replace function public.set_card_setup_intent(target uuid, intent text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bookings set card_setup_intent_id = intent, card_setup_checked_at = null where id = target
$$;

create or replace function public.get_unsaved_card_updates(batch_size integer)
returns table (booking_id uuid, setup_intent_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, card_setup_intent_id
  from public.bookings
  where status = 'confirmed' and card_update_requested_at is not null and card_setup_intent_id is not null
    and starts_at > now() and coalesce(card_setup_checked_at, '-infinity') < now() - interval '6 hours'
  order by card_setup_checked_at nulls first, starts_at
  limit batch_size
$$;

create function public.note_card_setup_checked(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bookings set card_setup_checked_at = now() where id = target
$$;

revoke execute on function public.note_card_setup_checked(uuid) from public, anon, authenticated;
grant execute on function public.note_card_setup_checked(uuid) to service_role;
