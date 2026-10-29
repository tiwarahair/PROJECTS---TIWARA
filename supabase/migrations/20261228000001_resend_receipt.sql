create function public.resend_checkout_receipt(target uuid, email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  address text := trim(email);
begin
  if booking.status <> 'completed' or booking.checkout is null or public.get_balance_due(booking) > 0 then
    raise exception 'receipt_not_available';
  end if;

  if address is null or length(address) > 254 or address !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;

  if (
    select count(*) from public.booking_events
    where booking_id = target and kind = 'receipt_resent' and created_at > now() - interval '1 day'
  ) >= 3 then
    raise exception 'resend_limit';
  end if;

  perform public.queue_email(
    address, 'checkout_receipt',
    public.get_receipt_details(target) || jsonb_build_object('corrected', false),
    booking.client_id
  );

  insert into public.booking_events (booking_id, kind) values (target, 'receipt_resent');
end;
$$;

revoke execute on function public.resend_checkout_receipt(uuid, text) from public, anon, authenticated;
grant execute on function public.resend_checkout_receipt(uuid, text) to authenticated;
