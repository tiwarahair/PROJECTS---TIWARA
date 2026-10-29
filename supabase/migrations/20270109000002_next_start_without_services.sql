create or replace function public.get_next_start(target uuid, minutes integer, on_date date, time_from time, time_to time)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/London')::date;
  length_minutes integer := case when minutes is not null then greatest(minutes, 15) end;
  buffer integer;
  check_day date;
  first_start timestamptz;
begin
  select coalesce(shortest.extra_time_min, rules.default_extra_minutes)
    + case when stylist.business_type = 'mobile' then rules.travel_buffer_minutes else 0 end
  into buffer
  from public.booking_rules as rules
  join public.stylists as stylist on stylist.id = rules.stylist_id
  left join lateral (
    select extra_time_min from public.services
    where stylist_id = target and status = 'active' and duration_min = minutes
    order by sort
    limit 1
  ) as shortest on true
  where rules.stylist_id = target;

  for check_day in
    select listed::date
    from generate_series(coalesce(on_date, today), coalesce(on_date, today + 27), interval '1 day') as listed
  loop
    select min(slot) into first_start
    from public.get_day_slots(target, length_minutes, coalesce(buffer, 0), check_day) as slot
    where (time_from is null or (slot at time zone 'Europe/London')::time >= time_from)
      and (time_to is null
        or (slot at time zone 'Europe/London') + make_interval(mins => length_minutes) <= check_day + time_to);

    if first_start is not null then
      return first_start;
    end if;
  end loop;

  return null;
end;
$$;
