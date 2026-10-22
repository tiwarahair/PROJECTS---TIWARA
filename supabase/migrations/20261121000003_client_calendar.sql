-- A client's calendar subscription: a secret link listing their bookings, made the first time they ask for it.
alter table public.profiles add column calendar_secret text unique;

/** The signed-in client's calendar secret; renewing it stops the old link working. */
create function public.get_calendar_secret(renew boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  update public.profiles set calendar_secret = encode(extensions.gen_random_bytes(24), 'hex')
  where id = auth.uid() and (renew or calendar_secret is null);

  return (select calendar_secret from public.profiles where id = auth.uid());
end;
$$;

/** The feed behind a secret: the client's own bookings from 30 days ago on; null when the secret is unknown. */
create function public.get_client_calendar(secret text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select (
    select coalesce(jsonb_agg(jsonb_build_object(
      'ref', bookings.ref,
      'service_name', bookings.snapshot ->> 'service_name',
      'stylist_name', stylists.business_name,
      'starts_at', bookings.starts_at,
      'ends_at', bookings.ends_at,
      'where', public.get_booking_where(bookings.id),
      'status', bookings.status
    ) order by bookings.starts_at), '[]')
    from public.bookings
    join public.stylists on stylists.id = bookings.stylist_id
    where bookings.client_id = profiles.id
      and bookings.status not in ('held', 'expired')
      and bookings.starts_at >= now() - interval '30 days'
  )
  from public.profiles
  where profiles.calendar_secret = secret
$$;

revoke execute on function public.get_calendar_secret(boolean), public.get_client_calendar(text)
  from public, anon, authenticated;
grant execute on function public.get_calendar_secret(boolean) to authenticated;
