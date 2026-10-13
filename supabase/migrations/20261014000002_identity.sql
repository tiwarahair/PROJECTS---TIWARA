-- Accounts and stylist businesses. Every account can book; a stylist is an account that owns a stylists row.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  marketing_opt_in boolean not null default false,
  client_terms_version text,
  client_terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.stylists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  slug extensions.citext not null unique,
  business_name text not null check (length(trim(business_name)) > 0),
  business_type text not null check (business_type in ('shop', 'chair_rental', 'home_based', 'mobile')),
  bio text,
  location extensions.geography(point, 4326) not null,
  area_label text,
  travel_radius_miles smallint check (travel_radius_miles in (2, 5, 10, 15, 25)),
  contact_email extensions.citext,
  contact_phone text,
  status text not null default 'draft'
    check (status in ('draft', 'live', 'paused', 'unlisted', 'suspended', 'closed')),
  partner_terms_version text not null,
  partner_terms_accepted_at timestamptz not null default now(),
  referral_source text,
  created_at timestamptz not null default now(),
  check ((business_type = 'mobile') = (travel_radius_miles is not null)),
  check (contact_email is not null or contact_phone is not null)
);

-- Full address: owner only (clients with a confirmed booking get it via a function, Phase 4).
create table public.stylist_private (
  stylist_id uuid primary key references public.stylists (id) on delete cascade,
  line1 text,
  line2 text,
  city text,
  postcode text not null
);

create table public.stylist_categories (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  service_group_id text references public.service_groups (id),
  name text not null,
  sort smallint not null,
  -- null = the UI picks from its palette by sort
  colour text
);

create index stylist_categories_stylist_id_idx on public.stylist_categories (stylist_id);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  service_type_id text not null references public.service_types (id),
  service_group_id text not null references public.service_groups (id),
  category_id uuid references public.stylist_categories (id) on delete set null,
  name text not null,
  description text,
  price_pence integer check (price_pence >= 0),
  duration_min integer check (duration_min > 0),
  -- null = use the stylist's default extra time
  extra_time_min integer check (extra_time_min >= 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  sort smallint not null,
  check (status = 'draft' or (price_pence is not null and duration_min is not null))
);

create index services_stylist_id_idx on public.services (stylist_id);

-- Fixed-window counters for custom functions (service role only).
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (key, window_start)
);

create function public.is_stylist_owner(target_stylist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stylists where id = target_stylist_id and owner_id = auth.uid()
  )
$$;

alter table public.profiles enable row level security;
alter table public.stylists enable row level security;
alter table public.stylist_private enable row level security;
alter table public.stylist_categories enable row level security;
alter table public.services enable row level security;
alter table public.rate_limits enable row level security;

create policy "Users read their own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "Users update their own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Owners read their stylist" on public.stylists
  for select to authenticated using (owner_id = auth.uid());
create policy "Owners read their private address" on public.stylist_private
  for select to authenticated using (public.is_stylist_owner(stylist_id));
create policy "Owners read their categories" on public.stylist_categories
  for select to authenticated using (public.is_stylist_owner(stylist_id));
create policy "Owners read their services" on public.services
  for select to authenticated using (public.is_stylist_owner(stylist_id));

grant select on public.profiles, public.stylists, public.stylist_private,
  public.stylist_categories, public.services to authenticated;
grant update (first_name, last_name, phone, marketing_opt_in, client_terms_version)
  on public.profiles to authenticated;

-- Acceptance time is always the server's clock.
create function public.stamp_client_terms()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.client_terms_version is distinct from old.client_terms_version then
    new.client_terms_accepted_at := now();
  end if;

  return new;
end;
$$;

create trigger profiles_stamp_client_terms
  before update on public.profiles
  for each row execute function public.stamp_client_terms();

create function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(value), '[^a-z0-9]+', '-', 'g'))
$$;

/*
 * Sign-up: supabase.auth.signUp() passes these in options.data (raw_user_meta_data).
 *   account_type: 'client' | 'stylist' (absent for Google sign-ups, which finish on cust-social)
 *   first_name, last_name, phone, marketing, terms_version
 *   stylist: business_name, business_type, line1, line2, city, postcode, lat, lng, area_label,
 *            travel_radius_miles, categories[], contact_email, contact_phone, referral_source
 * Marks stylists in app_metadata before the row is written, so the first token already says so.
 */
create function public.flag_new_stylist()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'account_type' = 'stylist' then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}') || '{"is_stylist": true}';
  end if;

  return new;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}');
  account_type text := meta ->> 'account_type';
  shop jsonb := meta -> 'stylist';
  phone text := nullif(trim(meta ->> 'phone'), '');
  new_stylist_id uuid;
  base_slug text;
  primary_group text;
  primary_category uuid;
begin
  if account_type is not null and account_type not in ('client', 'stylist') then
    raise exception 'invalid account_type';
  end if;

  if account_type is not null then
    if coalesce(trim(meta ->> 'first_name'), '') = '' or coalesce(trim(meta ->> 'last_name'), '') = '' then
      raise exception 'first and last name are required';
    end if;

    if phone is null or regexp_replace(phone, '\D', '', 'g') !~ '^(44|0)?7\d{9}$' then
      raise exception 'a valid UK mobile is required';
    end if;

    if coalesce(meta ->> 'terms_version', '') = '' then
      raise exception 'terms must be accepted';
    end if;
  end if;

  insert into public.profiles (id, first_name, last_name, phone, marketing_opt_in, client_terms_version, client_terms_accepted_at)
  values (
    new.id,
    nullif(trim(meta ->> 'first_name'), ''),
    nullif(trim(meta ->> 'last_name'), ''),
    phone,
    coalesce((meta ->> 'marketing')::boolean, false),
    case when account_type = 'client' then meta ->> 'terms_version' end,
    case when account_type = 'client' then now() end
  );

  if account_type is distinct from 'stylist' then
    return new;
  end if;

  if shop is null or jsonb_typeof(shop -> 'categories') <> 'array' or jsonb_array_length(shop -> 'categories') = 0 then
    raise exception 'stylist details and at least one category are required';
  end if;

  if upper(coalesce(shop ->> 'postcode', '')) !~ '^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$' then
    raise exception 'a valid UK postcode is required';
  end if;

  base_slug := coalesce(nullif(public.slugify(shop ->> 'business_name'), ''), 'stylist');

  insert into public.stylists (
    owner_id, slug, business_name, business_type, location, area_label, travel_radius_miles,
    contact_email, contact_phone, partner_terms_version, referral_source
  )
  values (
    new.id,
    case
      when exists (select 1 from public.stylists where slug = base_slug)
        then base_slug || '-' || substr(md5(random()::text), 1, 4)
      else base_slug
    end,
    trim(shop ->> 'business_name'),
    shop ->> 'business_type',
    extensions.st_setsrid(
      extensions.st_makepoint((shop ->> 'lng')::float8, (shop ->> 'lat')::float8), 4326
    )::extensions.geography,
    nullif(trim(shop ->> 'area_label'), ''),
    (shop ->> 'travel_radius_miles')::smallint,
    nullif(trim(shop ->> 'contact_email'), ''),
    nullif(trim(shop ->> 'contact_phone'), ''),
    meta ->> 'terms_version',
    nullif(trim(shop ->> 'referral_source'), '')
  )
  returning id into new_stylist_id;

  insert into public.stylist_private (stylist_id, line1, line2, city, postcode)
  values (
    new_stylist_id,
    nullif(trim(shop ->> 'line1'), ''),
    nullif(trim(shop ->> 'line2'), ''),
    nullif(trim(shop ->> 'city'), ''),
    upper(trim(shop ->> 'postcode'))
  );

  -- one category per picked service group, in the order picked (unknown groups fail the foreign key)
  insert into public.stylist_categories (stylist_id, service_group_id, name, sort)
  select new_stylist_id, picked.group_id, coalesce(service_groups.name, picked.group_id), picked.position - 1
  from jsonb_array_elements_text(shop -> 'categories') with ordinality as picked (group_id, position)
  left join public.service_groups on service_groups.id = picked.group_id;

  primary_group := shop -> 'categories' ->> 0;

  select id into primary_category
  from public.stylist_categories
  where stylist_id = new_stylist_id and sort = 0;

  -- two draft starter services: the primary group's first service types
  insert into public.services (stylist_id, service_type_id, service_group_id, category_id, name, description, duration_min, sort)
  select new_stylist_id, id, group_id, primary_category, name, default_description, default_minutes, row_number() over (order by sort) - 1
  from public.service_types
  where group_id = primary_group and active and not is_other
  order by sort
  limit 2;

  return new;
end;
$$;

create trigger on_auth_user_flag_stylist
  before insert on auth.users
  for each row execute function public.flag_new_stylist();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
