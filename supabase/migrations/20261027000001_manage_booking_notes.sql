-- the manage page shows the client's notes, not their allergies: a manage link is a bearer link, so health details stay off it
create or replace function public.get_managed_booking(token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', booking.id,
    'ref', booking.ref,
    'status', booking.status,
    'snapshot', booking.snapshot,
    'starts_at', booking.starts_at,
    'ends_at', booking.ends_at,
    'stylist_name', stylists.business_name,
    'stylist_slug', stylists.slug,
    'is_mobile', stylists.business_type = 'mobile',
    'where', public.get_booking_where(booking.id),
    'price_pence', booking.price_pence,
    'fee_pence', booking.fee_pence,
    'paid_pence', booking.due_today_pence,
    'terms', booking.terms,
    'notes', booking.notes,
    'address_notes', nullif(booking.address ->> 'notes', ''),
    'reschedule_count', booking.reschedule_count,
    'calendar_key', booking.calendar_key,
    'is_verified', public.is_manage_verified(token),
    'cancelled_at', booking.cancelled_at,
    'can_cancel', booking.status = 'confirmed' and booking.starts_at > now(),
    'can_reschedule', booking.status = 'confirmed' and booking.reschedule_count < 1
      and now() < (booking.terms ->> 'free_cancel_until')::timestamptz,
    'cancellation', coalesce(booking.cancellation, public.get_cancellation_terms(booking))
  )
  from public.get_booking_by_token(token) as booking
  join public.stylists on stylists.id = booking.stylist_id
$$;

drop function public.update_booking_allergies(text, text, boolean);
