-- a private calendar link the stylist subscribes to in Apple, Outlook or Google Calendar; resetting it stops the old one
alter table public.stylist_private
  add column calendar_feed_key text not null unique
    default translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');

create function public.reset_calendar_feed(target_stylist uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  feed_key text;
begin
  if not public.is_stylist_owner(target_stylist) then
    raise exception 'not_owner';
  end if;

  update public.stylist_private
  set calendar_feed_key = translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_')
  where stylist_id = target_stylist
  returning calendar_feed_key into feed_key;

  return feed_key;
end;
$$;

-- the last 30 days and the next year; event titles carry the client's first name and the service only
create function public.get_calendar_feed(feed_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'ref', bookings.ref,
    'client', bookings.contact ->> 'first',
    'service', bookings.snapshot ->> 'service_name',
    'starts_at', bookings.starts_at,
    'ends_at', bookings.ends_at,
    'status', bookings.status,
    'studio_url', bookings.site || '/studio'
  ) order by bookings.starts_at), '[]'::jsonb)
  from public.stylist_private
  join public.bookings on bookings.stylist_id = stylist_private.stylist_id
  where stylist_private.calendar_feed_key = feed_key
    and bookings.status not in ('held', 'expired')
    and bookings.starts_at > now() - interval '30 days'
    and bookings.starts_at < now() + interval '365 days'
  having exists (select 1 from public.stylist_private where calendar_feed_key = feed_key)
$$;

revoke execute on function
  public.reset_calendar_feed(uuid),
  public.get_calendar_feed(text)
  from public, anon, authenticated;

grant execute on function public.reset_calendar_feed(uuid) to authenticated;
grant execute on function public.get_calendar_feed(text) to service_role;
