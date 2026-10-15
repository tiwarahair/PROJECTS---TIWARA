-- Same answer as before, found day by day: it stops at the first day with a free start (usually today or
-- tomorrow) instead of checking every 15-minute slot of the next 28 days. Search calls it once per stylist.
create or replace function public.get_next_start(target uuid, minutes integer, on_date date, time_from time, time_to time)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/London')::date;
  check_day date;
  first_start timestamptz;
begin
  for check_day in
    select listed::date
    from generate_series(coalesce(on_date, today), coalesce(on_date, today + 27), interval '1 day') as listed
  loop
    select min(slot at time zone 'Europe/London') into first_start
    from (select check_day::timestamp as day) as days
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
      );

    if first_start is not null then
      return first_start;
    end if;
  end loop;

  return null;
end;
$$;

-- matched and priced are worked out once: inlined, Postgres re-ran them (and every booking fee) for each stylist
create or replace function public.search_stylists(
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
  cover_path text,
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
  matched as materialized (
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
  priced as materialized (
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
    timed.cover_path, timed.distance, timed.from_pence,
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
