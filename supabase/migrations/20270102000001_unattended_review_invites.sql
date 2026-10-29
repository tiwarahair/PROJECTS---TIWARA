create function public.is_unattended(booking public.bookings)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select booking.status = 'completed' and booking.checkout is null and exists (
    select 1 from public.booking_events
    where booking_id = booking.id and kind = 'auto_completed' and data ->> 'from' = 'confirmed'
  )
$$;

create function public.can_skip_review_invite(booking public.bookings)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_stylist_owner(booking.stylist_id)
    and public.is_unattended(booking)
    and not exists (select 1 from public.review_invites where booking_id = booking.id)
    and not exists (select 1 from public.booking_events where booking_id = booking.id and kind = 'not_attended')
$$;

create function public.skip_review_invite(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
begin
  if not public.can_skip_review_invite(booking) then
    raise exception 'skip_not_allowed';
  end if;

  insert into public.booking_events (booking_id, kind) values (target, 'not_attended');
end;
$$;

create or replace function public.send_review_invites()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  invited uuid;
  sent integer := 0;
begin
  for invited in
    insert into public.review_invites (booking_id)
    select bookings.id from public.bookings
    where bookings.status = 'completed'
      and bookings.completed_at <= now() - case when public.is_unattended(bookings) then interval '24 hours'
        else interval '2 hours' end
      and bookings.completed_at > now() - interval '7 days'
      and nullif(trim(bookings.contact ->> 'email'), '') is not null
      and not exists (select 1 from public.review_invites where booking_id = bookings.id)
      and not exists (select 1 from public.reviews where booking_id = bookings.id)
      and not exists (
        select 1 from public.booking_events where booking_id = bookings.id and kind = 'not_attended'
      )
    on conflict do nothing
    returning booking_id
  loop
    perform public.queue_review_invite(invited, 'review_invite');
    sent := sent + 1;
  end loop;

  for invited in
    update public.review_invites set reminded_at = now()
    from public.bookings
    where bookings.id = review_invites.booking_id
      and review_invites.reminded_at is null
      and review_invites.sent_at <= now() - interval '3 days'
      and bookings.status = 'completed'
      and bookings.completed_at > now() - interval '29 days'
      and nullif(trim(bookings.contact ->> 'email'), '') is not null
      and not exists (select 1 from public.reviews where booking_id = bookings.id)
    returning review_invites.booking_id
  loop
    perform public.queue_review_invite(invited, 'review_reminder');
    sent := sent + 1;
  end loop;

  return sent;
end;
$$;

revoke execute on function
  public.is_unattended(public.bookings),
  public.can_skip_review_invite(public.bookings),
  public.skip_review_invite(uuid)
  from public, anon, authenticated;

grant execute on function
  public.can_skip_review_invite(public.bookings),
  public.skip_review_invite(uuid)
  to authenticated;
