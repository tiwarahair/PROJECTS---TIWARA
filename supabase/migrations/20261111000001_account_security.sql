alter table public.profiles add column login_alerts boolean not null default true;

grant update (login_alerts) on public.profiles to authenticated;

-- devices that have signed in, kept after their session ends so a returning device isn't "new"; by name ("Mac ·
-- Chrome") so a browser update doesn't count as a new device
create table public.login_devices (
  user_id uuid not null references auth.users (id) on delete cascade,
  device text not null,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, device)
);

alter table public.login_devices enable row level security;

create function public.get_device_label(user_agent text)
returns text
language sql
immutable
set search_path = ''
as $$
  select concat_ws(' · ',
    case
      when user_agent ~ 'iPhone' then 'iPhone'
      when user_agent ~ 'iPad' then 'iPad'
      when user_agent ~ 'Android' then 'Android'
      when user_agent ~ 'CrOS' then 'Chromebook'
      when user_agent ~ 'Macintosh|Mac OS X' then 'Mac'
      when user_agent ~ 'Windows' then 'Windows'
      when user_agent ~ 'Linux' then 'Linux'
      else 'Unknown device'
    end,
    case
      when user_agent ~ 'Edg(A|iOS)?/' then 'Edge'
      when user_agent ~ 'OPR/' then 'Opera'
      when user_agent ~ 'SamsungBrowser' then 'Samsung Internet'
      when user_agent ~ 'Firefox|FxiOS' then 'Firefox'
      when user_agent ~ 'Chrome|CriOS' then 'Chrome'
      when user_agent ~ 'Safari' then 'Safari'
    end
  )
$$;

create function public.get_device_kind(user_agent text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when user_agent ~ 'iPhone|Android.*Mobile' then 'phone'
    when user_agent ~ 'iPad|Android' then 'tablet'
    else 'laptop'
  end
$$;

/** Settings → Security: the caller's own sign-ins (the one making the request first) and their alerts setting. */
create function public.get_account_security()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select sessions.*, greatest(sessions.updated_at, sessions.refreshed_at at time zone 'UTC') as active_at,
      sessions.id::text = auth.jwt() ->> 'session_id' as is_current
    from auth.sessions
    where sessions.user_id = auth.uid() and (sessions.not_after is null or sessions.not_after > now())
  )
  select jsonb_build_object(
    'login_alerts', coalesce((select login_alerts from public.profiles where id = auth.uid()), true),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', mine.id,
        'device', public.get_device_label(mine.user_agent),
        'kind', public.get_device_kind(mine.user_agent),
        'signed_in_at', mine.created_at,
        'active_at', mine.active_at,
        'is_current', mine.is_current
      ) order by mine.is_current desc, mine.active_at desc)
      from mine
    ), '[]')
  )
$$;

-- ends one of the caller's other sign-ins (its refresh tokens go with it; Supabase drops them on cascade)
create function public.sign_out_session(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target::text = auth.jwt() ->> 'session_id' then
    raise exception 'current_session';
  end if;

  delete from auth.sessions where id = target and user_id = auth.uid();
end;
$$;

-- a stylist signing in on a device the account hasn't used for 90 days is emailed (not on their very first sign-in)
create function public.note_login_device()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  label text := public.get_device_label(new.user_agent);
  is_known boolean;
  is_first boolean;
begin
  select not exists (select 1 from public.login_devices where user_id = new.user_id),
    exists (
      select 1 from public.login_devices
      where user_id = new.user_id and device = label
        and last_seen_at > now() - interval '90 days'
    )
  into is_first, is_known;

  insert into public.login_devices (user_id, device) values (new.user_id, label)
  on conflict (user_id, device) do update set last_seen_at = now();

  if is_first or is_known then
    return new;
  end if;

  if exists (
    select 1 from public.profiles join public.stylists on stylists.owner_id = profiles.id
    where profiles.id = new.user_id and profiles.login_alerts
  ) then
    perform public.queue_email(
      (select email from auth.users where id = new.user_id), 'login_alert',
      jsonb_build_object('device', label, 'signed_in_at', new.created_at), new.user_id
    );
  end if;

  return new;
-- an alert is never worth blocking a sign-in
exception when others then
  raise warning 'login alert skipped: %', sqlerrm;

  return new;
end;
$$;

create trigger sessions_note_login_device after insert on auth.sessions
for each row execute function public.note_login_device();

insert into public.login_devices (user_id, device, last_seen_at)
select user_id, public.get_device_label(user_agent), max(greatest(updated_at, refreshed_at at time zone 'UTC'))
from auth.sessions
group by 1, 2;

revoke execute on function
  public.get_device_label(text),
  public.get_device_kind(text),
  public.get_account_security(),
  public.sign_out_session(uuid),
  public.note_login_device()
  from public, anon, authenticated;

grant execute on function public.get_account_security(), public.sign_out_session(uuid) to authenticated;
