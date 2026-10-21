-- a client cancelling within the free window also gets the booking fee back (Client Terms 4, Partner Terms 12)
create or replace function public.get_cancellation_terms(booking public.bookings)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  is_late boolean := now() >= (booking.terms ->> 'free_cancel_until')::timestamptz;
  split jsonb := public.get_fee_split(
    booking, case when is_late then public.get_fee_amount(booking, 'late_cancel') else 0 end
  );
  fee_refund integer := case
    when not is_late and booking.paid_at is not null and booking.stripe_payment_intent_id is not null
      then coalesce(booking.fee_pence, 0)
    else 0
  end;
begin
  return split || jsonb_build_object(
    'refund_pence', (split ->> 'refund_pence')::integer + fee_refund,
    'fee_refund_pence', fee_refund,
    'is_late', is_late,
    'free_cancel_until', booking.terms ->> 'free_cancel_until'
  );
end;
$$;
