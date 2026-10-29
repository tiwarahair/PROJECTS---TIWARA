alter table public.booking_rules
  add column min_notice_minutes integer not null default 1440 check (min_notice_minutes between 0 and 20160);

update public.booking_rules set min_notice_minutes = min_notice_hours * 60;

create or replace function public.get_day_slots(target uuid, minutes integer, buffer_minutes integer, check_day date, ignore_booking uuid default null)
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
    and slot at time zone 'Europe/London' >= now() + make_interval(mins => rules.min_notice_minutes)
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
        and (
          booking.status in ('awaiting_confirmation', 'confirmed', 'arrived')
          or (booking.status = 'held' and booking.hold_expires_at > now())
        )
        and booking.block_range && tstzrange(
          slot at time zone 'Europe/London',
          (slot + make_interval(mins => get_day_slots.minutes + get_day_slots.buffer_minutes)) at time zone 'Europe/London',
          '[)'
        )
    )
$$;

alter table public.booking_rules drop column min_notice_hours;
