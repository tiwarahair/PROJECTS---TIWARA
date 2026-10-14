-- Stripe Connect (Express) and the go-live rule (Phase 2b).
-- Only the Edge Functions write the Stripe columns; owners can read them but not set them.
alter table public.stylists
  add column stripe_account_id text unique,
  add column charges_enabled boolean not null default false,
  add column payouts_enabled boolean not null default false,
  add column details_submitted boolean not null default false,
  -- none: nothing asked for · due: Stripe needs something · past_due: overdue, so bookings pause
  add column stripe_requirements text not null default 'none'
    check (stripe_requirements in ('none', 'due', 'past_due')),
  -- e.g. "Monzo •••• 4821": the payout bank as Stripe reports it
  add column payout_bank text;

-- each Stripe event is applied once, however often or late it arrives
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
grant select, insert on public.stripe_events to service_role;

/**
 * Live when setup is done and Stripe can take payments and pay out; paused while Stripe has something
 * overdue. Closed, suspended and unlisted businesses are left alone.
 */
create function public.refresh_go_live(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  business public.stylists;
  is_ready boolean;
begin
  select * into business from public.stylists where id = target;

  if business.id is null or business.status not in ('draft', 'live', 'paused') then
    return;
  end if;

  is_ready := business.availability_confirmed_at is not null
    and business.profile_confirmed_at is not null
    and business.charges_enabled
    and business.payouts_enabled
    and exists (select 1 from auth.mfa_factors where user_id = business.owner_id and status = 'verified')
    and exists (select 1 from public.stylist_tax_details where stylist_id = target)
    and exists (select 1 from public.services where stylist_id = target and status = 'active');

  update public.stylists
  set status = case
    when business.stripe_requirements = 'past_due' and business.status <> 'draft' then 'paused'
    when is_ready and business.stripe_requirements <> 'past_due' then 'live'
    else 'draft'
  end
  where id = target;
end;
$$;

create function public.on_go_live_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'mfa_factors' then
    perform public.refresh_go_live(id)
    from public.stylists
    where owner_id = coalesce(new.user_id, old.user_id);
  elsif tg_table_name = 'stylists' then
    perform public.refresh_go_live(new.id);
  else
    perform public.refresh_go_live(coalesce(new.stylist_id, old.stylist_id));
  end if;

  return null;
end;
$$;

create trigger stylists_go_live
  after update of availability_confirmed_at, profile_confirmed_at, charges_enabled, payouts_enabled, stripe_requirements
  on public.stylists
  for each row execute function public.on_go_live_change();

create trigger services_go_live
  after insert or update of status or delete on public.services
  for each row execute function public.on_go_live_change();

create trigger tax_details_go_live
  after insert or delete on public.stylist_tax_details
  for each row execute function public.on_go_live_change();

create trigger mfa_factors_go_live
  after insert or update of status or delete on auth.mfa_factors
  for each row execute function public.on_go_live_change();

revoke execute on function public.refresh_go_live(uuid), public.on_go_live_change() from public, anon, authenticated;
