-- a refund on money sent to the stylist later can need more back than is left of that transfer: the rest is owed,
-- taken from their next card payments like Stripe's dispute fees
alter table public.stylist_debts
  alter column dispute_id drop not null,
  add column stripe_refund_id text unique,
  add column booking_id uuid references public.bookings (id) on delete set null,
  add constraint stylist_debts_source_check check (num_nonnulls(dispute_id, stripe_refund_id) = 1);

create function public.save_refund_debt(refund text, booking uuid, amount integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.stylist_debts (stylist_id, booking_id, stripe_refund_id, amount_pence)
  select bookings.stylist_id, bookings.id, refund, amount
  from public.bookings
  where bookings.id = booking and amount > 0
  on conflict (stripe_refund_id) do nothing
$$;

revoke execute on function public.save_refund_debt(text, uuid, integer) from public, anon, authenticated;
grant execute on function public.save_refund_debt(text, uuid, integer) to service_role;
