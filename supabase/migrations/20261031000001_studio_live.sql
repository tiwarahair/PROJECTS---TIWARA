-- Studio stays up to date while it's open, pages through older appointments, and an undone no-show tells the
-- client their fee is off.

-- when an appointment joined Past, so Past can be read newest first, a page at a time
alter table public.bookings
  add column past_at timestamptz generated always as (coalesce(no_show_at, cancelled_at, completed_at, ends_at)) stored;

create index bookings_stylist_past_idx on public.bookings (stylist_id, past_at desc, id desc);

-- the changes Studio listens for (each owner only hears about their own rows, by the same rules as reading them)
alter publication supabase_realtime add table public.bookings, public.booking_fees, public.refunds;

create or replace function public.undo_no_show(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  fee public.booking_fees;
begin
  if booking.status <> 'no_show' or booking.no_show_at <= now() - interval '24 hours'
    or exists (select 1 from public.booking_fees where booking_id = target and status not in ('pending', 'void')) then
    raise exception 'undo_not_allowed';
  end if;

  update public.bookings set status = 'confirmed', no_show_at = null where id = target;

  update public.booking_fees set status = 'void' where booking_id = target and status = 'pending'
  returning * into fee;

  -- the client was told about this fee (and not since told it was waived), so tell them it's off
  if fee.amount_pence > 0 and fee.waived_at is null then
    perform public.queue_email(
      booking.contact ->> 'email',
      'fee_cancelled',
      public.get_booking_details(booking.id) || jsonb_build_object('kind', fee.kind, 'fee_pence', fee.amount_pence),
      booking.client_id
    );
  end if;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'no_show_undone', jsonb_build_object('by', 'stylist'));
end;
$$;
