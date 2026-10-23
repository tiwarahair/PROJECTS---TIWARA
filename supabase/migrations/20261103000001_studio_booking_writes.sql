-- Stylist-made bookings: existing / new client or walk-in, optional booking protection (the client confirms on a
-- link and pays like an online booking), auto-cancel when nobody confirms in time, and editing a real booking's
-- service, price, time and client.

alter table public.bookings
  add column protection_status text not null default 'not_required'
    check (protection_status in ('not_required', 'pending', 'protected', 'overridden')),
  add column confirm_by timestamptz,
  add column confirm_sends smallint not null default 0,
  add column confirm_sent_at timestamptz,
  add column policy_accepted_at timestamptz,
  add column protection_overridden_at timestamptz,
  add column auto_cancel_warned_at timestamptz;

create table public.booking_notes (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  note text not null check (char_length(note) <= 500)
);

alter table public.booking_notes enable row level security;

create policy "Owners read their bookings' notes" on public.booking_notes
  for select to authenticated using (
    exists (select 1 from public.bookings where bookings.id = booking_id and public.is_stylist_owner(bookings.stylist_id))
  );

grant select on public.booking_notes to authenticated;

-- online bookings that paid under a deposit, card or full policy are protected
update public.bookings set protection_status = 'protected'
where paid_at is not null and terms ->> 'mode' in ('deposit', 'card', 'full');

create index bookings_confirm_by_idx on public.bookings (confirm_by) where status = 'awaiting_confirmation';

alter table public.booking_tokens drop constraint booking_tokens_purpose_check;
alter table public.booking_tokens
  add constraint booking_tokens_purpose_check check (purpose in ('manage', 'invite', 'secure', 'confirm'));

-- a client added with a phone number only has no email address: there's nothing to send
create or replace function public.queue_email(to_address text, template text, payload jsonb, user_id uuid default null)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, channel, to_address, template, payload)
  select queue_email.user_id, 'email', queue_email.to_address, queue_email.template, queue_email.payload
  where nullif(trim(queue_email.to_address), '') is not null
  returning id
$$;

-- the site links in emails point at (the same list as the edge functions' getSite)
create function public.get_site(origin text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when origin in ('https://dev.tiwarashouse.com', 'https://tiwarashouse.com', 'https://www.tiwarashouse.com')
      or origin ~ '^http://(localhost|127\.0\.0\.1):\d+$' then origin
    else 'https://www.tiwarashouse.com'
  end
$$;

-- Pricing a service with its choices; online bookings need a live stylist, the stylist's own bookings don't.
create function public.price_service(target_service uuid, choices jsonb, require_live boolean)
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
  select * into stylist from public.stylists
  where id = service.stylist_id and (status = 'live' or not require_live);
  select * into rules from public.booking_rules where stylist_id = service.stylist_id;

  if stylist.id is null then
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
    -- online, every choice group needs an answer; a stylist sets their own price and length instead
    or (require_live and exists (
      select 1 from public.service_variations as variation
      where variation.service_id = service.id and variation.offered
        and (variation.kind = 'own' or (variation.kind = 'size' and service.sizes_on)
          or (variation.kind = 'length' and service.lengths_on))
      group by variation.kind, variation.group_name
      having not bool_or(variation.id = any (chosen))
    ))
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
    'stylist_id', stylist.id,
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

create or replace function public.price_booking(target_service uuid, choices jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.price_service(target_service, choices, true)
$$;

/** A client's details as the stylist typed them: a first name and a UK mobile or an email. */
create function public.clean_contact(contact jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  first text := trim(coalesce(contact ->> 'first', ''));
  phone text := trim(coalesce(contact ->> 'phone', ''));
  email text := lower(trim(coalesce(contact ->> 'email', '')));
begin
  if first = '' or char_length(first) > 60 or char_length(coalesce(contact ->> 'last', '')) > 60 then
    raise exception 'invalid_client';
  end if;

  if phone = '' and email = '' then
    raise exception 'contact_required';
  end if;

  if phone <> '' and regexp_replace(phone, '\D', '', 'g') !~ '^(44|0)?7\d{9}$' then
    raise exception 'invalid_phone';
  end if;

  if email <> '' and (email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(email) > 254) then
    raise exception 'invalid_email';
  end if;

  return jsonb_build_object(
    'first', first, 'last', trim(coalesce(contact ->> 'last', '')),
    'phone', nullif(phone, ''), 'email', nullif(email, '')
  );
end;
$$;

/** The policy terms a stylist-made booking carries: the current policy when protected, nothing to enforce when not. */
create function public.get_studio_terms(stylist uuid, starts_at timestamptz, price integer, protect boolean)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  policy public.payment_policies;
  deposit integer := 0;
begin
  select * into policy from public.payment_policies
  where stylist_id = get_studio_terms.stylist
  order by created_at desc
  limit 1;

  if protect and policy.mode = 'deposit' then
    deposit := round(price * policy.deposit_percent / 100.0);
  end if;

  return to_jsonb(policy) - 'id' - 'stylist_id' - 'created_at' || jsonb_build_object(
    'deposit_pence', deposit,
    'free_cancel_until', starts_at - make_interval(secs => coalesce(policy.free_window_hours, 0) * 3600)
  ) || case when protect then '{}'::jsonb else jsonb_build_object(
    'mode', 'none', 'late_on', false, 'no_show_on', false
  ) end;
end;
$$;

/** What the client pays to confirm: as online checkout (deposit + fee, full + fee, or the fee with a saved card). */
create function public.get_due_pence(terms jsonb, price integer, fee integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case terms ->> 'mode'
    when 'deposit' then coalesce((terms ->> 'deposit_pence')::integer, 0) + fee
    when 'full' then price + fee
    when 'card' then fee
    else 0
  end
$$;

-- links a client was sent stop working (they open as "changed" rather than "not found")
create function public.revoke_confirm_links(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.booking_tokens set used_at = now()
  where booking_id = target and purpose = 'confirm' and used_at is null
$$;

/** Where, before the client has confirmed: a home-based stylist's area only (their address comes with the confirmation). */
create function public.get_unconfirmed_where(target uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when stylists.business_type = 'home_based' then concat_ws(', ', stylists.business_name, stylists.area_label)
    else public.get_booking_where(target)
  end
  from public.bookings
  join public.stylists on stylists.id = bookings.stylist_id
  where bookings.id = target
$$;

/** Emails the client a link to confirm (and pay for) the booking; a link replaced after a change isn't a resend. */
create function public.send_confirm_link(target uuid, template text, counts boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
begin
  update public.bookings set confirm_sends = confirm_sends + case when counts then 1 else 0 end, confirm_sent_at = now()
  where id = target
  returning * into booking;

  perform public.queue_email(
    booking.contact ->> 'email',
    template,
    public.get_booking_details(booking.id) || jsonb_build_object(
      'where', public.get_unconfirmed_where(booking.id),
      'terms', booking.terms,
      'price_pence', booking.price_pence,
      'fee_pence', booking.fee_pence,
      'due_pence', booking.due_today_pence,
      'confirm_by', booking.confirm_by,
      'confirm_url', booking.site || '/confirm?token='
        || public.create_booking_token(booking.id, 'confirm', booking.confirm_by)
    ),
    booking.client_id
  );
end;
$$;

/** Tells a client the stylist booked them in (no protection needed), with their manage link. */
create function public.send_studio_booking_notice(target uuid, template text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
begin
  select * into booking from public.bookings where id = target;

  if booking.contact ->> 'email' is null or booking.starts_at <= now() then
    return;
  end if;

  perform public.queue_email(
    booking.contact ->> 'email',
    template,
    public.get_booking_details(booking.id) || jsonb_build_object(
      'terms', booking.terms,
      'price_pence', booking.price_pence,
      'fee_pence', booking.fee_pence,
      'paid_pence', case when booking.paid_at is not null then booking.due_today_pence else 0 end,
      'manage_url', booking.site || '/manage?token='
        || public.create_booking_token(booking.id, 'manage', booking.starts_at + interval '30 days'),
      'save_details_url', null
    ),
    booking.client_id
  );
end;
$$;

/** Checks a stylist's own booking can ask for protection, and gives its confirm-by time. */
create function public.get_confirm_by(stylist public.stylists, starts_at timestamptz, terms jsonb)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  deadline timestamptz := least(now() + interval '48 hours', starts_at - interval '2 hours');
begin
  if coalesce(terms ->> 'mode', 'none') = 'none'
    or (terms ->> 'mode' in ('deposit', 'full') and not (stylist.charges_enabled and stylist.stripe_account_id is not null)) then
    raise exception 'cannot_protect';
  end if;

  if deadline <= now() then
    raise exception 'too_late_to_protect';
  end if;

  return deadline;
end;
$$;

/**
 * How a stylist-made booking stands: waiting for the client (protect), not needed (walk-in, or a policy that asks for
 * nothing), or overridden (the stylist skipped the protection their policy asks for, or the start has passed).
 */
create function public.get_protection_status(stylist uuid, client jsonb, protect boolean, is_past boolean)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when protect then 'pending'
    when client is null then 'not_required'
    when is_past or coalesce((
      select mode from public.payment_policies where stylist_id = get_protection_status.stylist
      order by created_at desc limit 1
    ), 'none') <> 'none' then 'overridden'
    else 'not_required'
  end
$$;

/** The service snapshot with the stylist's own prices, minutes and quantities for this booking's add-ons. */
create function public.get_studio_snapshot(priced jsonb, addons jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  extras jsonb;
begin
  if jsonb_array_length(coalesce(addons, '[]')) <> jsonb_array_length(priced -> 'addons') then
    raise exception 'invalid_choices';
  end if;

  select coalesce(jsonb_agg(addon || jsonb_build_object(
      'price_pence', coalesce((own ->> 'price_pence')::integer, (addon ->> 'price_pence')::integer),
      'minutes', coalesce((own ->> 'minutes')::integer, (addon ->> 'minutes')::integer),
      'quantity', coalesce((own ->> 'quantity')::integer, 1)
    ) order by addon ->> 'name'), '[]')
  into extras
  from jsonb_array_elements(priced -> 'addons') as addon
  join jsonb_array_elements(coalesce(addons, '[]')) as own on own ->> 'id' = addon ->> 'id';

  if jsonb_array_length(extras) <> jsonb_array_length(priced -> 'addons')
    or exists (
      select 1 from jsonb_array_elements(extras) as line
      where (line ->> 'price_pence')::integer < 0 or (line ->> 'minutes')::integer < 0
        or (line ->> 'quantity')::integer not between 1 and 20
    ) then
    raise exception 'invalid_choices';
  end if;

  return jsonb_build_object(
    'service_name', priced ->> 'service_name',
    'options', priced -> 'options',
    'addons', extras,
    'colour', priced -> 'colour'
  );
end;
$$;

/**
 * Studio's "New booking": an existing or new client (or a walk-in, contact null), from 00:00 today. With protect, the
 * client is sent a link to confirm and pay under the stylist's policy; otherwise it's confirmed straight away.
 */
create function public.create_studio_booking(
  target_service uuid, choices jsonb, slot_start timestamptz, minutes integer, extra_minutes integer,
  price_pence integer, addons jsonb, contact jsonb, address jsonb, stylist_note text, protect boolean,
  allow_overlap boolean, origin text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  priced jsonb;
  stylist public.stylists;
  client jsonb := case when contact is null then null else public.clean_contact(contact) end;
  is_past boolean := slot_start < now();
  terms jsonb;
  fee integer;
  deadline timestamptz;
  protection text;
  booking public.bookings;
begin
  select * into stylist from public.stylists
  where id = (select stylist_id from public.services where id = target_service) and public.is_stylist_owner(id);

  if stylist.id is null then
    raise exception 'not_found';
  end if;

  priced := public.price_service(target_service, choices, false);

  if slot_start < (date_trunc('day', now() at time zone 'Europe/London') at time zone 'Europe/London') then
    raise exception 'start_too_early';
  end if;

  if minutes not between 5 and 775 or extra_minutes not between 0 and 120 or price_pence not between 0 and 1000000
    or (protect and (client is null or is_past)) then
    raise exception 'invalid_booking';
  end if;

  terms := public.get_studio_terms(stylist.id, slot_start, price_pence, protect);
  fee := case when protect then public.booking_fee_pence(price_pence) else 0 end;

  if protect then
    deadline := public.get_confirm_by(stylist, slot_start, terms);
  end if;

  protection := public.get_protection_status(stylist.id, client, protect, is_past);

  begin
    insert into public.bookings (
      stylist_id, service_id, choices, snapshot, price_pence, fee_pence, minutes, buffer_minutes, starts_at, ends_at,
      block_ends_at, status, contact, address, policy_id, terms, due_today_pence, created_by, overlap_ok,
      protection_status, confirm_by, protection_overridden_at, arrived_at, site
    )
    values (
      stylist.id, target_service, coalesce(choices, '{}'), public.get_studio_snapshot(priced, addons), price_pence, fee,
      minutes, extra_minutes, slot_start, slot_start + make_interval(mins => minutes),
      slot_start + make_interval(mins => minutes + extra_minutes),
      case when is_past then 'arrived' when protect then 'awaiting_confirmation' else 'confirmed' end,
      client, case when stylist.business_type = 'mobile' then address end,
      (select id from public.payment_policies where stylist_id = stylist.id order by created_at desc limit 1),
      terms, public.get_due_pence(terms, price_pence, fee), 'stylist', allow_overlap,
      protection,
      deadline,
      case when protection = 'overridden' then now() end,
      case when is_past then now() end,
      public.get_site(origin)
    )
    returning * into booking;
  exception when exclusion_violation then
    raise exception 'slot_taken';
  end;

  if nullif(trim(coalesce(stylist_note, '')), '') is not null then
    insert into public.booking_notes (booking_id, note) values (booking.id, trim(stylist_note));
  end if;

  insert into public.booking_events (booking_id, kind, data)
  values (booking.id, 'created_by_stylist', jsonb_build_object(
    'protection', booking.protection_status, 'walk_in', client is null, 'overlap', allow_overlap
  ));

  if protect then
    perform public.send_confirm_link(booking.id, 'confirm_booking', true);
  elsif client is not null then
    perform public.send_studio_booking_notice(booking.id, 'booking_added_by_stylist');
  end if;

  select * into booking from public.bookings where id = booking.id;

  return jsonb_build_object(
    'id', booking.id, 'ref', booking.ref, 'status', booking.status,
    'protection_status', booking.protection_status, 'confirm_by', booking.confirm_by,
    'fee_pence', booking.fee_pence, 'due_pence', booking.due_today_pence, 'confirm_sends', booking.confirm_sends
  );
end;
$$;

/**
 * Studio's "Edit service": service, choices, start, length, extra time, price and add-on prices. While the client
 * still has to confirm, their link is replaced with one for the new terms; once confirmed they're told what changed.
 */
create function public.update_studio_booking(
  target uuid, target_service uuid, choices jsonb, slot_start timestamptz, minutes integer, extra_minutes integer,
  price_pence integer, addons jsonb, price_reason text, allow_overlap boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  stylist public.stylists;
  priced jsonb;
  new_terms jsonb := booking.terms;
  fee integer := booking.fee_pence;
  deadline timestamptz := booking.confirm_by;
  is_awaiting boolean := booking.status = 'awaiting_confirmation';
  is_changed boolean;
  updated public.bookings;
  kept_choices jsonb := case
    when target_service = booking.service_id then coalesce(choices, '{}') || jsonb_build_object(
      'variations', coalesce(booking.choices -> 'variations', '[]'), 'colour', booking.choices -> 'colour'
    )
    else coalesce(choices, '{}')
  end;
begin
  if booking.status not in ('awaiting_confirmation', 'confirmed', 'arrived') then
    raise exception 'edit_not_allowed';
  end if;

  select * into stylist from public.stylists where id = booking.stylist_id;
  priced := public.price_service(target_service, kept_choices, false);

  if (priced ->> 'stylist_id')::uuid <> booking.stylist_id then
    raise exception 'not_found';
  end if;

  if slot_start <> booking.starts_at and (slot_start <= now() or booking.created_at >= booking.starts_at) then
    raise exception 'reschedule_not_allowed';
  end if;

  if minutes not between 5 and 775 or extra_minutes not between 0 and 120 or price_pence not between 0 and 1000000 then
    raise exception 'invalid_booking';
  end if;

  new_terms := new_terms || jsonb_build_object(
    'free_cancel_until',
    slot_start - make_interval(secs => coalesce((new_terms ->> 'free_window_hours')::numeric, 0) * 3600)
  );

  -- nothing is paid until the client confirms, so their deposit and booking fee follow the new price
  if is_awaiting then
    fee := public.booking_fee_pence(price_pence);

    if new_terms ->> 'mode' = 'deposit' then
      new_terms := new_terms || jsonb_build_object(
        'deposit_pence', round(price_pence * (new_terms ->> 'deposit_percent')::numeric / 100.0)
      );
    end if;

    deadline := least(booking.confirm_by, slot_start - interval '2 hours');

    if deadline <= now() then
      raise exception 'too_late_to_protect';
    end if;
  end if;

  begin
    update public.bookings
    set service_id = target_service,
      choices = kept_choices,
      snapshot = public.get_studio_snapshot(priced, addons)
        || jsonb_build_object('price_reason', nullif(trim(coalesce(price_reason, '')), '')),
      price_pence = update_studio_booking.price_pence,
      fee_pence = fee,
      terms = new_terms,
      due_today_pence = case when is_awaiting then public.get_due_pence(new_terms,
        update_studio_booking.price_pence, fee) else due_today_pence end,
      minutes = update_studio_booking.minutes,
      buffer_minutes = extra_minutes,
      status = case when slot_start <> booking.starts_at and status = 'arrived' then 'confirmed' else status end,
      arrived_at = case when slot_start <> booking.starts_at then null else arrived_at end,
      starts_at = slot_start,
      ends_at = slot_start + make_interval(mins => update_studio_booking.minutes),
      block_ends_at = slot_start + make_interval(mins => update_studio_booking.minutes + extra_minutes),
      overlap_ok = allow_overlap,
      confirm_by = deadline
    where id = target
    returning * into updated;
  exception when exclusion_violation then
    raise exception 'slot_taken';
  end;

  is_changed := updated.service_id <> booking.service_id or updated.starts_at <> booking.starts_at
    or updated.price_pence <> booking.price_pence;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'edited', jsonb_build_object(
    'by', 'stylist', 'from', jsonb_build_object('service', booking.service_id, 'starts_at', booking.starts_at,
      'price_pence', booking.price_pence, 'minutes', booking.minutes),
    'to', jsonb_build_object('service', updated.service_id, 'starts_at', updated.starts_at,
      'price_pence', updated.price_pence, 'minutes', updated.minutes)
  ));

  if is_awaiting and (is_changed or updated.due_today_pence <> booking.due_today_pence) then
    update public.bookings set stripe_payment_intent_id = null where id = target;
    perform public.revoke_confirm_links(target);
    perform public.send_confirm_link(target, 'confirm_booking_changed', false);
  elsif not is_awaiting and is_changed then
    perform public.send_studio_booking_notice(target, 'booking_updated_by_stylist');
  end if;

  return jsonb_build_object(
    'fee_pence', updated.fee_pence, 'due_pence', updated.due_today_pence, 'confirm_by', updated.confirm_by
  );
end;
$$;

/**
 * Studio's "Change client" / "Make walk-in". Once the client has paid or saved a card the booking is theirs: cancel
 * it and book again instead. A new client is asked for protection again (or not, if the stylist says so).
 */
create function public.change_booking_client(target uuid, contact jsonb, protect boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  stylist public.stylists;
  client jsonb := case when contact is null then null else public.clean_contact(contact) end;
  new_terms jsonb;
  fee integer;
  deadline timestamptz;
  protection text;
  updated public.bookings;
begin
  if booking.status not in ('awaiting_confirmation', 'confirmed', 'arrived') then
    raise exception 'edit_not_allowed';
  end if;

  if booking.paid_at is not null or booking.stripe_payment_method_id is not null
    or booking.protection_status = 'protected' then
    raise exception 'client_locked';
  end if;

  if protect and (client is null or booking.starts_at <= now()) then
    raise exception 'invalid_booking';
  end if;

  select * into stylist from public.stylists where id = booking.stylist_id;
  new_terms := public.get_studio_terms(stylist.id, booking.starts_at, booking.price_pence, protect);
  fee := case when protect then public.booking_fee_pence(booking.price_pence) else 0 end;

  if protect then
    deadline := public.get_confirm_by(stylist, booking.starts_at, new_terms);
  end if;

  protection := public.get_protection_status(stylist.id, client, protect, booking.starts_at <= now());

  -- the previous client is told their booking is cancelled (they may have its confirmation email)
  if booking.contact ->> 'email' is not null and booking.starts_at > now()
    and booking.contact ->> 'email' is distinct from client ->> 'email' then
    perform public.queue_email(
      booking.contact ->> 'email', 'booking_cancelled_by_stylist',
      public.get_booking_details(target) || jsonb_build_object('cancellation', null, 'fee_pence', booking.fee_pence),
      booking.client_id
    );
  end if;

  -- the previous client's confirm and manage links stop working and can't show the new client's details
  delete from public.booking_tokens where booking_id = target;

  update public.bookings
  set contact = client,
    client_id = null,
    terms = new_terms,
    fee_pence = fee,
    due_today_pence = public.get_due_pence(new_terms, booking.price_pence, fee),
    status = case
      when protect then 'awaiting_confirmation'
      when booking.status = 'awaiting_confirmation' then 'confirmed'
      else booking.status
    end,
    protection_status = protection,
    confirm_by = deadline,
    confirm_sends = 0,
    protection_overridden_at = case when protection = 'overridden' then now() end,
    stripe_customer_id = null,
    stripe_payment_intent_id = null
  where id = target
  returning * into updated;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'client_changed', jsonb_build_object(
    'by', 'stylist', 'walk_in', client is null, 'protection', updated.protection_status
  ));

  if protect then
    perform public.send_confirm_link(target, 'confirm_booking', true);
  elsif client is not null then
    perform public.send_studio_booking_notice(target, 'booking_added_by_stylist');
  end if;

  return jsonb_build_object(
    'status', updated.status, 'protection_status', updated.protection_status, 'confirm_by', updated.confirm_by,
    'fee_pence', updated.fee_pence, 'due_pence', updated.due_today_pence
  );
end;
$$;

/** "Confirm without protection": the stylist confirms an awaiting booking; the client's link stops working. */
create function public.confirm_without_protection(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  new_terms jsonb;
begin
  if booking.status <> 'awaiting_confirmation' or booking.protection_status <> 'pending' then
    raise exception 'status_not_allowed';
  end if;

  new_terms := public.get_studio_terms(booking.stylist_id, booking.starts_at, booking.price_pence, false);

  perform public.revoke_confirm_links(target);

  update public.bookings
  set status = 'confirmed', protection_status = 'overridden', protection_overridden_at = now(), confirm_by = null,
    terms = new_terms, fee_pence = 0, due_today_pence = 0
  where id = target;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'protection_overridden', jsonb_build_object('by', 'stylist', 'user', auth.uid()));

  perform public.send_studio_booking_notice(target, 'booking_added_by_stylist');
end;
$$;

/** "Resend link": a fresh confirm link by email, twice at most after the first; earlier links keep working. */
create function public.resend_confirm_link(target uuid)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
begin
  if booking.status <> 'awaiting_confirmation' or booking.protection_status <> 'pending'
    or booking.confirm_by <= now() or booking.confirm_sends >= 3 then
    raise exception 'resend_not_allowed';
  end if;

  if booking.contact ->> 'email' is null then
    raise exception 'no_email';
  end if;

  perform public.send_confirm_link(target, 'confirm_booking', true);

  insert into public.booking_events (booking_id, kind) values (target, 'confirm_link_resent');

  return booking.confirm_sends + 1;
end;
$$;

/** "Copy link": a confirm link for the stylist to share themselves (no limit). */
create function public.get_confirm_url(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
begin
  if booking.status <> 'awaiting_confirmation' or booking.protection_status <> 'pending'
    or booking.confirm_by <= now() then
    raise exception 'link_not_available';
  end if;

  return booking.site || '/confirm?token=' || public.create_booking_token(target, 'confirm', booking.confirm_by);
end;
$$;

/** "Copy guest management link" (and "Resend" by email when sent): the client's manage page for this booking. */
create function public.get_manage_url(target uuid, send boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  manage_url text;
begin
  if booking.status not in ('confirmed', 'arrived') or booking.contact is null or booking.starts_at <= now() then
    raise exception 'link_not_available';
  end if;

  if send and booking.contact ->> 'email' is null then
    raise exception 'no_email';
  end if;

  manage_url := booking.site || '/manage?token='
    || public.create_booking_token(target, 'manage', booking.starts_at + interval '30 days');

  if send then
    perform public.queue_email(
      booking.contact ->> 'email', 'booking_manage_link',
      public.get_booking_details(target) || jsonb_build_object('manage_url', manage_url), booking.client_id
    );
  end if;

  return manage_url;
end;
$$;

create function public.set_stylist_note(target uuid, note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
begin
  if nullif(trim(coalesce(note, '')), '') is null then
    delete from public.booking_notes where booking_id = booking.id;
  else
    insert into public.booking_notes (booking_id, note) values (booking.id, trim(note))
    on conflict (booking_id) do update set note = excluded.note;
  end if;
end;
$$;

-- An awaiting booking moved: its link is replaced (the time is part of what the client agrees to).
create or replace function public.reschedule_studio_booking(target uuid, slot_start timestamptz, allow_overlap boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  window_hours numeric := coalesce((booking.terms ->> 'free_window_hours')::numeric, 0);
  slot_end timestamptz := slot_start + make_interval(mins => booking.minutes);
  deadline timestamptz := booking.confirm_by;
begin
  -- a booking logged after it started (earlier today) stays where it happened
  if booking.status not in ('awaiting_confirmation', 'confirmed', 'arrived') or slot_start <= now()
    or (booking.created_by = 'stylist' and booking.created_at >= booking.starts_at) then
    raise exception 'reschedule_not_allowed';
  end if;

  if booking.status = 'awaiting_confirmation' then
    deadline := least(booking.confirm_by, slot_start - interval '2 hours');

    if deadline <= now() then
      raise exception 'too_late_to_protect';
    end if;
  end if;

  begin
    update public.bookings
    set status = case when status = 'arrived' then 'confirmed' else status end,
      arrived_at = null,
      overlap_ok = allow_overlap,
      starts_at = slot_start,
      ends_at = slot_end,
      block_ends_at = slot_end + make_interval(mins => booking.buffer_minutes),
      terms = terms || jsonb_build_object('free_cancel_until', slot_start - make_interval(secs => window_hours * 3600)),
      confirm_by = deadline
    where id = target;
  exception when exclusion_violation then
    raise exception 'slot_taken';
  end;

  insert into public.booking_events (booking_id, kind, data)
  values (target, 'rescheduled', jsonb_build_object('from', booking.starts_at, 'to', slot_start, 'by', 'stylist'));

  if booking.status = 'awaiting_confirmation' then
    update public.bookings set stripe_payment_intent_id = null where id = target;
    perform public.revoke_confirm_links(target);
    perform public.send_confirm_link(target, 'confirm_booking_changed', false);
  else
    perform public.queue_booking_change(target, 'booking_moved_by_stylist', null);
  end if;

  return jsonb_build_object('starts_at', slot_start, 'ends_at', slot_end, 'confirm_by', deadline);
end;
$$;

-- The confirm page's view of a link: the booking, what's due, and whether it can still be confirmed.
create function public.get_booking_confirmation(token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  link public.booking_tokens;
  booking public.bookings;
  stylist public.stylists;
  state text;
begin
  select * into link from public.booking_tokens
  where token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8')) and purpose = 'confirm';

  if link.id is null then
    return null;
  end if;

  select * into booking from public.bookings where id = link.booking_id;
  select * into stylist from public.stylists where id = booking.stylist_id;

  state := case
    when booking.status in ('confirmed', 'arrived', 'completed')
      and booking.protection_status in ('protected', 'overridden') then 'confirmed'
    when booking.status <> 'awaiting_confirmation' or booking.protection_status <> 'pending' then 'unavailable'
    when link.used_at is not null then 'changed'
    when link.expires_at <= now() or booking.confirm_by <= now() then 'expired'
    else 'open'
  end;

  return public.get_booking_details(booking.id) - 'client_phone' - 'notes' - 'address_notes' || jsonb_build_object(
    'where', case when state = 'confirmed' then public.get_booking_where(booking.id)
      else public.get_unconfirmed_where(booking.id) end,
    'state', state,
    'terms', booking.terms,
    'price_pence', booking.price_pence,
    'fee_pence', booking.fee_pence,
    'due_pence', booking.due_today_pence,
    'confirm_by', booking.confirm_by,
    'client_first', booking.contact ->> 'first',
    'stylist_slug', stylist.slug
  );
end;
$$;

-- Starting the confirm page's payment: the same quote online checkout gives, with the policy now accepted.
create function public.start_booking_confirmation(token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  state jsonb;
  booking public.bookings;
  stylist public.stylists;
begin
  select bookings.* into booking from public.booking_tokens
  join public.bookings on bookings.id = booking_tokens.booking_id
  where token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8')) and purpose = 'confirm'
  for update of bookings;

  state := public.get_booking_confirmation(token);

  if state is null then
    raise exception 'link_not_valid';
  end if;

  if state ->> 'state' <> 'open' then
    raise exception '%', case state ->> 'state'
      when 'confirmed' then 'already_confirmed'
      when 'changed' then 'confirm_link_changed'
      when 'expired' then 'link_expired'
      else 'booking_unavailable'
    end;
  end if;

  select * into stylist from public.stylists where id = booking.stylist_id;

  update public.bookings set policy_accepted_at = now() where id = booking.id;

  return jsonb_build_object(
    'id', booking.id,
    'ref', booking.ref,
    'mode', booking.terms ->> 'mode',
    'price_pence', booking.price_pence,
    'fee_pence', booking.fee_pence,
    'due_today_pence', booking.due_today_pence,
    'service_name', booking.snapshot ->> 'service_name',
    'starts_at', booking.starts_at,
    'stylist_account', stylist.stripe_account_id,
    'stylist_name', stylist.business_name,
    'customer_id', booking.stripe_customer_id,
    'payment_intent_id', booking.stripe_payment_intent_id,
    'link_version', extract(epoch from booking.confirm_sent_at)::bigint,
    'confirm_sent_at', booking.confirm_sent_at,
    'email', booking.contact ->> 'email',
    'first', booking.contact ->> 'first',
    'last', booking.contact ->> 'last',
    'phone', booking.contact ->> 'phone'
  );
end;
$$;

-- A payment came in. Online bookings as before; a stylist's booking is confirmed if it's still waiting for exactly
-- this amount, and any other payment for it (after an override, a change or a cancel) is refunded.
drop function public.confirm_booking_payment(text);

create function public.confirm_booking_payment(intent text, amount integer default null, target_booking uuid default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
begin
  select * into booking from public.bookings where stripe_payment_intent_id = intent for update;

  if booking.id is null then
    select * into booking from public.bookings where id = target_booking and created_by = 'stylist' for update;

    if booking.id is null then
      raise exception 'booking_not_found';
    end if;

    insert into public.booking_events (booking_id, kind, data)
    values (booking.id, 'payment_not_needed', jsonb_build_object('payment_intent', intent, 'amount', amount));

    return 'refund';
  end if;

  if booking.created_by = 'stylist' then
    if booking.status = 'awaiting_confirmation' and booking.protection_status = 'pending'
      and (amount is null or amount = booking.due_today_pence) then
      update public.bookings
      set status = 'confirmed', protection_status = 'protected', paid_at = now(), confirm_by = null
      where id = booking.id;

      perform public.revoke_confirm_links(booking.id);

      insert into public.booking_events (booking_id, kind, data)
      values (booking.id, 'confirmed', jsonb_build_object('payment_intent', intent, 'by', 'client'));

      begin
        perform public.send_studio_booking_notice(booking.id, 'booking_confirmed_by_client');
      exception when others then
        insert into public.booking_events (booking_id, kind, data)
        values (booking.id, 'messages_failed', jsonb_build_object('error', sqlerrm));
      end;

      return 'confirmed';
    end if;

    if booking.protection_status = 'protected' and booking.paid_at is not null then
      return 'duplicate';
    end if;

    insert into public.booking_events (booking_id, kind, data)
    values (booking.id, 'payment_not_needed', jsonb_build_object('payment_intent', intent, 'amount', amount));

    return 'refund';
  end if;

  if booking.status <> 'held' and booking.status <> 'expired' then
    return 'duplicate';
  end if;

  begin
    update public.bookings
    set status = 'confirmed', paid_at = now(), hold_expires_at = null,
      protection_status = case when terms ->> 'mode' in ('deposit', 'card', 'full') then 'protected' else 'not_required' end
    where id = booking.id;
  exception when exclusion_violation then
    insert into public.booking_events (booking_id, kind) values (booking.id, 'paid_after_slot_taken');

    return 'slot_taken';
  end;

  insert into public.booking_events (booking_id, kind, data)
  values (booking.id, 'confirmed', jsonb_build_object('payment_intent', intent));

  -- a message that can't be queued is logged, never undoing the paid booking
  begin
    perform public.queue_booking_messages(booking.id);
  exception when others then
    insert into public.booking_events (booking_id, kind, data)
    values (booking.id, 'messages_failed', jsonb_build_object('error', sqlerrm));
  end;

  return 'confirmed';
end;
$$;

/** Stylist-made bookings nobody confirmed in time are cancelled (and the stylist warned an hour before). */
create function public.auto_cancel_unconfirmed()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  stylist public.stylists;
  owner_email text;
  preference public.notification_preferences;
  event text;
  details jsonb;
begin
  for booking in
    update public.bookings set auto_cancel_warned_at = now()
    where status = 'awaiting_confirmation' and confirm_by <= now() + interval '1 hour' and confirm_by > now()
      and auto_cancel_warned_at is null and confirm_by - created_at > interval '2 hours'
    returning *
  loop
    event := 'auto_cancel_soon';
    select * into stylist from public.stylists where id = booking.stylist_id;
    select email into owner_email from auth.users where id = stylist.owner_id;
    select * into preference from public.notification_preferences where stylist_id = stylist.id and notification_preferences.event = 'auto_cancel_soon';
    details := public.get_booking_details(booking.id) || jsonb_build_object(
      'confirm_by', booking.confirm_by, 'studio_url', booking.site || '/studio'
    );

    if coalesce(preference.email, true) then
      perform public.queue_email(owner_email, event, details, stylist.owner_id);
    end if;

    if stylist.contact_phone is not null and coalesce(preference.sms, false) then
      perform public.queue_sms(stylist.contact_phone, event, details, stylist.owner_id);
    end if;
  end loop;

  for booking in
    update public.bookings set status = 'auto_cancelled', cancelled_at = now()
    where status = 'awaiting_confirmation' and confirm_by <= now()
    returning *
  loop
    perform public.revoke_confirm_links(booking.id);

    insert into public.booking_events (booking_id, kind) values (booking.id, 'auto_cancelled');

    select * into stylist from public.stylists where id = booking.stylist_id;
    select email into owner_email from auth.users where id = stylist.owner_id;
    select * into preference from public.notification_preferences where stylist_id = stylist.id and notification_preferences.event = 'auto_cancelled';
    details := public.get_booking_details(booking.id) || jsonb_build_object('studio_url', booking.site || '/studio');

    perform public.queue_email(
      booking.contact ->> 'email', 'booking_auto_cancelled',
      details || jsonb_build_object('where', public.get_unconfirmed_where(booking.id)), booking.client_id
    );

    if coalesce(preference.email, true) then
      perform public.queue_email(owner_email, 'auto_cancelled', details, stylist.owner_id);
    end if;

    if stylist.contact_phone is not null and coalesce(preference.sms, false) then
      perform public.queue_sms(stylist.contact_phone, 'auto_cancelled', details, stylist.owner_id);
    end if;
  end loop;
end;
$$;

/** "Send a new link" on an auto-cancelled booking: back to waiting for the client, if the slot is still free. */
create function public.reopen_studio_booking(target uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.lock_own_booking(target);
  stylist public.stylists;
  deadline timestamptz;
begin
  if booking.status <> 'auto_cancelled' then
    raise exception 'status_not_allowed';
  end if;

  select * into stylist from public.stylists where id = booking.stylist_id;
  deadline := public.get_confirm_by(stylist, booking.starts_at, booking.terms);

  begin
    update public.bookings
    set status = 'awaiting_confirmation', cancelled_at = null, confirm_by = deadline, confirm_sends = 0,
      auto_cancel_warned_at = null
    where id = target;
  exception when exclusion_violation then
    raise exception 'slot_taken';
  end;

  insert into public.booking_events (booking_id, kind) values (target, 'reopened');

  perform public.send_confirm_link(target, 'confirm_booking', true);

  return jsonb_build_object('confirm_by', deadline);
end;
$$;

create function public.normalise_phone(phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '^44', '0')
$$;

create or replace function public.get_studio_cancellation(target uuid, owner uuid, who text, waive_fee boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  paid integer;
  terms jsonb;
begin
  select bookings.* into booking
  from public.bookings
  join public.stylists on stylists.id = bookings.stylist_id
  where bookings.id = target and stylists.owner_id = owner;

  if booking.id is null then
    raise exception 'not_found';
  end if;

  if public.is_refund_unfinished(booking, who) then
    return booking.cancellation || jsonb_build_object(
      'id', booking.id, 'payment_intent_id', booking.stripe_payment_intent_id, 'resume', true
    );
  end if;

  if booking.status not in ('awaiting_confirmation', 'confirmed', 'arrived') then
    raise exception 'cannot_cancel';
  end if;

  if booking.status = 'awaiting_confirmation' then
    return jsonb_build_object(
      'is_late', false, 'fee_pence', 0, 'refund_pence', 0, 'kept_pence', 0, 'charge_pence', 0,
      'id', booking.id, 'payment_intent_id', booking.stripe_payment_intent_id
    );
  end if;

  -- only money taken through Stripe can go back
  paid := case
    when booking.paid_at is null or booking.stripe_payment_intent_id is null then 0
    else coalesce(booking.due_today_pence, 0)
  end;

  if who = 'stylist' then
    terms := jsonb_build_object(
      'is_late', false, 'fee_pence', 0, 'refund_pence', paid, 'kept_pence', 0, 'charge_pence', 0,
      'fee_recovery_pence', case when paid > 0 then booking.fee_pence else 0 end
    );
  else
    terms := public.get_cancellation_terms(booking);

    if waive_fee then
      terms := terms || jsonb_build_object(
        'fee_pence', 0,
        'refund_pence', (terms ->> 'refund_pence')::integer + (terms ->> 'kept_pence')::integer,
        'kept_pence', 0,
        'charge_pence', 0,
        'waived', true
      );
    end if;

    if booking.stripe_payment_intent_id is null then
      terms := terms || jsonb_build_object('refund_pence', 0);
    end if;
  end if;

  return terms || jsonb_build_object('id', booking.id, 'payment_intent_id', booking.stripe_payment_intent_id);
end;
$$;

/** For the add-booking warning: a fee this client owes the stylist (by their email or phone), if any. */
create function public.get_client_unpaid_fee(target_stylist uuid, email text, phone text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('booking_id', bookings.id, 'amount_pence', fee.charge_pence, 'kind', fee.kind)
  from public.booking_fees as fee
  join public.bookings on bookings.id = fee.booking_id
  where public.is_stylist_owner(target_stylist) and bookings.stylist_id = target_stylist and fee.status = 'unpaid'
    and (
      (nullif(trim(email), '') is not null and lower(bookings.contact ->> 'email') = lower(trim(email)))
      or (length(public.normalise_phone(phone)) >= 10
        and public.normalise_phone(bookings.contact ->> 'phone') = public.normalise_phone(phone))
    )
  order by fee.created_at desc
  limit 1
$$;

select cron.schedule(
  'expire-booking-holds',
  '* * * * *',
  $$ select public.expire_booking_holds(); select public.auto_cancel_unconfirmed() $$
);

revoke execute on function
  public.get_site(text),
  public.price_service(uuid, jsonb, boolean),
  public.clean_contact(jsonb),
  public.get_studio_terms(uuid, timestamptz, integer, boolean),
  public.get_due_pence(jsonb, integer, integer),
  public.revoke_confirm_links(uuid),
  public.send_confirm_link(uuid, text, boolean),
  public.get_protection_status(uuid, jsonb, boolean, boolean),
  public.get_unconfirmed_where(uuid),
  public.send_studio_booking_notice(uuid, text),
  public.get_confirm_by(public.stylists, timestamptz, jsonb),
  public.get_studio_snapshot(jsonb, jsonb),
  public.create_studio_booking(uuid, jsonb, timestamptz, integer, integer, integer, jsonb, jsonb, jsonb, text, boolean,
    boolean, text),
  public.update_studio_booking(uuid, uuid, jsonb, timestamptz, integer, integer, integer, jsonb, text, boolean),
  public.change_booking_client(uuid, jsonb, boolean),
  public.confirm_without_protection(uuid),
  public.resend_confirm_link(uuid),
  public.get_confirm_url(uuid),
  public.get_manage_url(uuid, boolean),
  public.set_stylist_note(uuid, text),
  public.get_booking_confirmation(text),
  public.start_booking_confirmation(text),
  public.confirm_booking_payment(text, integer, uuid),
  public.auto_cancel_unconfirmed(),
  public.reopen_studio_booking(uuid),
  public.get_client_unpaid_fee(uuid, text, text)
  from public, anon, authenticated;

grant execute on function
  public.create_studio_booking(uuid, jsonb, timestamptz, integer, integer, integer, jsonb, jsonb, jsonb, text, boolean,
    boolean, text),
  public.update_studio_booking(uuid, uuid, jsonb, timestamptz, integer, integer, integer, jsonb, text, boolean),
  public.change_booking_client(uuid, jsonb, boolean),
  public.confirm_without_protection(uuid),
  public.resend_confirm_link(uuid),
  public.get_confirm_url(uuid),
  public.get_manage_url(uuid, boolean),
  public.set_stylist_note(uuid, text),
  public.reopen_studio_booking(uuid),
  public.get_client_unpaid_fee(uuid, text, text)
  to authenticated;

grant execute on function
  public.get_booking_confirmation(text),
  public.start_booking_confirmation(text),
  public.confirm_booking_payment(text, integer, uuid)
  to service_role;
