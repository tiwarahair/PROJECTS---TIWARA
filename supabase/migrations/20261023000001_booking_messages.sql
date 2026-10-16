create table public.booking_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  purpose text not null check (purpose in ('manage', 'invite', 'secure')),
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  verified_until timestamptz,
  created_at timestamptz not null default now()
);

create index booking_tokens_booking_id_idx on public.booking_tokens (booking_id);

alter table public.booking_tokens enable row level security;

alter table public.bookings add column site text not null default 'https://www.tiwarashouse.com';

create function public.queue_sms(to_address text, template text, payload jsonb, user_id uuid default null)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, channel, to_address, template, payload)
  values (queue_sms.user_id, 'sms', queue_sms.to_address, queue_sms.template, queue_sms.payload)
  returning id
$$;

create function public.mark_notification_failed_now(notification_id uuid, error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications set status = 'failed', last_error = error
  where id = notification_id and status = 'sending'
$$;

create function public.create_booking_token(target uuid, purpose text, expires_at timestamptz)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
begin
  insert into public.booking_tokens (booking_id, purpose, token_hash, expires_at)
  values (target, create_booking_token.purpose, sha256(convert_to(token, 'UTF8')), create_booking_token.expires_at);

  return token;
end;
$$;

create function public.get_booking_where(target uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when stylists.business_type = 'mobile'
      then concat_ws(', ', bookings.address ->> 'line1', nullif(bookings.address ->> 'line2', ''), bookings.address ->> 'postcode')
    else concat_ws(', ', stylists.business_name, place.line1, nullif(place.line2, ''), place.city, place.postcode)
  end
  from public.bookings
  join public.stylists on stylists.id = bookings.stylist_id
  left join public.stylist_private as place on place.stylist_id = stylists.id
  where bookings.id = target
$$;

create function public.get_booking_details(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ref', bookings.ref,
    'service_name', bookings.snapshot ->> 'service_name',
    'stylist_name', stylists.business_name,
    'starts_at', bookings.starts_at,
    'ends_at', bookings.ends_at,
    'is_mobile', stylists.business_type = 'mobile',
    'where', public.get_booking_where(bookings.id),
    'client_name', concat_ws(' ', bookings.contact ->> 'first', bookings.contact ->> 'last'),
    'client_phone', bookings.contact ->> 'phone',
    'notes', bookings.notes,
    'address_notes', nullif(bookings.address ->> 'notes', '')
  )
  from public.bookings
  join public.stylists on stylists.id = bookings.stylist_id
  where bookings.id = target
$$;

create function public.queue_booking_messages(target uuid)
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
  details jsonb;
  manage_url text;
begin
  select * into booking from public.bookings where id = target;
  select * into stylist from public.stylists where id = booking.stylist_id;
  select email into owner_email from auth.users where id = stylist.owner_id;
  select * into preference from public.notification_preferences where stylist_id = stylist.id and event = 'new_booking';

  manage_url := booking.site || '/manage?token='
    || public.create_booking_token(booking.id, 'manage', booking.starts_at + interval '30 days');

  details := public.get_booking_details(booking.id);

  perform public.queue_email(
    booking.contact ->> 'email',
    'booking_confirmed',
    details || jsonb_build_object(
      'terms', booking.terms,
      'price_pence', booking.price_pence,
      'fee_pence', booking.fee_pence,
      'paid_pence', booking.due_today_pence,
      'manage_url', manage_url,
      'save_details_url', case when booking.client_id is null then booking.site || '/save-details?token='
        || public.create_booking_token(booking.id, 'invite', now() + interval '24 hours') end
    ),
    booking.client_id
  );

  if owner_email is not null and coalesce(preference.email, true) then
    perform public.queue_email(
      owner_email, 'new_booking', details || jsonb_build_object('studio_url', booking.site || '/studio'), stylist.owner_id
    );
  end if;

  if stylist.contact_phone is not null and coalesce(preference.sms, false) then
    perform public.queue_sms(stylist.contact_phone, 'new_booking', details, stylist.owner_id);
  end if;
end;
$$;

create or replace function public.confirm_booking_payment(intent text)
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
    raise exception 'booking_not_found';
  end if;

  if booking.status <> 'held' and booking.status <> 'expired' then
    return 'duplicate';
  end if;

  begin
    update public.bookings
    set status = 'confirmed', paid_at = now(), hold_expires_at = null
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

revoke execute on function
  public.queue_sms(text, text, jsonb, uuid),
  public.mark_notification_failed_now(uuid, text),
  public.create_booking_token(uuid, text, timestamptz),
  public.get_booking_where(uuid),
  public.get_booking_details(uuid),
  public.queue_booking_messages(uuid)
  from public, anon, authenticated;

grant execute on function
  public.queue_sms(text, text, jsonb, uuid),
  public.mark_notification_failed_now(uuid, text)
  to service_role;
