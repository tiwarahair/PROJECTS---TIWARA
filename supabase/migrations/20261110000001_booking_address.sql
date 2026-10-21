-- studio's "Client location" for a mobile stylist; the client is emailed the new address 
create function public.set_booking_address(target uuid, address text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  line text := nullif(trim(coalesce(address, '')), '');
begin
  if booking.status not in ('awaiting_confirmation', 'confirmed', 'arrived') then
    raise exception 'edit_not_allowed';
  end if;

  if not exists (select 1 from public.stylists where id = booking.stylist_id and business_type = 'mobile') then
    raise exception 'not_mobile';
  end if;

  if length(line) > 300 then
    raise exception 'invalid_address';
  end if;

  update public.bookings
  set address = case when line is null then null else jsonb_build_object('line1', line) end
  where id = target;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'address_changed', jsonb_build_object('by', 'stylist', 'from', booking.address, 'to', line));

  if booking.status <> 'awaiting_confirmation' then
    perform public.send_studio_booking_notice(target, 'booking_updated_by_stylist');
  end if;
end;
$$;

revoke execute on function public.set_booking_address(uuid, text) from public, anon, authenticated;
grant execute on function public.set_booking_address(uuid, text) to authenticated;
