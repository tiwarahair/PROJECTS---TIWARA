-- Bookings: held for 10 minutes while the client books, never two at once for a stylist (buffer included).
-- Price, length and open times are worked out here; the browser only shows them.
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('TH-' || upper(encode(extensions.gen_random_bytes(3), 'hex'))),
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  client_id uuid references public.profiles (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  -- the picks (ids), and what they were then: service name, options and add-ons with labels and prices
  choices jsonb not null,
  snapshot jsonb not null,
  price_pence integer not null check (price_pence >= 0),
  fee_pence integer not null check (fee_pence >= 0),
  minutes integer not null check (minutes > 0),
  buffer_minutes integer not null default 0 check (buffer_minutes >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- set with the times (the end plus the buffer); a generated column can't add minutes to a timestamptz
  block_ends_at timestamptz not null,
  block_range tstzrange generated always as (tstzrange(starts_at, block_ends_at, '[)')) stored,
  status text not null default 'held'
    check (status in ('held', 'expired', 'confirmed', 'cancelled', 'completed', 'no_show')),
  hold_expires_at timestamptz,
  hold_secret_hash bytea,
  -- the client's address and point, for mobile stylists
  address jsonb,
  location extensions.geography(point, 4326),
  reschedule_count smallint not null default 0,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (block_ends_at >= ends_at),
  constraint bookings_no_overlap exclude using gist (stylist_id with =, block_range with &&)
    where (status in ('held', 'confirmed'))
);

create index bookings_client_id_idx on public.bookings (client_id);
create index bookings_held_idx on public.bookings (hold_expires_at) where status = 'held';

-- Everything that happens to a booking, in order (also evidence for disputes).
create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index booking_events_booking_id_idx on public.booking_events (booking_id);

alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;

create policy "Clients read their bookings" on public.bookings
  for select to authenticated using (client_id = (select auth.uid()));
create policy "Owners read their stylist's bookings" on public.bookings
  for select to authenticated using (public.is_stylist_owner(stylist_id));
create policy "Owners read their stylist's booking events" on public.booking_events
  for select to authenticated using (
    exists (select 1 from public.bookings where bookings.id = booking_id and public.is_stylist_owner(bookings.stylist_id))
  );

grant select on public.bookings, public.booking_events to authenticated;

-- Price, length and buffer for a service with the client's picks: one size / length / answer per own question
-- (each switched-on question answered), add-ons linked to the service. Raises invalid_choices otherwise.
create function public.price_booking(target_service uuid, choices jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  service public.services;
  stylist public.stylists;
  rules public.booking_rules;
  chosen uuid[] := array(select jsonb_array_elements_text(coalesce(choices -> 'variations', '[]'))::uuid);
  extra_ids uuid[] := array(select jsonb_array_elements_text(coalesce(choices -> 'addons', '[]'))::uuid);
  options jsonb;
  extras jsonb;
  price integer;
  total_minutes integer;
begin
  select * into service from public.services where id = target_service and status = 'active';
  select * into stylist from public.stylists where id = service.stylist_id;
  select * into rules from public.booking_rules where stylist_id = service.stylist_id;

  if service.id is null then
    raise exception 'not_bookable';
  end if;

  if exists (
      select 1 from unnest(chosen) as picked (id)
      left join public.service_variations as variation
        on variation.id = picked.id and variation.service_id = service.id and variation.offered
          and (variation.kind = 'own' or (variation.kind = 'size' and service.sizes_on)
            or (variation.kind = 'length' and service.lengths_on))
      where variation.id is null
    )
    or exists (
      select 1 from public.service_variations
      where id = any (chosen)
      group by kind, group_name
      having count(*) > 1
    )
    or exists (
      select 1 from public.service_variations as variation
      where variation.service_id = service.id and variation.offered
        and (variation.kind = 'own' or (variation.kind = 'size' and service.sizes_on)
          or (variation.kind = 'length' and service.lengths_on))
      group by variation.kind, variation.group_name
      having not bool_or(variation.id = any (chosen))
    )
    or cardinality(extra_ids) <> (select count(distinct picked) from unnest(extra_ids) as picked)
    or exists (
      select 1 from unnest(extra_ids) as picked (id)
      left join public.service_addons as link on link.addon_id = picked.id and link.service_id = service.id
      left join public.addons as addon on addon.id = link.addon_id and addon.status = 'active'
      where addon.id is null
    ) then
    raise exception 'invalid_choices';
  end if;

  select
    coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'group', group_name, 'label', label,
      'price_delta_pence', price_delta_pence, 'minutes_delta', minutes_delta) order by kind, sort), '[]'),
    service.price_pence + coalesce(sum(price_delta_pence), 0),
    service.duration_min + coalesce(sum(minutes_delta), 0)
  into options, price, total_minutes
  from public.service_variations
  where id = any (chosen);

  select
    coalesce(jsonb_agg(jsonb_build_object('id', addon.id, 'name', addon.name,
      'price_pence', coalesce(link.price_override_pence, addon.price_pence),
      'minutes', coalesce(link.minutes_override, addon.minutes)) order by addon.name), '[]'),
    price + coalesce(sum(coalesce(link.price_override_pence, addon.price_pence)), 0),
    total_minutes + coalesce(sum(coalesce(link.minutes_override, addon.minutes)), 0)
  into extras, price, total_minutes
  from public.addons as addon
  join public.service_addons as link on link.addon_id = addon.id and link.service_id = service.id
  where addon.id = any (extra_ids);

  return jsonb_build_object(
    'service_name', service.name,
    'options', options,
    'addons', extras,
    'colour', choices ->> 'colour',
    'price_pence', price,
    'fee_pence', public.booking_fee_pence(price),
    'minutes', greatest(total_minutes, 15),
    'buffer_minutes', coalesce(service.extra_time_min, rules.default_extra_minutes)
      + case when stylist.business_type = 'mobile' then rules.travel_buffer_minutes else 0 end
  );
end;
$$;

-- Open starts on one London day, every 30 minutes from opening: inside the notice and booking windows, not paused,
-- closed or blocked, and clear of other bookings and live holds (theirs and this one's buffer included).
create function public.get_day_slots(
  target uuid, minutes integer, buffer_minutes integer, check_day date, ignore_booking uuid default null
)
returns setof timestamptz
language sql
stable
set search_path = ''
as $$
  select distinct slot at time zone 'Europe/London'
  from public.working_hours as hours
  join public.booking_rules as rules on rules.stylist_id = target
  join public.stylists as stylist on stylist.id = target
  cross join lateral generate_series(
    check_day + hours.start_time,
    check_day + hours.end_time - make_interval(mins => minutes),
    interval '30 minutes'
  ) as slots (slot)
  where hours.stylist_id = target
    and hours.is_open
    and hours.weekday = extract(isodow from check_day) - 1
    and slot at time zone 'Europe/London' >= now() + make_interval(hours => rules.min_notice_hours)
    and check_day <= (now() at time zone 'Europe/London')::date + make_interval(months => rules.max_notice_months)
    and not (stylist.pause_on and (stylist.pause_until is null or check_day < stylist.pause_until))
    and not exists (
      select 1 from public.closed_periods
      where stylist_id = target and check_day between starts_on and ends_on
    )
    and not exists (
      select 1 from public.time_blocks as block
      where block.stylist_id = target
        and check_day >= block.starts_on
        and (block.repeat_until is null or check_day <= block.repeat_until)
        and case block.repeat
          when 'none' then check_day = block.starts_on
          when 'weekly' then extract(isodow from check_day) = extract(isodow from block.starts_on)
          when 'monthly' then extract(day from check_day) = extract(day from block.starts_on)
          else true
        end
        and (block.all_day or (
          slot < check_day + block.end_time and slot + make_interval(mins => minutes) > check_day + block.start_time
        ))
    )
    and not exists (
      select 1 from public.bookings as booking
      where booking.stylist_id = target
        and booking.id is distinct from ignore_booking
        and (booking.status = 'confirmed' or (booking.status = 'held' and booking.hold_expires_at > now()))
        and booking.block_range && tstzrange(
          slot at time zone 'Europe/London',
          (slot + make_interval(mins => minutes + buffer_minutes)) at time zone 'Europe/London',
          '[)'
        )
    )
$$;

-- Search's "Next available": the first open start in the next 28 days (or on the chosen day), day by day,
-- on the same grid as booking so it's always a time that can be booked.
create or replace function public.get_next_start(target uuid, minutes integer, on_date date, time_from time, time_to time)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/London')::date;
  buffer integer;
  check_day date;
  first_start timestamptz;
begin
  select rules.default_extra_minutes
    + case when stylist.business_type = 'mobile' then rules.travel_buffer_minutes else 0 end
  into buffer
  from public.booking_rules as rules
  join public.stylists as stylist on stylist.id = rules.stylist_id
  where rules.stylist_id = target;

  for check_day in
    select listed::date
    from generate_series(coalesce(on_date, today), coalesce(on_date, today + 27), interval '1 day') as listed
  loop
    select min(slot) into first_start
    from public.get_day_slots(target, minutes, coalesce(buffer, 0), check_day) as slot
    where (time_from is null or (slot at time zone 'Europe/London')::time >= time_from)
      and (time_to is null
        or (slot at time zone 'Europe/London') + make_interval(mins => minutes) <= check_day + time_to);

    if first_start is not null then
      return first_start;
    end if;
  end loop;

  return null;
end;
$$;

-- The booking page's times for a service and picks, between two London dates (at most two months).
create function public.get_available_slots(target_service uuid, choices jsonb, from_date date, to_date date)
returns setof timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  stylist_id uuid;
  quote jsonb;
begin
  select services.stylist_id into stylist_id
  from public.services
  join public.stylists on stylists.id = services.stylist_id
  where services.id = target_service and services.status = 'active' and stylists.status = 'live';

  if stylist_id is null then
    raise exception 'not_bookable';
  end if;

  quote := public.price_booking(target_service, choices);

  return query
    select slot
    from generate_series(from_date, least(to_date, from_date + 61), interval '1 day') as days (day)
    cross join lateral public.get_day_slots(
      stylist_id, (quote ->> 'minutes')::integer, (quote ->> 'buffer_minutes')::integer, day::date
    ) as slot
    order by slot;
end;
$$;

-- Holds a start for 10 minutes (called by the booking-hold function, which rate-limits by IP). Clears this
-- stylist's lapsed holds first; with the hold's id and secret it moves that hold instead of making another.
-- Errors: not_bookable, invalid_choices, address_required, outside_area, hold_not_found, slot_taken.
create function public.hold_booking(
  target_service uuid,
  choices jsonb,
  slot_start timestamptz,
  client_lat double precision default null,
  client_lng double precision default null,
  hold_id uuid default null,
  hold_secret text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  stylist public.stylists;
  quote jsonb;
  held public.bookings;
  point extensions.geography;
  secret text := hold_secret;
  slot_end timestamptz;
begin
  select stylists.* into stylist
  from public.stylists
  join public.services on services.stylist_id = stylists.id
  where services.id = target_service and services.status = 'active' and stylists.status = 'live';

  if stylist.id is null then
    raise exception 'not_bookable';
  end if;

  quote := public.price_booking(target_service, choices);

  if stylist.business_type = 'mobile' then
    if client_lat is null or client_lng is null then
      raise exception 'address_required';
    end if;

    point := extensions.st_setsrid(extensions.st_makepoint(client_lng, client_lat), 4326)::extensions.geography;

    if not extensions.st_dwithin(stylist.location, point, stylist.travel_radius_miles * 1609.344) then
      raise exception 'outside_area';
    end if;
  end if;

  update public.bookings set status = 'expired'
  where stylist_id = stylist.id and status = 'held' and hold_expires_at <= now();

  if hold_id is not null then
    select * into held from public.bookings
    where id = hold_id
      and hold_secret_hash = sha256(convert_to(coalesce(hold_secret, ''), 'UTF8'))
      and status in ('held', 'expired')
    for update;

    if held.id is null then
      raise exception 'hold_not_found';
    end if;
  end if;

  if not exists (
    select 1
    from public.get_day_slots(
      stylist.id, (quote ->> 'minutes')::integer, (quote ->> 'buffer_minutes')::integer,
      (slot_start at time zone 'Europe/London')::date, held.id
    ) as slot
    where slot = slot_start
  ) then
    raise exception 'slot_taken';
  end if;

  slot_end := slot_start + make_interval(mins => (quote ->> 'minutes')::integer);

  begin
    if held.id is null then
      secret := encode(extensions.gen_random_bytes(24), 'hex');

      -- the reference is random, so on the rare clash with an existing one, draw again
      for attempt in 1..3 loop
        begin
          insert into public.bookings (
            stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, buffer_minutes,
            starts_at, ends_at, block_ends_at, hold_expires_at, hold_secret_hash, location
          )
          values (
            stylist.id, target_service, choices, quote - 'price_pence' - 'fee_pence' - 'minutes' - 'buffer_minutes',
            (quote ->> 'price_pence')::integer, (quote ->> 'fee_pence')::integer, (quote ->> 'minutes')::integer,
            (quote ->> 'buffer_minutes')::integer, slot_start, slot_end,
            slot_end + make_interval(mins => (quote ->> 'buffer_minutes')::integer),
            now() + interval '10 minutes', sha256(convert_to(secret, 'UTF8')), point
          )
          returning * into held;

          exit;
        exception when unique_violation then
          if attempt = 3 then
            raise;
          end if;
        end;
      end loop;
    else
      update public.bookings
      set service_id = target_service,
        choices = hold_booking.choices,
        snapshot = quote - 'price_pence' - 'fee_pence' - 'minutes' - 'buffer_minutes',
        price_pence = (quote ->> 'price_pence')::integer,
        fee_pence = (quote ->> 'fee_pence')::integer,
        minutes = (quote ->> 'minutes')::integer,
        buffer_minutes = (quote ->> 'buffer_minutes')::integer,
        starts_at = slot_start,
        ends_at = slot_end,
        block_ends_at = slot_end + make_interval(mins => (quote ->> 'buffer_minutes')::integer),
        status = 'held',
        hold_expires_at = now() + interval '10 minutes',
        location = point
      where id = held.id
      returning * into held;
    end if;
  exception when exclusion_violation then
    raise exception 'slot_taken';
  end;

  insert into public.booking_events (booking_id, kind, data)
  values (held.id, 'held', jsonb_build_object('starts_at', slot_start));

  return jsonb_build_object(
    'id', held.id,
    'ref', held.ref,
    'secret', secret,
    'hold_expires_at', held.hold_expires_at,
    'starts_at', held.starts_at,
    'price_pence', held.price_pence,
    'fee_pence', held.fee_pence,
    'minutes', held.minutes
  );
end;
$$;

-- Lapsed holds (the hold function also clears a stylist's own before holding).
create function public.expire_booking_holds()
returns void
language sql
set search_path = ''
as $$
  update public.bookings set status = 'expired' where status = 'held' and hold_expires_at <= now()
$$;

select cron.schedule('expire-booking-holds', '* * * * *', 'select public.expire_booking_holds()');

revoke execute on function
  public.price_booking(uuid, jsonb),
  public.get_day_slots(uuid, integer, integer, date, uuid),
  public.hold_booking(uuid, jsonb, timestamptz, double precision, double precision, uuid, text),
  public.expire_booking_holds()
  from public, anon, authenticated;

grant execute on function
  public.hold_booking(uuid, jsonb, timestamptz, double precision, double precision, uuid, text)
  to service_role;

revoke execute on function public.get_available_slots(uuid, jsonb, date, date) from public;
grant execute on function public.get_available_slots(uuid, jsonb, date, date) to anon, authenticated;
