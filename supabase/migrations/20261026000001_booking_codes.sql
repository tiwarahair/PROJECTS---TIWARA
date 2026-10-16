create table public.booking_codes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  code_hash bytea not null,
  attempts smallint not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index booking_codes_booking_id_idx on public.booking_codes (booking_id, created_at desc);

alter table public.booking_codes enable row level security;

create function public.mask_email(email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(email, 1) || '•••@' || split_part(email, '@', 2)
$$;

create function public.hash_booking_code(target uuid, code text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select sha256(convert_to(target::text || ':' || code, 'UTF8'))
$$;

-- sends the outbox now instead of at the next minute, for emails the client is waiting on
create function public.send_notifications_now()
returns void
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
$$;

create function public.send_booking_code(token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.get_booking_by_token(token);
  code text := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  email text := booking.contact ->> 'email';
begin
  if booking.id is null then
    raise exception 'link_not_valid';
  end if;

  if booking.status <> 'confirmed' or booking.starts_at <= now() then
    raise exception 'cannot_change';
  end if;

  -- one request at a time per booking, so a double tap sends one code
  perform 1 from public.bookings where id = booking.id for update;

  if exists (
    select 1 from public.booking_codes
    where booking_id = booking.id and used_at is null and created_at > now() - interval '30 seconds'
  ) then
    return jsonb_build_object('email', public.mask_email(email), 'sent', false);
  end if;

  if (
    select count(*) from public.booking_codes where booking_id = booking.id and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'too_many_codes';
  end if;

  insert into public.booking_codes (booking_id, code_hash, expires_at)
  values (booking.id, public.hash_booking_code(booking.id, code), now() + interval '10 minutes');

  perform public.queue_email(
    email,
    'booking_code',
    public.get_booking_details(booking.id) || jsonb_build_object(
      'code', code,
      'secure_url', booking.site || '/manage?secure='
        || public.create_booking_token(booking.id, 'secure', now() + interval '30 days')
    ),
    booking.client_id
  );

  perform public.send_notifications_now();

  return jsonb_build_object('email', public.mask_email(email), 'sent', true);
end;
$$;

create function public.verify_booking_code(token text, code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := public.get_booking_by_token(token);
  latest public.booking_codes;
begin
  if booking.id is null then
    raise exception 'link_not_valid';
  end if;

  perform 1 from public.bookings where id = booking.id for update;

  select * into latest from public.booking_codes
  where booking_id = booking.id and used_at is null and expires_at > now()
  order by created_at desc
  limit 1;

  if latest.id is null then
    return 'expired';
  end if;

  if latest.attempts >= 5 then
    return 'too_many_attempts';
  end if;

  -- any code still in date works, so an earlier email that arrives late isn't refused
  if not exists (
    select 1 from public.booking_codes
    where booking_id = booking.id and used_at is null and expires_at > now()
      and code_hash = public.hash_booking_code(booking.id, trim(coalesce(code, '')))
  ) then
    update public.booking_codes set attempts = attempts + 1 where id = latest.id;

    return case when latest.attempts + 1 >= 5 then 'too_many_attempts' else 'wrong_code' end;
  end if;

  update public.booking_codes set used_at = now() where booking_id = booking.id and used_at is null;

  update public.booking_tokens set verified_until = now() + interval '15 minutes'
  where token_hash = sha256(convert_to(token, 'UTF8')) and purpose = 'manage';

  return 'verified';
end;
$$;

create function public.secure_booking_link(token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  secure public.booking_tokens;
  booking public.bookings;
begin
  select * into secure from public.booking_tokens
  where token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8')) and purpose = 'secure' and expires_at > now()
  for update;

  if secure.id is null then
    raise exception 'link_not_valid';
  end if;

  if secure.used_at is not null then
    raise exception 'already_used';
  end if;

  select * into booking from public.bookings where id = secure.booking_id;

  update public.booking_tokens set used_at = now() where id = secure.id;

  delete from public.booking_tokens where booking_id = booking.id and purpose = 'manage';

  delete from public.booking_codes where booking_id = booking.id and used_at is null;

  update public.bookings
  set calendar_key = translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_')
  where id = booking.id;

  insert into public.booking_events (booking_id, kind) values (booking.id, 'link_reset');

  perform public.queue_email(
    booking.contact ->> 'email',
    'booking_link_reset',
    public.get_booking_details(booking.id) || jsonb_build_object(
      'manage_url', booking.site || '/manage?token='
        || public.create_booking_token(booking.id, 'manage', booking.starts_at + interval '30 days')
    ),
    booking.client_id
  );

  perform public.send_notifications_now();

  return jsonb_build_object(
    'email', public.mask_email(booking.contact ->> 'email'),
    'stylist_name', (select business_name from public.stylists where id = booking.stylist_id)
  );
end;
$$;

create or replace function public.purge_expired_booking_tokens()
returns integer
language sql
security definer
set search_path = ''
as $$
  with purged_tokens as (
    delete from public.booking_tokens where expires_at < now() - interval '30 days'
    returning 1
  ),
  purged_codes as (
    delete from public.booking_codes where expires_at < now() - interval '1 day'
    returning 1
  )
  select ((select count(*) from purged_tokens) + (select count(*) from purged_codes))::integer
$$;

-- once an email is sent or has finally failed, its links and codes aren't kept
create function public.scrub_sent_notification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.payload := new.payload - array['manage_url', 'save_details_url', 'secure_url', 'code'];

  return new;
end;
$$;

create trigger notifications_scrub_secrets
  before update of status on public.notifications
  for each row
  when (new.status in ('sent', 'failed'))
  execute function public.scrub_sent_notification();

revoke execute on function
  public.scrub_sent_notification(),
  public.mask_email(text),
  public.hash_booking_code(uuid, text),
  public.send_notifications_now(),
  public.send_booking_code(text),
  public.verify_booking_code(text, text),
  public.secure_booking_link(text)
  from public, anon, authenticated;

grant execute on function
  public.send_booking_code(text),
  public.verify_booking_code(text, text),
  public.secure_booking_link(text)
  to anon, authenticated;
