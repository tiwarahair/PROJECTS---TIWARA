-- an event is claimed before it's handled, so two deliveries at once can't both apply it; a claim a crashed run left
-- is taken again after 10 minutes
alter table public.stripe_events add column handled_at timestamptz default now();

create function public.claim_stripe_event(event_id text, event_type text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  insert into public.stripe_events (id, type, handled_at)
  values (event_id, event_type, null)
  on conflict (id) do update set received_at = now()
  where stripe_events.handled_at is null and stripe_events.received_at < now() - interval '10 minutes'
  returning true
$$;

create function public.finish_stripe_event(event_id text, is_handled boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.stripe_events set handled_at = now() where id = event_id and is_handled;
  delete from public.stripe_events where id = event_id and not is_handled and handled_at is null;
$$;

revoke execute on function
  public.claim_stripe_event(text, text),
  public.finish_stripe_event(text, boolean)
  from public, anon, authenticated;

grant execute on function
  public.claim_stripe_event(text, text),
  public.finish_stripe_event(text, boolean)
  to service_role;
