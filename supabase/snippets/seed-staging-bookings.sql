-- Test bookings in every state for the first four test stylists (owners @example.com, never real accounts), so Studio has data.

do $$
begin

delete from public.bookings where contact ->> 'email' like 'seed-client-%@example.com';

with stylist as (
  select stylists.id, row_number() over (order by stylists.slug = 'tiwaras-house' desc, stylists.slug) as nth
  from public.stylists
  join auth.users on users.id = stylists.owner_id
  where users.email like '%@example.com' and stylists.status = 'live'
),
picked as (
  select stylist.id as stylist_id, stylist.nth, service.id as service_id, service.name, service.price_pence, service.duration_min,
    policy.id as policy_id, policy.mode, policy.deposit_percent, policy.refundable, policy.free_window_hours,
    policy.grace_minutes, policy.late_on, policy.late_kind, policy.late_percent, policy.no_show_on, policy.no_show_kind,
    policy.no_show_percent, policy.extras
  from stylist
  cross join lateral (
    select * from public.services where stylist_id = stylist.id and status = 'active' order by sort limit 1
  ) as service
  cross join lateral (
    select * from public.payment_policies where stylist_id = stylist.id order by created_at desc limit 1
  ) as policy
  where stylist.nth <= 4
),
plan (n, day, at, status, cancelled_by, is_late) as (
  values
    (1, -9, '10:00', 'completed', null, false),
    (2, -7, '13:00', 'completed', null, false),
    (3, -6, '11:00', 'cancelled', 'client', false),
    (4, -5, '15:00', 'cancelled', 'client', true),
    (5, -4, '10:30', 'no_show', null, false),
    (6, -3, '12:00', 'completed', null, false),
    (7, -2, '14:00', 'cancelled', 'stylist', false),
    (8, -1, '11:00', 'completed', null, false),
    (9, 0, '10:00', 'confirmed', null, false),
    (10, 0, '14:30', 'confirmed', null, false),
    (11, 1, '11:00', 'confirmed', null, false),
    (12, 2, '13:00', 'confirmed', null, false),
    (13, 3, '10:00', 'cancelled', 'client', false),
    (14, 5, '15:00', 'confirmed', null, false),
    (15, 8, '11:30', 'confirmed', null, false),
    (16, 12, '10:00', 'confirmed', null, false),
    (17, 20, '14:00', 'confirmed', null, false)
),
client (k, first_name, last_name) as (
  values (1, 'Nia', 'Okafor'), (2, 'Kemi', 'Adeyemi'), (3, 'Ruth', 'Mensah'), (4, 'Amara', 'Obi'),
    (5, 'Yasmin', 'Bello'), (6, 'Tola', 'Hassan'), (7, 'Jade', 'Campbell'), (8, 'Zara', 'Ahmed')
),
booking as (
  select picked.*, plan.*, client.first_name, client.last_name, client.k,
    (((now() at time zone 'Europe/London')::date + plan.day) + plan.at::time) at time zone 'Europe/London' as starts_at,
    public.booking_fee_pence(picked.price_pence) as fee,
    case picked.mode
      when 'deposit' then round(picked.price_pence * picked.deposit_percent / 100.0)::int
      when 'full' then picked.price_pence
      else 0
    end as paid_service
  from picked
  cross join plan
  join client on client.k = (plan.n + picked.nth) % 8 + 1
)
insert into public.bookings (stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, buffer_minutes,
  starts_at, ends_at, block_ends_at, status, contact, policy_id, terms, due_today_pence, paid_at, created_at,
  cancelled_at, cancelled_by, cancellation)
select stylist_id, service_id, '{"addons": [], "variations": []}',
  jsonb_build_object('service_name', name, 'options', '[]'::jsonb, 'addons', '[]'::jsonb, 'colour', null),
  price_pence, fee, duration_min, 0,
  starts_at, starts_at + make_interval(mins => duration_min), starts_at + make_interval(mins => duration_min),
  status,
  jsonb_build_object('first', first_name, 'last', last_name, 'email', 'seed-client-' || k || '@example.com',
    'phone', '07700900' || lpad((100 + k)::text, 3, '0')),
  policy_id,
  jsonb_build_object('mode', mode, 'deposit_percent', deposit_percent, 'refundable', refundable,
    'free_window_hours', free_window_hours, 'grace_minutes', grace_minutes, 'late_on', late_on, 'late_kind', late_kind,
    'late_percent', late_percent, 'no_show_on', no_show_on, 'no_show_kind', no_show_kind,
    'no_show_percent', no_show_percent, 'extras', extras,
    'deposit_pence', case when mode = 'deposit' then paid_service else 0 end,
    'free_cancel_until', starts_at - make_interval(secs => free_window_hours * 3600)),
  paid_service + fee,
  least(now(), starts_at - interval '7 days'),
  least(now(), starts_at - interval '7 days'),
  case when status = 'cancelled' then least(now(), starts_at - interval '1 day') end,
  cancelled_by,
  case
    when cancelled_by = 'stylist' then jsonb_build_object('is_late', false, 'refund_pence', paid_service + fee,
      'kept_pence', 0, 'charge_pence', 0)
    when is_late then jsonb_build_object('is_late', true, 'refund_pence', 0, 'kept_pence', paid_service, 'charge_pence', 0)
    when cancelled_by = 'client' then jsonb_build_object('is_late', false, 'refund_pence', paid_service,
      'kept_pence', 0, 'charge_pence', 0)
  end
from booking
on conflict do nothing;

end
$$;
