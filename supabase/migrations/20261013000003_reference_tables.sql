-- Platform taxonomy. Read-only to clients; rows are deactivated, never deleted.
create table public.service_groups (
  id text primary key,
  name text not null,
  icon text not null,
  description text not null,
  image text not null,
  sort smallint not null
);

create table public.service_types (
  id text primary key,
  group_id text not null references public.service_groups (id),
  name text not null,
  synonyms text[] not null default '{}',
  is_other boolean not null default false,
  active boolean not null default true,
  default_minutes integer check (default_minutes > 0),
  -- Typical amount above a stylist's "from" price for the group.
  added_price_pence integer check (added_price_pence >= 0),
  default_description text
);

create index service_types_group_id_idx on public.service_types (group_id);

create table public.customisation_options (
  id bigint generated always as identity primary key,
  group_id text not null references public.service_groups (id),
  kind text not null check (kind in ('size', 'length')),
  label text not null,
  price_delta_pence integer not null,
  minutes_delta integer not null,
  sort smallint not null,
  unique (group_id, kind, label)
);

create table public.default_addons (
  id bigint generated always as identity primary key,
  group_id text not null references public.service_groups (id),
  name text not null,
  price_pence integer not null check (price_pence >= 0),
  minutes integer not null check (minutes >= 0),
  sort smallint not null,
  unique (group_id, name)
);

alter table public.service_groups enable row level security;
alter table public.service_types enable row level security;
alter table public.customisation_options enable row level security;
alter table public.default_addons enable row level security;

create policy "Anyone can read service groups" on public.service_groups
  for select to anon, authenticated using (true);
create policy "Anyone can read service types" on public.service_types
  for select to anon, authenticated using (true);
create policy "Anyone can read customisation options" on public.customisation_options
  for select to anon, authenticated using (true);
create policy "Anyone can read default add-ons" on public.default_addons
  for select to anon, authenticated using (true);
