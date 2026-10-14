-- What clients can read: a stylist's public profile and a paged search over live stylists.
create extension if not exists pg_trgm with schema extensions;

create index stylists_live_location_idx on public.stylists using gist (location) where status = 'live';
create index stylists_live_created_idx on public.stylists (created_at desc, id) where status = 'live';
create index stylists_name_trgm_idx on public.stylists using gin (business_name extensions.gin_trgm_ops);
create index services_active_idx on public.services (stylist_id) where status = 'active';
create index services_active_type_idx on public.services (service_type_id) where status = 'active';
create index services_active_group_idx on public.services (service_group_id) where status = 'active';
create index services_name_trgm_idx on public.services using gin (name extensions.gin_trgm_ops) where status = 'active';

-- £0.50 + 1.5%, the same as bookingFee in src/utils/pricing.ts
create function public.booking_fee_pence(price_pence integer)
returns integer
language sql
immutable
set search_path = ''
as $$ select round(50 + 0.015 * price_pence)::integer $$;

-- base price plus the cheapest offered size and length, like getFromPrice in src/utils/services.ts
create function public.service_from_pence(target uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select service.price_pence + coalesce((
    select sum(cheapest)::integer
    from (
      select min(price_delta_pence) as cheapest
      from public.service_variations
      where service_id = service.id
        and offered
        and ((kind = 'size' and service.sizes_on) or (kind = 'length' and service.lengths_on))
      group by kind
    ) as kinds
  ), 0)
  from public.services as service
  where service.id = target
$$;

-- First start (15-minute steps) inside open hours and the booking window, avoiding paused, closed and blocked time
create function public.get_next_start(target uuid, minutes integer, on_date date, time_from time, time_to time)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select min(slot at time zone 'Europe/London')
  from generate_series(
    coalesce(on_date, (now() at time zone 'Europe/London')::date)::timestamp,
    coalesce(on_date, (now() at time zone 'Europe/London')::date + 27)::timestamp,
    interval '1 day'
  ) as days (day)
  join public.working_hours as hours
    on hours.stylist_id = target and hours.is_open and hours.weekday = extract(isodow from day) - 1
  join public.booking_rules as rules on rules.stylist_id = target
  join public.stylists as stylist on stylist.id = target
  cross join lateral generate_series(
    day + hours.start_time,
    day + hours.end_time - make_interval(mins => minutes),
    interval '15 minutes'
  ) as slots (slot)
  where slot at time zone 'Europe/London' >= now() + make_interval(hours => rules.min_notice_hours)
    and day <= (now() at time zone 'Europe/London')::date + make_interval(months => rules.max_notice_months)
    and not (stylist.pause_on and (stylist.pause_until is null or day::date < stylist.pause_until))
    and (time_from is null or slot >= day + time_from)
    and (time_to is null or slot + make_interval(mins => minutes) <= day + time_to)
    and not exists (
      select 1 from public.closed_periods
      where stylist_id = target and day::date between starts_on and ends_on
    )
    and not exists (
      select 1 from public.time_blocks as block
      where block.stylist_id = target
        and day::date >= block.starts_on
        and (block.repeat_until is null or day::date <= block.repeat_until)
        and case block.repeat
          when 'none' then day::date = block.starts_on
          when 'weekly' then extract(isodow from day) = extract(isodow from block.starts_on)
          when 'monthly' then extract(day from day) = extract(day from block.starts_on)
          else true
        end
        and (block.all_day or (
          slot < day + block.end_time and slot + make_interval(mins => minutes) > day + block.start_time
        ))
    )
$$;

-- Live stylists with a matching active service, a page at a time. No point given: no distance filter.
-- Mobile stylists show when the point is inside their travel radius.
create function public.search_stylists(
  lat double precision default null,
  lng double precision default null,
  radius_miles integer default null,
  service_type text default null,
  service_group text default null,
  search_text text default null,
  venues text[] default null,
  max_price_pence integer default null,
  on_date date default null,
  time_from time default null,
  time_to time default null,
  sort text default 'distance',
  page integer default 0,
  page_size integer default 12
)
returns table (
  id uuid,
  slug text,
  business_name text,
  area_label text,
  business_type text,
  travel_radius_miles smallint,
  cover_path text,
  avatar_path text,
  distance_miles double precision,
  from_pence integer,
  next_start timestamptz,
  matches jsonb,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with place as (
    select case when lat is not null and lng is not null
      then extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
    end as point
  ),
  found as (
    select stylists.*, extensions.st_distance(stylists.location, place.point) / 1609.344 as distance
    from public.stylists, place
    where stylists.status = 'live'
      and (venues is null or stylists.business_type = any (venues))
      and (place.point is null or radius_miles is null
        or extensions.st_dwithin(stylists.location, place.point, 1609.344 * greatest(radius_miles, 25)))
  ),
  matched as (
    select services.*, public.service_from_pence(services.id) as from_price,
      services.name ilike '%' || search_text || '%' as is_named
    from found
    join public.services on services.stylist_id = found.id and services.status = 'active'
    where (service_type is null or services.service_type_id = service_type)
      and (service_group is null or services.service_group_id = service_group)
      and (search_text is null
        or services.name ilike '%' || search_text || '%'
        or found.business_name ilike '%' || search_text || '%')
  ),
  priced as (
    select stylist_id,
      min(from_price + public.booking_fee_pence(from_price)) as from_pence,
      min(duration_min) as minutes,
      jsonb_path_query_array(jsonb_agg(jsonb_build_object(
        'id', matched.id,
        'name', matched.name,
        'from_pence', from_price + public.booking_fee_pence(from_price),
        'minutes', duration_min
      ) order by is_named desc nulls last, from_price, matched.sort), '$[0 to 1]') as matches
    from matched
    group by stylist_id
  ),
  timed as (
    select found.*, priced.from_pence, priced.matches,
      public.get_next_start(found.id, priced.minutes, on_date, time_from, time_to) as next_start
    from found
    join priced on priced.stylist_id = found.id
    cross join place
    where (place.point is null or case
        when found.business_type = 'mobile' then found.distance <= found.travel_radius_miles
        else radius_miles is null or found.distance <= radius_miles
      end)
      and (max_price_pence is null or priced.from_pence <= max_price_pence)
  )
  select timed.id, timed.slug::text, timed.business_name, timed.area_label, timed.business_type,
    timed.travel_radius_miles, timed.cover_path, timed.avatar_path, timed.distance, timed.from_pence,
    timed.next_start, timed.matches, count(*) over ()
  from timed
  where (on_date is null and time_from is null) or timed.next_start is not null
  order by
    case when sort = 'price' then timed.from_pence end,
    case when sort = 'price-desc' then timed.from_pence end desc,
    case when sort = 'newest' then timed.created_at end desc,
    case when sort = 'earliest' then timed.next_start end nulls last,
    case when timed.business_type = 'mobile' then 0 else timed.distance end nulls last,
    timed.next_start nulls last,
    timed.id
  limit least(greatest(page_size, 1), 24)
  offset greatest(page, 0) * least(greatest(page_size, 1), 24)
$$;

-- Everything a client sees on a profile, in the row shapes Studio reads (no address, tax, Stripe or phone).
-- Live and paused profiles are public; owners can always see their own.
create function public.get_stylist_profile(lookup text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', stylist.slug,
    'business_name', stylist.business_name,
    'business_type', stylist.business_type,
    'bio', stylist.bio,
    'area_label', stylist.area_label,
    'travel_radius_miles', stylist.travel_radius_miles,
    'contact_email', stylist.contact_email,
    'instagram', stylist.instagram,
    'tiktok', stylist.tiktok,
    'website', stylist.website,
    'cover_path', stylist.cover_path,
    'status', stylist.status,
    'pause_on', stylist.pause_on,
    'pause_until', stylist.pause_until,
    'next_start', public.get_next_start(stylist.id, (
      select min(duration_min) from public.services where stylist_id = stylist.id and status = 'active'
    ), null, null, null),
    'stylist_categories', (
      select coalesce(jsonb_agg(category order by category.sort), '[]')
      from public.stylist_categories as category where category.stylist_id = stylist.id
    ),
    'services', (
      select coalesce(jsonb_agg(to_jsonb(service) || jsonb_build_object(
        'service_variations', (
          select coalesce(jsonb_agg(variation order by variation.sort), '[]')
          from public.service_variations as variation where variation.service_id = service.id
        ),
        'service_addons', (
          select coalesce(jsonb_agg(link), '[]')
          from public.service_addons as link where link.service_id = service.id
        )
      ) order by service.sort), '[]')
      from public.services as service
      where service.stylist_id = stylist.id and service.status = 'active'
    ),
    'addons', (
      select coalesce(jsonb_agg(addon), '[]')
      from public.addons as addon where addon.stylist_id = stylist.id and addon.status = 'active'
    ),
    'working_hours', (
      select coalesce(jsonb_agg(hours order by hours.weekday), '[]')
      from public.working_hours as hours where hours.stylist_id = stylist.id
    ),
    'closed_periods', (
      select coalesce(jsonb_agg(period order by period.starts_on), '[]')
      from public.closed_periods as period
      where period.stylist_id = stylist.id and period.ends_on >= (now() at time zone 'Europe/London')::date
    ),
    'payment_policy', (
      select to_jsonb(policy) from public.payment_policies as policy
      where policy.stylist_id = stylist.id order by policy.created_at desc limit 1
    ),
    'portfolio_photos', (
      select coalesce(jsonb_agg(photo order by photo.sort), '[]')
      from public.portfolio_photos as photo where photo.stylist_id = stylist.id
    )
  )
  from public.stylists as stylist
  where stylist.slug = lookup::extensions.citext
    and (stylist.status in ('live', 'paused') or stylist.owner_id = auth.uid())
$$;

revoke execute on function
  public.booking_fee_pence(integer),
  public.service_from_pence(uuid),
  public.get_next_start(uuid, integer, date, time, time)
  from public, anon, authenticated;

revoke execute on function public.search_stylists, public.get_stylist_profile(text) from public;
grant execute on function public.search_stylists, public.get_stylist_profile(text) to anon, authenticated;
