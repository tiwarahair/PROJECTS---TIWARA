-- A business that still has bookings can't be closed (Partner Terms): Studio warns first, and the server refuses too
create or replace function public.close_business()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.bookings
    join public.stylists on stylists.id = bookings.stylist_id
    where stylists.owner_id = auth.uid()
      and bookings.status in ('awaiting_confirmation', 'confirmed', 'arrived')
      and bookings.unpaid_at is null
      and bookings.starts_at >= date_trunc('day', now() at time zone 'Europe/London') at time zone 'Europe/London'
  ) then
    raise exception 'has_upcoming';
  end if;

  update public.stylists
  set status = 'closed', closed_at = now()
  where owner_id = auth.uid() and status <> 'closed';

  if not found then
    raise exception 'no open business on this account';
  end if;
end;
$$;
