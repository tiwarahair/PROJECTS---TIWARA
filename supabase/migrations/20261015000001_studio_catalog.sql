-- A stylist's catalogue: add-ons, each service's sizes / lengths / own option groups, and add-on links.
alter table public.services
  add column sizes_on boolean not null default false,
  add column lengths_on boolean not null default false;

create table public.addons (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  service_group_id text references public.service_groups (id),
  category_id uuid references public.stylist_categories (id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 60),
  price_pence integer not null default 0 check (price_pence >= 0),
  minutes integer not null default 0 check (minutes >= 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create unique index addons_unique_name_idx
  on public.addons (stylist_id, service_group_id, lower(name)) nulls not distinct;

create table public.service_variations (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  kind text not null check (kind in ('size', 'length', 'own')),
  -- own groups only, e.g. "Parting"
  group_name text check ((kind = 'own') = (group_name is not null)),
  label text not null check (length(trim(label)) between 1 and 40),
  offered boolean not null default true,
  price_delta_pence integer not null default 0,
  minutes_delta integer not null default 0,
  sort smallint not null
);

create index service_variations_service_id_idx on public.service_variations (service_id);

create table public.service_addons (
  service_id uuid not null references public.services (id) on delete cascade,
  addon_id uuid not null references public.addons (id) on delete cascade,
  price_override_pence integer check (price_override_pence >= 0),
  minutes_override integer check (minutes_override >= 0),
  primary key (service_id, addon_id)
);

create index service_addons_addon_id_idx on public.service_addons (addon_id);

create function public.is_service_owner(target_service_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.services
    join public.stylists on stylists.id = services.stylist_id
    where services.id = target_service_id and stylists.owner_id = auth.uid()
  )
$$;

alter table public.addons enable row level security;
alter table public.service_variations enable row level security;
alter table public.service_addons enable row level security;

create policy "Owners manage their add-ons" on public.addons
  for all to authenticated
  using (public.is_stylist_owner(stylist_id))
  with check (public.is_stylist_owner(stylist_id));

create policy "Owners manage their service variations" on public.service_variations
  for all to authenticated
  using (public.is_service_owner(service_id))
  with check (public.is_service_owner(service_id));

create policy "Owners manage their service add-ons" on public.service_addons
  for all to authenticated
  using (public.is_service_owner(service_id))
  with check (public.is_service_owner(service_id));

-- Phase 1 only let owners read these; Studio now edits them
drop policy "Owners read their categories" on public.stylist_categories;
drop policy "Owners read their services" on public.services;

create policy "Owners manage their categories" on public.stylist_categories
  for all to authenticated
  using (public.is_stylist_owner(stylist_id))
  with check (public.is_stylist_owner(stylist_id));

create policy "Owners manage their services" on public.services
  for all to authenticated
  using (public.is_stylist_owner(stylist_id))
  with check (public.is_stylist_owner(stylist_id));

grant select, insert, update, delete on
  public.addons, public.service_variations, public.service_addons,
  public.stylist_categories, public.services
  to authenticated;
