create or replace function public.claim_fee_retry(target_booking uuid, owner uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  fee public.booking_fees;
begin
  select booking_fees.* into fee
  from public.booking_fees
  join public.bookings on bookings.id = booking_fees.booking_id
  join public.stylists on stylists.id = bookings.stylist_id
  where booking_fees.booking_id = target_booking and booking_fees.status <> 'void' and stylists.owner_id = owner
  order by booking_fees.created_at desc
  limit 1
  for update of booking_fees;

  if fee.id is null then
    raise exception 'not_found';
  end if;

  if fee.status <> 'unpaid' then
    raise exception 'retry_not_allowed';
  end if;

  if fee.hard_decline then
    raise exception 'hard_decline';
  end if;

  if fee.tries >= 3 then
    raise exception 'no_retries_left';
  end if;

  if fee.last_tried_at > now() - interval '24 hours' then
    raise exception 'too_soon';
  end if;

  update public.booking_fees set status = 'charging', claimed_at = now(), tries = tries + 1
  where id = fee.id
  returning * into fee;

  return public.get_fee_settlement(fee);
end;
$$;
