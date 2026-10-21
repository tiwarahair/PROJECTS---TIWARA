-- a card kept for fees that expires before the appointment: the client is asked for a new one, and the stylist is
-- told if it isn't replaced in time
alter table public.bookings
  add column card_checked_at timestamptz,
  add column card_update_requested_at timestamptz,
  add column card_failed_at timestamptz,
  add column card_setup_intent_id text;

alter table public.booking_tokens drop constraint booking_tokens_purpose_check;
alter table public.booking_tokens
  add constraint booking_tokens_purpose_check check (purpose in ('manage', 'invite', 'secure', 'confirm', 'card'));

-- a moved booking has its card checked again against the new date
create function public.reset_card_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.starts_at is distinct from old.starts_at then
    new.card_checked_at := null;
    new.card_update_requested_at := null;
    new.card_failed_at := null;
  end if;

  return new;
end;
$$;

create trigger bookings_reset_card_check before update of starts_at on public.bookings
for each row execute function public.reset_card_check();

-- deposit and card protection keep the card for fees; checked once, within a week of the appointment
create function public.claim_card_checks(batch_size integer)
returns table (booking_id uuid, payment_method_id text, starts_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select id, stripe_payment_method_id, bookings.starts_at
  from public.bookings
  where status = 'confirmed' and terms ->> 'mode' in ('deposit', 'card') and stripe_payment_method_id is not null
    and card_checked_at is null and bookings.starts_at > now() and bookings.starts_at <= now() + interval '7 days'
  order by bookings.starts_at
  limit batch_size
$$;

-- the stylist's "Payment failed" notice, by email (and text) as they chose
create function public.notify_card_not_replaced(booking public.bookings)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  stylist public.stylists;
  owner_email text;
  preference public.notification_preferences;
  details jsonb := public.get_booking_details(booking.id) || jsonb_build_object('studio_url', booking.site || '/studio');
begin
  select * into stylist from public.stylists where id = booking.stylist_id;
  select email into owner_email from auth.users where id = stylist.owner_id;
  select * into preference from public.notification_preferences
  where stylist_id = stylist.id and event = 'payment_failed';

  if owner_email is not null and coalesce(preference.email, true) then
    perform public.queue_email(owner_email, 'card_not_replaced', details, stylist.owner_id);
  end if;

  if stylist.contact_phone is not null and coalesce(preference.sms, false) then
    perform public.queue_sms(stylist.contact_phone, 'card_not_replaced', details, stylist.owner_id);
  end if;
end;
$$;

create function public.fail_card(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
begin
  update public.bookings set card_failed_at = now() where id = target and card_failed_at is null
  returning * into booking;

  if booking.id is null then
    return;
  end if;

  insert into public.booking_events (booking_id, kind) values (target, 'card_not_replaced');
  perform public.notify_card_not_replaced(booking);
end;
$$;

-- after the check-cards job read the card from Stripe
create function public.save_card_check(target uuid, is_expiring boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
begin
  update public.bookings set card_checked_at = now()
  where id = target and card_checked_at is null and status = 'confirmed'
  returning * into booking;

  if booking.id is null or not is_expiring then
    return;
  end if;

  insert into public.booking_events (booking_id, kind) values (target, 'card_expiring');

  -- nobody to ask: the stylist hears straight away
  if nullif(trim(booking.contact ->> 'email'), '') is null then
    perform public.fail_card(target);

    return;
  end if;

  update public.bookings set card_update_requested_at = now() where id = target;

  perform public.queue_email(
    booking.contact ->> 'email',
    'card_update_needed',
    public.get_booking_details(target) || jsonb_build_object(
      'card_label', booking.card_label,
      'terms', booking.terms,
      'update_by', booking.starts_at - interval '48 hours',
      'update_url', booking.site || '/card?token=' || public.create_booking_token(target, 'card', booking.starts_at)
    ),
    booking.client_id
  );
end;
$$;

-- two days before, a card that wasn't replaced (asked at least 12 hours earlier) leaves the booking unprotected
create function public.fail_unreplaced_cards()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due uuid;
  failed integer := 0;
begin
  for due in
    select id from public.bookings
    where status = 'confirmed' and card_update_requested_at is not null and card_failed_at is null
      and starts_at <= now() + interval '48 hours' and card_update_requested_at <= now() - interval '12 hours'
    for update skip locked
  loop
    perform public.fail_card(due);
    failed := failed + 1;
  end loop;

  return failed;
end;
$$;

-- the update-card page, by the link in the client's email
create function public.get_card_update(token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_booking_details(bookings.id) || jsonb_build_object(
    'booking_id', bookings.id,
    'state', case
      when bookings.status <> 'confirmed' then 'unavailable'
      when bookings.starts_at <= now() then 'expired'
      when bookings.card_update_requested_at is null then 'updated'
      else 'open'
    end,
    'card_label', bookings.card_label,
    'mode', bookings.terms ->> 'mode',
    'customer_id', bookings.stripe_customer_id,
    'setup_intent_id', bookings.card_setup_intent_id
  )
  from public.booking_tokens
  join public.bookings on bookings.id = booking_tokens.booking_id
  where booking_tokens.token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8'))
    and booking_tokens.purpose = 'card' and booking_tokens.expires_at > now()
$$;

create function public.set_card_setup_intent(target uuid, intent text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bookings set card_setup_intent_id = intent where id = target
$$;

-- the new card replaces the old one for fees, and the booking is protected again
create function public.save_card_update(target uuid, intent text, payment_method text, label text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
begin
  update public.bookings
  set stripe_payment_method_id = payment_method, card_label = label, card_update_requested_at = null,
    card_failed_at = null, card_setup_intent_id = null
  where id = target and card_setup_intent_id = intent and status = 'confirmed'
  returning * into booking;

  if booking.id is not null then
    insert into public.booking_events (booking_id, kind, data)
    values (target, 'card_updated', jsonb_build_object('card_label', label));
  end if;
end;
$$;

revoke execute on function
  public.claim_card_checks(integer),
  public.notify_card_not_replaced(public.bookings),
  public.fail_card(uuid),
  public.save_card_check(uuid, boolean),
  public.fail_unreplaced_cards(),
  public.get_card_update(text),
  public.set_card_setup_intent(uuid, text),
  public.save_card_update(uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function
  public.claim_card_checks(integer),
  public.save_card_check(uuid, boolean),
  public.get_card_update(text),
  public.set_card_setup_intent(uuid, text),
  public.save_card_update(uuid, text, text, text)
  to service_role;

select cron.schedule('complete-and-remind', '*/5 * * * *',
  $$select public.complete_past_bookings(); select public.queue_due_reminders(); select public.fail_unreplaced_cards()$$);

-- every hour while a card is due a check
select cron.schedule(
  'check-cards',
  '20 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/check-cards',
    headers := jsonb_build_object(
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
    and exists (select 1 from public.claim_card_checks(1))
  $$
);
