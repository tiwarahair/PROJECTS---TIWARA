create or replace function public.get_receipt_details(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_booking_details(bookings.id) || jsonb_build_object(
    'lines', bookings.checkout -> 'lines',
    'final_pence', coalesce(bookings.final_price_pence, bookings.price_pence),
    'tip_pence', bookings.tip_pence,
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', kind, 'method', method, 'amount_pence', amount_pence - platform_fee_pence, 'tip_pence', tip_pence,
        'paid_at', created_at
      ) order by created_at)
      from public.payments where booking_id = bookings.id and kind in ('booking', 'balance')
    ), '[]'),
    'refunded_pence', coalesce((
      select sum(amount_pence) from public.refunds
      where booking_id = bookings.id and reason in ('price_lowered', 'manual') and method = 'card'
    ), 0),
    'given_back_pence', coalesce((
      select sum(amount_pence) from public.refunds
      where booking_id = bookings.id and reason in ('price_lowered', 'manual') and method <> 'card'
    ), 0),
    'given_back_via', (
      select method from public.refunds
      where booking_id = bookings.id and reason in ('price_lowered', 'manual') and method <> 'card'
      order by created_at desc limit 1
    ),
    'given_back', coalesce((
      select jsonb_agg(jsonb_build_object('method', method, 'amount_pence', total) order by first_at, method)
      from (
        select method, sum(amount_pence) as total, min(created_at) as first_at from public.refunds
        where booking_id = bookings.id and reason in ('price_lowered', 'manual') and method <> 'card'
        group by method
      ) as given
    ), '[]'),
    'refunded_at', (
      select max(created_at) from public.refunds
      where booking_id = bookings.id and reason in ('price_lowered', 'manual') and method = 'card'
    )
  )
  from public.bookings
  where bookings.id = target
$$;
