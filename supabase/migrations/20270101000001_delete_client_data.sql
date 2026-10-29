-- a stylist deleting a client removes the client's data from their bookings too, as deleting their own account does:
-- the service, times, status and money stay. A booking paid in the last 120 days keeps the name and email (a payment
-- can still be disputed or refunded) until the nightly purge_deleted_client_contacts clears them, so deleting no
-- longer waits for those 120 days. Still refused while they have a booking to come, an unpaid fee or a visit due for
-- checkout
create or replace function public.delete_stylist_client(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  client public.stylist_clients;
begin
  select * into client from public.stylist_clients
  where id = target and deleted_at is null and public.is_stylist_owner(stylist_id)
  for update;

  if client.id is null then
    raise exception 'not_found';
  end if;

  if exists (
    select 1 from public.bookings
    where stylist_client_id = target and status in ('awaiting_confirmation', 'confirmed', 'arrived')
  ) then
    raise exception 'has_upcoming';
  end if;

  if exists (
    select 1 from public.booking_fees join public.bookings on bookings.id = booking_fees.booking_id
    where bookings.stylist_client_id = target and booking_fees.status in ('pending', 'charging', 'unpaid')
  ) then
    raise exception 'unpaid_fee';
  end if;

  -- a visit still due for checkout needs their email for its payment link, reminder and receipt
  if exists (
    select 1 from public.bookings where stylist_client_id = target and status = 'completed' and unpaid_at is not null
  ) then
    raise exception 'unpaid_balance';
  end if;

  update public.stylist_clients
  set first = 'Deleted client', last = null, phone = null, email = null, photo_path = null, hair_notes = null,
    blocked_at = null, client_id = null, deleted_at = now()
  where id = target;

  delete from public.booking_tokens
  where booking_id in (select id from public.bookings where stylist_client_id = target);

  delete from public.booking_codes
  where booking_id in (select id from public.bookings where stylist_client_id = target);

  delete from public.booking_notes
  where booking_id in (select id from public.bookings where stylist_client_id = target);

  update public.booking_events
  set data = data - 'from' - 'to'
  where kind = 'address_changed' and booking_id in (select id from public.bookings where stylist_client_id = target);

  -- marked like a deleted account's bookings, so the nightly purge clears what's kept and they stay with this card
  update public.bookings
  set contact = case
      when public.has_recent_payment(id) then jsonb_build_object(
        'first', contact ->> 'first', 'last', contact ->> 'last', 'email', contact ->> 'email', 'account_deleted', true
      )
      else jsonb_build_object('account_deleted', true)
    end,
    notes = null,
    allergies = null,
    allergies_consented_at = null,
    address = null,
    location = null
  where stylist_client_id = target;

  if client.client_id is not null then
    delete from public.client_sensitivities where client_id = client.client_id and stylist_id = client.stylist_id;
  end if;
end;
$$;
