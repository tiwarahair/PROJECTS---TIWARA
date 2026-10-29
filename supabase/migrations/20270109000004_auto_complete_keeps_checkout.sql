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
    set status = 'completed', completed_at = now(), unpaid_at = now()
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
