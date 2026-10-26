-- Studio sees a linked client's own account photo where the stylist hasn't taken one of their own.
create policy "Stylists see their linked clients' account photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'account-photos' and exists (
      select 1 from public.stylist_clients
      where client_id::text = (storage.foldername(name))[1] and deleted_at is null
        and public.is_stylist_owner(stylist_id)
    )
  );

-- the client list also carries a linked client's account photo; its columns change, so it's made again
drop function public.get_studio_clients(uuid);

create function public.get_studio_clients(target_stylist uuid)
returns table(id uuid, first text, last text, phone text, email text, photo_path text, hair_notes text, blocked boolean, created_at timestamp with time zone, visits integer, last_visit timestamp with time zone, upcoming integer, no_shows integer, late_cancels integer, paid_pence integer, booking_paid_pence integer, fee_paid_pence integer, refund_pence integer, last_payment_at timestamp with time zone, allergies text, allergies_at timestamp with time zone, allergies_by text,
  account_photo_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select clients.id, clients.first, clients.last, clients.phone, clients.email, clients.photo_path, clients.hair_notes,
    clients.blocked_at is not null, clients.created_at,
    count(*) filter (where bookings.status = 'completed')::integer,
    max(bookings.starts_at) filter (where bookings.status = 'completed'),
    count(*) filter (where bookings.status in ('awaiting_confirmation', 'confirmed', 'arrived'))::integer,
    count(*) filter (where bookings.status = 'no_show')::integer,
    count(*) filter (where bookings.status = 'cancelled' and exists (
      select 1 from public.booking_fees as fee
      where fee.booking_id = bookings.id and fee.kind = 'late_cancel' and fee.status not in ('waived', 'void')
    ))::integer,
    coalesce(sum(money.paid), 0)::integer - coalesce(sum(money.refunded), 0)::integer,
    coalesce(sum(money.booking_paid), 0)::integer,
    coalesce(sum(money.fee_paid), 0)::integer,
    coalesce(sum(money.refunded), 0)::integer,
    max(money.last_payment_at),
    allergy.allergies, allergy.allergies_consented_at, allergy.first, profiles.photo_path
  from public.stylist_clients as clients
  left join public.profiles on profiles.id = clients.client_id
  left join public.bookings on bookings.stylist_client_id = clients.id
  left join lateral (
    select
      (select sum(amount_pence) from public.payments where booking_id = bookings.id) as paid,
      (select sum(amount_pence) from public.payments where booking_id = bookings.id and kind = 'booking') as booking_paid,
      (select sum(amount_pence) from public.payments where booking_id = bookings.id and kind = 'fee') as fee_paid,
      (select sum(amount_pence) from public.refunds where booking_id = bookings.id) as refunded,
      (select max(created_at) from public.payments where booking_id = bookings.id) as last_payment_at
  ) as money on true
  left join lateral (
    select shared.text as allergies, shared.consented_at as allergies_consented_at, profiles.first_name as first
    from public.client_sensitivities as shared
    join public.profiles on profiles.id = shared.client_id
    where shared.client_id = clients.client_id and shared.stylist_id = clients.stylist_id
    union all
    select latest.allergies, latest.allergies_consented_at, latest.contact ->> 'first'
    from public.bookings as latest
    where clients.client_id is null and latest.stylist_client_id = clients.id and latest.allergies is not null
    order by allergies_consented_at desc nulls last
    limit 1
  ) as allergy on true
  where clients.stylist_id = target_stylist and clients.deleted_at is null and public.is_stylist_owner(target_stylist)
  group by clients.id, allergy.allergies, allergy.allergies_consented_at, allergy.first, profiles.photo_path
$$;

revoke execute on function public.get_studio_clients(uuid) from public, anon, authenticated;
grant execute on function public.get_studio_clients(uuid) to authenticated;
