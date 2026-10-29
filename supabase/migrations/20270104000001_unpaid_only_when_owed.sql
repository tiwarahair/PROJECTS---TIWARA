create or replace function public.complete_past_bookings()
returns integer
language sql
security definer
set search_path = ''
as $$
  with due as (
    select id, status from public.bookings
    where (status = 'arrived' and ends_at + interval '1 hour' <= now())
      or (status = 'confirmed' and starts_at + interval '24 hours' <= now())
    for update skip locked
  ),
  done as (
    update public.bookings
    set status = 'completed', completed_at = now(),
      unpaid_at = case when public.get_balance_due(bookings) > 0 then now() end
    from due
    where bookings.id = due.id
    returning bookings.id, due.status
  ),
  logged as (
    insert into public.booking_events (booking_id, kind, data)
    select id, 'auto_completed', jsonb_build_object('from', status) from done
  )
  select count(*)::integer from done
$$;

create or replace function public.get_deletion_blockers(client uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'bookings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ref', bookings.ref, 'stylist_name', stylists.business_name, 'starts_at', bookings.starts_at
      ) order by bookings.starts_at)
      from public.bookings
      join public.stylists on stylists.id = bookings.stylist_id
      where bookings.id in (select public.client_booking_ids(client))
        and bookings.status in ('awaiting_confirmation', 'confirmed', 'arrived')
    ), '[]'),
    'owes_money', exists (
      select 1 from public.bookings
      where bookings.id in (select public.client_booking_ids(client))
        and ((bookings.unpaid_at is not null and public.get_balance_due(bookings) > 0) or exists (
          select 1 from public.booking_fees
          where booking_fees.booking_id = bookings.id and booking_fees.status in ('pending', 'charging', 'unpaid')
        ))
    ),
    'has_business', exists (select 1 from public.stylists where owner_id = client)
  )
$$;

create or replace function public.resend_checkout_receipt(target uuid, email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  address text := trim(email);
begin
  if booking.status <> 'completed' or public.get_balance_due(booking) > 0 then
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
