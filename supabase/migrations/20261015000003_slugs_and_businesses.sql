-- Booking-link slugs (editable, with redirects) and one shared way to create a stylist business,
-- used by sign-up (handle_new_user) and by signed-in accounts that become stylists (become_stylist).
create table public.reserved_slugs (slug extensions.citext primary key);

insert into public.reserved_slugs (slug) values
  ('search'), ('stylist'), ('book'), ('manage'), ('save-details'), ('account'), ('help'),
  ('login'), ('signup'), ('join'), ('studio'),
  ('admin'), ('about'), ('for-stylists'), ('policies'), ('terms-of-service'), ('privacy-policy'),
  ('reviews'), ('cookies'),
  ('assets'), ('logos'), ('api'), ('auth'), ('favicon'), ('robots'), ('sitemap'), ('email'),
  ('__ds'), ('__harness'),
  ('tiwara'), ('tiwaras-house');

-- a retired slug stays with its stylist forever, so old shared links never reach someone else
create table public.stylist_slug_history (
  slug extensions.citext primary key,
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  retired_at timestamptz not null default now()
);

alter table public.stylists add column slug_changed_at timestamptz;

alter table public.reserved_slugs enable row level security;
alter table public.stylist_slug_history enable row level security;

create function public.is_valid_slug(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select candidate ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(candidate) between 3 and 40
$$;

/** Free for this stylist: valid, not reserved, not anyone else's current or retired slug. */
create function public.is_slug_free(candidate text, for_stylist uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_valid_slug(lower(candidate))
    and not exists (select 1 from public.reserved_slugs where slug = candidate::extensions.citext)
    and not exists (
      select 1 from public.stylists
      where slug = candidate::extensions.citext and id is distinct from for_stylist
    )
    and not exists (
      select 1 from public.stylist_slug_history
      where slug = candidate::extensions.citext and stylist_id is distinct from for_stylist
    )
$$;

create function public.get_unique_slug(business_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  -- cutting at 35 can leave a trailing hyphen, which no suffix could make valid
  base text := trim(both '-' from left(public.slugify(business_name), 35));
  candidate text;
begin
  if length(coalesce(base, '')) < 3 then
    base := 'stylist';
  end if;

  candidate := base;

  for attempt in 1..20 loop
    exit when public.is_slug_free(candidate);
    candidate := base || '-' || substr(md5(random()::text), 1, 4 + attempt / 5);
  end loop;

  return candidate;
end;
$$;

/** Validates the sign-up details and creates the stylist, its address, categories, starter services and defaults. */
create function public.create_stylist_business(new_owner_id uuid, meta jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop jsonb := meta -> 'stylist';
  new_stylist_id uuid;
  primary_group text;
  primary_category uuid;
begin
  if coalesce(meta ->> 'terms_version', '') = '' then
    raise exception 'terms must be accepted';
  end if;

  if shop is null or jsonb_typeof(shop -> 'categories') <> 'array' or jsonb_array_length(shop -> 'categories') = 0 then
    raise exception 'stylist details and at least one category are required';
  end if;

  if upper(coalesce(shop ->> 'postcode', '')) !~ '^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$' then
    raise exception 'a valid UK postcode is required';
  end if;

  insert into public.stylists (
    owner_id, slug, business_name, business_type, location, area_label, travel_radius_miles,
    contact_email, contact_phone, partner_terms_version, referral_source
  )
  values (
    new_owner_id,
    public.get_unique_slug(shop ->> 'business_name'),
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

  -- starting availability (Mon–Fri 9–6, Sat 9–4), rules and "no protection" policy; confirmed when the stylist saves them
  insert into public.working_hours (stylist_id, weekday, is_open, start_time, end_time)
  select new_stylist_id, weekday, weekday < 6, '09:00', case when weekday = 5 then '16:00'::time else '18:00'::time end
  from generate_series(0, 6) as weekday;

  insert into public.booking_rules (stylist_id) values (new_stylist_id);
  insert into public.payment_policies (stylist_id, mode) values (new_stylist_id, 'none');

  return new_stylist_id;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}');
  account_type text := meta ->> 'account_type';
  phone text := nullif(trim(meta ->> 'phone'), '');
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

  if account_type = 'stylist' then
    perform public.create_stylist_business(new.id, meta);
  end if;

  return new;
end;
$$;

-- businesses created before these defaults existed get them too
insert into public.working_hours (stylist_id, weekday, is_open, start_time, end_time)
select stylists.id, weekday, weekday < 6, '09:00', case when weekday = 5 then '16:00'::time else '18:00'::time end
from public.stylists cross join generate_series(0, 6) as weekday
on conflict do nothing;

insert into public.booking_rules (stylist_id) select id from public.stylists on conflict do nothing;

insert into public.payment_policies (stylist_id, mode)
select id, 'none' from public.stylists
where not exists (select 1 from public.payment_policies where stylist_id = stylists.id);

/** A signed-in account adds a stylist business (w4 read-only + w5); the client then refreshes its session. */
create function public.become_stylist(details jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'sign in first';
  end if;

  if exists (select 1 from public.stylists where owner_id = caller) then
    raise exception 'this account already has a business';
  end if;

  perform public.create_stylist_business(caller, details);

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}') || '{"is_stylist": true}'
  where id = caller;
end;
$$;

/** Changes the caller's booking-link slug (once per 30 days); the old one keeps redirecting to them. */
create function public.change_slug(new_slug text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_stylist public.stylists;
  wanted text := lower(trim(new_slug));
begin
  select * into current_stylist from public.stylists where owner_id = auth.uid();

  if current_stylist.id is null then
    raise exception 'no business on this account';
  end if;

  if wanted = current_stylist.slug::text then
    return wanted;
  end if;

  if current_stylist.slug_changed_at > now() - interval '30 days' then
    raise exception 'the booking link can change once every 30 days';
  end if;

  if not public.is_slug_free(wanted, current_stylist.id) then
    raise exception 'that booking link is not available';
  end if;

  -- reclaiming one of their own old slugs takes it out of history
  delete from public.stylist_slug_history
  where slug = wanted::extensions.citext and stylist_id = current_stylist.id;

  insert into public.stylist_slug_history (slug, stylist_id)
  values (current_stylist.slug, current_stylist.id);

  update public.stylists
  set slug = wanted::extensions.citext, slug_changed_at = now()
  where id = current_stylist.id;

  return wanted;
end;
$$;

/** The current slug for a current or retired one (profile links redirect); null when unknown. */
create function public.resolve_slug(lookup text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select slug::text from public.stylists where slug = lookup::extensions.citext),
    (
      select stylists.slug::text
      from public.stylist_slug_history
      join public.stylists on stylists.id = stylist_slug_history.stylist_id
      where stylist_slug_history.slug = lookup::extensions.citext
    )
  )
$$;

revoke execute on function
  public.create_stylist_business(uuid, jsonb), public.get_unique_slug(text)
  from public, anon, authenticated;
revoke execute on function
  public.become_stylist(jsonb), public.change_slug(text), public.is_slug_free(text, uuid)
  from public, anon;
grant execute on function
  public.become_stylist(jsonb), public.change_slug(text), public.is_slug_free(text, uuid)
  to authenticated;
grant execute on function public.resolve_slug(text) to anon, authenticated;
