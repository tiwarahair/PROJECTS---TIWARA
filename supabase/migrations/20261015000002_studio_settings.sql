-- Availability, booking rules, payment policy history and the editable profile / business fields.
alter table public.stylists
  add column instagram text,
  add column tiktok text,
  add column youtube text,
  add column website text,
  add column vat_registered boolean not null default false,
  add column vat_number text check (vat_number is null or vat_number ~ '^(\d{9}|\d{12})$'),
  add column cover_path text,
  add column avatar_path text,
  add column pause_on boolean not null default false,
  add column pause_until date,
  add column availability_confirmed_at timestamptz,
  add column profile_confirmed_at timestamptz;

-- weekday: 0 = Monday … 6 = Sunday; times are Europe/London wall-clock
create table public.working_hours (
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  is_open boolean not null default false,
  start_time time not null,
  end_time time not null,
  primary key (stylist_id, weekday),
  check (end_time > start_time)
);

create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  starts_on date not null,
  all_day boolean not null default false,
  start_time time,
  end_time time,
  repeat text not null default 'none' check (repeat in ('none', 'daily', 'weekly', 'monthly')),
  repeat_until date,
  reason text not null default '' check (length(reason) <= 80),
  colour text not null default 'purple' check (colour ~ '^[a-z]{3,12}$'),
  check (all_day or (start_time is not null and end_time is not null and end_time > start_time)),
  check (repeat_until is null or repeat_until >= starts_on)
);

create index time_blocks_stylist_id_idx on public.time_blocks (stylist_id);

create table public.closed_periods (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  reason text not null default '' check (length(reason) <= 80),
  check (ends_on >= starts_on)
);

create index closed_periods_stylist_id_idx on public.closed_periods (stylist_id);

create table public.booking_rules (
  stylist_id uuid primary key references public.stylists (id) on delete cascade,
  min_notice_hours smallint not null default 24 check (min_notice_hours between 0 and 168),
  max_notice_months smallint not null default 3 check (max_notice_months between 1 and 12),
  default_extra_minutes smallint not null default 0 check (default_extra_minutes between 0 and 30),
  travel_buffer_minutes smallint not null default 0 check (travel_buffer_minutes between 0 and 120)
);

-- Insert-only history: every save is a new row and the latest is current (bookings keep the row they agreed to)
create table public.payment_policies (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  mode text not null check (mode in ('none', 'deposit', 'full', 'card')),
  deposit_percent smallint not null default 0,
  refundable boolean not null default true,
  free_window_hours numeric(4, 1) not null default 48 check (free_window_hours in (0.5, 1, 2, 12, 24, 48, 72)),
  grace_minutes smallint not null default 0 check (grace_minutes in (0, 15, 20, 25, 30, 45, 60)),
  late_on boolean not null default false,
  late_kind text not null default 'keep' check (late_kind in ('keep', 'pct')),
  late_percent smallint not null default 50 check (late_percent between 1 and 100),
  no_show_on boolean not null default false,
  no_show_kind text not null default 'keep' check (no_show_kind in ('keep', 'pct')),
  no_show_percent smallint not null default 50 check (no_show_percent between 1 and 100),
  extras jsonb not null default '[]' check (jsonb_typeof(extras) = 'array' and length(extras::text) <= 600),
  created_at timestamptz not null default now(),
  -- deposits: 1–50% when refundable, 1–25% when not
  check (mode <> 'deposit' or deposit_percent between 1 and case when refundable then 50 else 25 end)
);

create index payment_policies_current_idx on public.payment_policies (stylist_id, created_at desc);

alter table public.working_hours enable row level security;
alter table public.time_blocks enable row level security;
alter table public.closed_periods enable row level security;
alter table public.booking_rules enable row level security;
alter table public.payment_policies enable row level security;

create policy "Owners manage their hours" on public.working_hours
  for all to authenticated
  using (public.is_stylist_owner(stylist_id))
  with check (public.is_stylist_owner(stylist_id));
create policy "Owners manage their blocked time" on public.time_blocks
  for all to authenticated
  using (public.is_stylist_owner(stylist_id))
  with check (public.is_stylist_owner(stylist_id));
create policy "Owners manage their closed periods" on public.closed_periods
  for all to authenticated
  using (public.is_stylist_owner(stylist_id))
  with check (public.is_stylist_owner(stylist_id));
create policy "Owners manage their booking rules" on public.booking_rules
  for all to authenticated
  using (public.is_stylist_owner(stylist_id))
  with check (public.is_stylist_owner(stylist_id));
create policy "Owners read their payment policies" on public.payment_policies
  for select to authenticated using (public.is_stylist_owner(stylist_id));
create policy "Owners add payment policies" on public.payment_policies
  for insert to authenticated with check (public.is_stylist_owner(stylist_id));
create policy "Owners update their stylist" on public.stylists
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners update their private address" on public.stylist_private
  for update to authenticated
  using (public.is_stylist_owner(stylist_id))
  with check (public.is_stylist_owner(stylist_id));

grant select, insert, update, delete on
  public.working_hours, public.time_blocks, public.closed_periods, public.booking_rules
  to authenticated;
grant select, insert on public.payment_policies to authenticated;
-- status, slug, owner and Stripe fields stay server-side
grant update (
  business_name, business_type, bio, location, area_label, travel_radius_miles,
  contact_email, contact_phone, instagram, tiktok, youtube, website,
  vat_registered, vat_number, cover_path, avatar_path, pause_on, pause_until,
  availability_confirmed_at, profile_confirmed_at
) on public.stylists to authenticated;
grant update (line1, line2, city, postcode) on public.stylist_private to authenticated;
