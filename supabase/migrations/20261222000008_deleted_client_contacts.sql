-- deleting a client also clears their email and phone from their bookings; the name stays for the stylist's records
-- (bookings are kept for tax). The client card is cleared first, so the bookings stay linked to it.
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

  -- payments can still be disputed for 120 days
  if exists (
    select 1 from public.payments join public.bookings on bookings.id = payments.booking_id
    where bookings.stylist_client_id = target and payments.created_at > now() - interval '120 days'
  ) then
    raise exception 'recent_payment';
  end if;

  update public.stylist_clients
  set first = 'Deleted client', last = null, phone = null, email = null, photo_path = null, hair_notes = null,
    blocked_at = null, client_id = null, deleted_at = now()
  where id = target;

  update public.bookings set contact = contact - 'email' - 'phone'
  where stylist_client_id = target and contact is not null;
end;
$$;
