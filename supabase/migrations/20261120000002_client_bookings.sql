-- Account → Bookings and Overview: the signed-in client's bookings with what they paid and got back. Clients can't
-- read payments or refunds themselves (owner-only policies), so this returns just their own.
create function public.get_client_bookings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', bookings.id,
    'ref', bookings.ref,
    'status', bookings.status,
    'snapshot', bookings.snapshot,
    'starts_at', bookings.starts_at,
    'ends_at', bookings.ends_at,
    'stylist_slug', stylists.slug,
    'stylist_name', stylists.business_name,
    'stylist_area', stylists.area_label,
    'cover_path', stylists.cover_path,
    'is_mobile', stylists.business_type = 'mobile',
    'where', public.get_booking_where(bookings.id),
    'price_pence', coalesce(bookings.final_price_pence, bookings.price_pence),
    'fee_pence', bookings.fee_pence,
    'tip_pence', coalesce(bookings.tip_pence, 0),
    'mode', bookings.terms ->> 'mode',
    'card_label', bookings.card_label,
    'payment_method_id', bookings.stripe_payment_method_id,
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', kind, 'method', method, 'amount_pence', amount_pence, 'paid_at', created_at
      ) order by created_at)
      from public.payments where booking_id = bookings.id
    ), '[]'),
    'refunds', coalesce((
      select jsonb_agg(jsonb_build_object('amount_pence', amount_pence, 'refunded_at', created_at) order by created_at)
      from public.refunds where booking_id = bookings.id
    ), '[]')
  ) order by bookings.starts_at desc), '[]')
  from public.bookings
  join public.stylists on stylists.id = bookings.stylist_id
  where bookings.client_id = (select auth.uid()) and bookings.status not in ('held', 'expired')
$$;

revoke execute on function public.get_client_bookings() from public, anon, authenticated;
grant execute on function public.get_client_bookings() to authenticated;
