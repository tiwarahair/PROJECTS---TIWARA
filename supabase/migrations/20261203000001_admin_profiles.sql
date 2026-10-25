-- Admin part 2: Profiles (checks, notes, mark as checked), suspend and unsuspend, and the action log.

alter table public.stylists
  add column went_live_at timestamptz,
  add column suspended_at timestamptz,
  add column suspend_reason text check (char_length(suspend_reason) <= 1000);

update public.stylists
set went_live_at = created_at
where status in ('live', 'paused', 'suspended') and went_live_at is null;

-- several actions in one transaction still keep their order in the log
alter table public.admin_actions alter column created_at set default clock_timestamp();

create index stylists_went_live_idx on public.stylists (went_live_at desc) where went_live_at is not null;

create function public.stamp_went_live()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'live' and new.went_live_at is null then
    new.went_live_at := now();
  end if;

  return new;
end;
$$;

create trigger stylists_went_live
  before update of status on public.stylists
  for each row execute function public.stamp_went_live();

-- only an admin lifts a suspension: closing and reopening the business leaves it suspended
create function public.keep_suspended()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.suspended_at is not null and new.status not in ('suspended', 'closed') then
    new.status := 'suspended';
  end if;

  return new;
end;
$$;

create trigger stylists_keep_suspended
  before update of status on public.stylists
  for each row execute function public.keep_suspended();

create table public.admin_profile_checks (
  stylist_id uuid primary key references public.stylists (id) on delete cascade,
  checked_at timestamptz,
  checked_by uuid references auth.users (id) on delete set null,
  -- flags seen when it was checked; a new flag shows it under "Has flags" again
  checked_flags text[] not null default '{}',
  note text not null default '' check (char_length(note) <= 2000),
  note_updated_at timestamptz,
  note_updated_by uuid references auth.users (id) on delete set null
);

alter table public.admin_profile_checks enable row level security;

-- staging links to staging: the site of the newest booking
create function public.get_site_url()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select site from public.bookings order by created_at desc limit 1),
    'https://www.tiwarashouse.com'
  )
$$;

-- every phone and email in use, and whose it is: a business's contact details, or an account's own
create function public.get_contact_uses()
returns table (kind text, value text, stylist_id uuid, account_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select 'phone', nullif(public.normalise_phone(stylist.contact_phone), ''), stylist.id, stylist.owner_id
  from public.stylists as stylist
  union all
  select 'phone', nullif(public.normalise_phone(profile.phone), ''), owned.id, profile.id
  from public.profiles as profile
  left join public.stylists as owned on owned.owner_id = profile.id
  union all
  select 'email', lower(stylist.contact_email), stylist.id, stylist.owner_id
  from public.stylists as stylist
  union all
  select 'email', lower(account.email), owned.id, account.id
  from auth.users as account
  left join public.stylists as owned on owned.owner_id = account.id
$$;

-- the same phone or email used by another business or account
create function public.get_contact_clashes()
returns table (stylist_id uuid, kind text, other_name text)
language sql
stable
security definer
set search_path = ''
as $$
  with uses as (select * from public.get_contact_uses() where value is not null)
  select distinct own.stylist_id, own.kind, coalesce(other_stylist.business_name, 'another account')
  from uses as own
  join uses as other on other.kind = own.kind and other.value = own.value
    and other.account_id is distinct from own.account_id
    and other.stylist_id is distinct from own.stylist_id
  left join public.stylists as other_stylist on other_stylist.id = other.stylist_id
  where own.stylist_id is not null
$$;

-- each active service's "from" price beside the usual (median) for its type across live businesses;
-- only a price over twice the usual is flagged, once 10 live services of that type set what's usual
create function public.get_service_prices()
returns table (stylist_id uuid, name text, from_pence integer, usual_pence integer, is_outlier boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with priced as (
    select service.stylist_id, service.name, service.service_type_id, stylist.status,
      public.service_from_pence(service.id) as from_pence
    from public.services as service
    join public.stylists as stylist on stylist.id = service.stylist_id
    where service.status = 'active'
  ),
  usual as (
    select service_type_id, percentile_cont(0.5) within group (order by from_pence) as median, count(*) as sample
    from priced
    where status = 'live' and service_type_id is not null
    group by service_type_id
  )
  select priced.stylist_id, priced.name, priced.from_pence, round(usual.median)::integer,
    coalesce(usual.sample >= 10 and priced.from_pence > usual.median * 2, false)
  from priced
  left join usual using (service_type_id)
$$;

create function public.get_contact_matches(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'name', other_name) order by kind, other_name), '[]')
  from public.get_contact_clashes()
  where stylist_id = target
$$;

create function public.get_price_outliers(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', name, 'from_pence', from_pence, 'usual_pence', usual_pence
  ) order by name), '[]')
  from public.get_service_prices()
  where stylist_id = target and is_outlier
$$;

create function public.is_stripe_verified(stylist public.stylists)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(stylist.charges_enabled and stylist.payouts_enabled and stylist.stripe_requirements = 'none', false)
$$;

-- one row per profile Admin sees: everyone who has gone live, or is suspended. Every check runs once for all of them.
create function public.get_admin_profile_rows()
returns table (
  id uuid, slug text, business_name text, owner_name text, area_label text, cover_path text, status text,
  went_live_at timestamptz, suspended_at timestamptz, flags text[], new_flags text[], checked_at timestamptz,
  checked_by_name text, stripe_state text, service_count integer, min_pence integer, max_pence integer,
  photo_count integer, booking_count integer, cancelled_count integer, review_count integer, rating numeric,
  reported_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with shown as (
    select *
    from public.stylists
    where status <> 'closed' and (went_live_at is not null or status = 'suspended')
  ),
  clashes as (select distinct stylist_id from public.get_contact_clashes()),
  prices as (
    select stylist_id, count(*)::integer as service_count, min(from_pence) as min_pence,
      max(from_pence) as max_pence, bool_or(is_outlier) as has_outlier
    from public.get_service_prices()
    where stylist_id in (select id from shown)
    group by stylist_id
  ),
  photos as (
    select stylist_id, count(*)::integer as photo_count
    from public.portfolio_photos
    where stylist_id in (select id from shown)
    group by stylist_id
  ),
  booked as (
    select stylist_id,
      count(*) filter (where status not in ('held', 'expired'))::integer as booking_count,
      count(*) filter (where status in ('cancelled', 'auto_cancelled'))::integer as cancelled_count
    from public.bookings
    where stylist_id in (select id from shown)
    group by stylist_id
  ),
  rated as (
    select review.stylist_id, count(*)::integer as review_count, avg(review.rating) as average
    from public.reviews as review
    where review.stylist_id in (select id from shown) and public.is_review_counted(review)
    group by review.stylist_id
  ),
  reported as (
    select review.stylist_id, count(distinct report.review_id)::integer as reported_count
    from public.review_reports as report
    join public.reviews as review on review.id = report.review_id
    where review.stylist_id in (select id from shown)
    group by review.stylist_id
  ),
  flagged as (
    select shown.id, array_remove(array[
      case when not public.is_stripe_verified(shown) then 'stripe' end,
      case when shown.id in (select stylist_id from clashes) then 'contact' end,
      case when coalesce(prices.has_outlier, false) then 'prices' end,
      case when coalesce(photos.photo_count, 0) < 6 then 'photos' end
    ], null) as list
    from shown
    left join prices on prices.stylist_id = shown.id
    left join photos on photos.stylist_id = shown.id
  )
  select shown.id, shown.slug::text, shown.business_name,
    trim(concat_ws(' ', profile.first_name, profile.last_name)),
    shown.area_label, shown.cover_path, shown.status, shown.went_live_at, shown.suspended_at,
    flagged.list,
    array(select unnest(flagged.list) except select unnest(coalesce(checks.checked_flags, '{}'))),
    checks.checked_at,
    trim(concat_ws(' ', checker.first_name, checker.last_name)),
    case
      when shown.stripe_account_id is null then 'none'
      when shown.stripe_requirements <> 'none' or not shown.details_submitted then 'action'
      when public.is_stripe_verified(shown) then 'active'
      else 'verifying'
    end,
    coalesce(prices.service_count, 0), prices.min_pence, prices.max_pence,
    coalesce(photos.photo_count, 0),
    coalesce(booked.booking_count, 0), coalesce(booked.cancelled_count, 0),
    coalesce(rated.review_count, 0),
    case when rated.review_count >= 3 then round(rated.average, 1) end,
    coalesce(reported.reported_count, 0)
  from shown
  join flagged on flagged.id = shown.id
  left join public.profiles as profile on profile.id = shown.owner_id
  left join public.admin_profile_checks as checks on checks.stylist_id = shown.id
  left join public.profiles as checker on checker.id = checks.checked_by
  left join prices on prices.stylist_id = shown.id
  left join photos on photos.stylist_id = shown.id
  left join booked on booked.stylist_id = shown.id
  left join rated on rated.stylist_id = shown.id
  left join reported on reported.stylist_id = shown.id
$$;

create function public.get_profile_flags(target uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select flags from public.get_admin_profile_rows() where id = target
$$;

create function public.admin_get_profile_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
-- these plans look costly but run in milliseconds; compiling them (JIT) took over a second
set jit = off
as $$
  with rows as (select * from public.get_admin_profile_rows())
  select jsonb_build_object(
    'all', count(*),
    'not_checked', count(*) filter (where checked_at is null and status <> 'suspended'),
    'oldest_waiting', min(went_live_at) filter (where checked_at is null and status <> 'suspended'),
    'flagged', count(*) filter (where cardinality(new_flags) > 0 and status <> 'suspended'),
    'multi_flagged', count(*) filter (where cardinality(new_flags) > 1 and status <> 'suspended'),
    'stripe', count(*) filter (where stripe_state <> 'active' and status <> 'suspended'),
    'live', count(*) filter (where status in ('live', 'paused')),
    'suspended', count(*) filter (where status = 'suspended')
  )
  from rows
  where public.is_admin_session()
$$;

create function public.admin_get_profiles(
  tab text, went_live text default 'any', sort text default 'flags', search text default '', page integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
set jit = off
as $$
  with matched as (
    select *
    from public.get_admin_profile_rows() as row
    where public.is_admin_session()
      and case tab
        when 'not' then row.checked_at is null and row.status <> 'suspended'
        when 'flags' then cardinality(row.new_flags) > 0 and row.status <> 'suspended'
        when 'stripe' then row.stripe_state <> 'active' and row.status <> 'suspended'
        when 'suspended' then row.status = 'suspended'
        else true
      end
      and case went_live
        when 'week' then row.went_live_at >= now() - interval '7 days'
        when 'month' then row.went_live_at >= now() - interval '30 days'
        else true
      end
      and (coalesce(search, '') = '' or concat_ws(' ', row.business_name, row.owner_name, row.area_label)
        ilike '%' || replace(replace(replace(search, '\', '\\'), '%', '\%'), '_', '\_') || '%')
  ),
  ordered as (
    select *
    from matched
    order by
      case when sort = 'flags' then cardinality(flags) end desc nulls last,
      case when sort = 'bookings' then booking_count end desc nulls last,
      case when sort = 'oldest' then went_live_at end asc nulls last,
      went_live_at desc nulls last,
      id
    limit 21 offset greatest(page, 0) * 20
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(ordered)) from (select * from ordered limit 20) as ordered), '[]'),
    'has_more', (select count(*) > 20 from ordered)
  )
$$;

create function public.admin_get_profile(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
set jit = off
as $$
  select to_jsonb(row) || jsonb_build_object(
    'owner_email', account.email,
    'owner_phone', profile.phone,
    'contact_email', stylist.contact_email,
    'contact_phone', stylist.contact_phone,
    'stripe_account_id', stylist.stripe_account_id,
    'suspend_reason', stylist.suspend_reason,
    'suspended_by', (
      select trim(concat_ws(' ', admin.first_name, admin.last_name))
      from public.admin_actions as action
      left join public.profiles as admin on admin.id = action.admin_id
      where action.stylist_id = stylist.id and action.kind = 'stylist_suspended'
      order by action.created_at desc
      limit 1
    ),
    'note', coalesce(checks.note, ''),
    'contact_matches', public.get_contact_matches(stylist.id),
    'price_outliers', public.get_price_outliers(stylist.id)
  )
  from public.get_admin_profile_rows() as row
  join public.stylists as stylist on stylist.id = row.id
  left join public.profiles as profile on profile.id = stylist.owner_id
  left join auth.users as account on account.id = stylist.owner_id
  left join public.admin_profile_checks as checks on checks.stylist_id = stylist.id
  where row.id = target and public.is_admin_session()
$$;

create function public.admin_save_profile_note(target uuid, note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin_session() then
    raise exception 'not_allowed';
  end if;

  insert into public.admin_profile_checks (stylist_id, note, note_updated_at, note_updated_by)
  values (target, trim(note), now(), auth.uid())
  on conflict (stylist_id) do update
    set note = excluded.note, note_updated_at = excluded.note_updated_at, note_updated_by = excluded.note_updated_by;
end;
$$;

create function public.admin_mark_profile_checked(target uuid, note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_note text := trim(coalesce(note, ''));
begin
  if not public.is_admin_session() then
    raise exception 'not_allowed';
  end if;

  if clean_note = '' then
    raise exception 'note_required';
  end if;

  insert into public.admin_profile_checks (stylist_id, checked_at, checked_by, checked_flags, note, note_updated_at, note_updated_by)
  values (target, now(), auth.uid(), public.get_profile_flags(target), clean_note, now(), auth.uid())
  on conflict (stylist_id) do update
    set checked_at = excluded.checked_at, checked_by = excluded.checked_by, checked_flags = excluded.checked_flags,
      note = excluded.note, note_updated_at = excluded.note_updated_at, note_updated_by = excluded.note_updated_by;

  insert into public.admin_actions (admin_id, kind, stylist_id, note)
  values (auth.uid(), 'profile_checked', target, left(clean_note, 1000));
end;
$$;

create function public.notify_suspension(target uuid, is_suspended boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  select public.queue_email(
    account.email,
    case when is_suspended then 'stylist_suspended' else 'stylist_unsuspended' end,
    jsonb_build_object(
      'first_name', profile.first_name,
      'business_name', stylist.business_name,
      'reason', stylist.suspend_reason,
      'studio_url', public.get_site_url() || '/studio'
    ),
    stylist.owner_id
  )
  from public.stylists as stylist
  left join public.profiles as profile on profile.id = stylist.owner_id
  left join auth.users as account on account.id = stylist.owner_id
  where stylist.id = target
$$;

create function public.admin_suspend_stylist(target uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_reason text := trim(coalesce(reason, ''));
begin
  if not public.is_admin_session() then
    raise exception 'not_allowed';
  end if;

  if clean_reason = '' then
    raise exception 'note_required';
  end if;

  update public.stylists
  set status = 'suspended', suspended_at = now(), suspend_reason = left(clean_reason, 1000)
  where id = target and status not in ('suspended', 'closed');

  if not found then
    raise exception 'not_suspendable';
  end if;

  insert into public.admin_actions (admin_id, kind, stylist_id, note)
  values (auth.uid(), 'stylist_suspended', target, left(clean_reason, 1000));

  perform public.notify_suspension(target, true);
end;
$$;

create function public.admin_unsuspend_stylist(target uuid, note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_note text := trim(coalesce(note, ''));
begin
  if not public.is_admin_session() then
    raise exception 'not_allowed';
  end if;

  if clean_note = '' then
    raise exception 'note_required';
  end if;

  update public.stylists
  set status = 'draft', suspended_at = null, suspend_reason = null
  where id = target and status = 'suspended';

  if not found then
    raise exception 'not_suspended';
  end if;

  -- back to live only if it still meets every go-live rule
  perform public.refresh_go_live(target);

  insert into public.admin_actions (admin_id, kind, stylist_id, note)
  values (auth.uid(), 'stylist_unsuspended', target, left(clean_note, 1000));

  perform public.notify_suspension(target, false);
end;
$$;

create function public.admin_get_actions(
  by_admin uuid default null, kind_group text default 'all', for_stylist uuid default null, search text default '',
  page integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
set jit = off
as $$
  with matched as (
    select action.id, action.kind, action.note, action.created_at, action.review_id, action.stylist_id,
      action.admin_id,
      trim(concat_ws(' ', admin_profile.first_name, admin_profile.last_name)) as admin_name,
      coalesce(stylist.business_name, review_stylist.business_name) as stylist_name,
      coalesce(stylist.id, review_stylist.id) as target_stylist_id,
      case when booking.contact ? 'account_deleted' then 'Former client'
        else concat_ws(' ', booking.contact ->> 'first', booking.contact ->> 'last') end as reviewer_name
    from public.admin_actions as action
    left join public.profiles as admin_profile on admin_profile.id = action.admin_id
    left join public.reviews as review on review.id = action.review_id
    left join public.stylists as review_stylist on review_stylist.id = review.stylist_id
    left join public.stylists as stylist on stylist.id = action.stylist_id
    left join public.bookings as booking on booking.id = review.booking_id
    where public.is_admin_session()
      and (by_admin is null or action.admin_id = by_admin)
      and case kind_group
        when 'reviews' then action.review_id is not null
        when 'profiles' then action.review_id is null
        else true
      end
      and (for_stylist is null or coalesce(action.stylist_id, review.stylist_id) = for_stylist)
      and (coalesce(search, '') = '' or concat_ws(' ', action.note, admin_profile.first_name, admin_profile.last_name,
        stylist.business_name, review_stylist.business_name, booking.contact ->> 'first', booking.contact ->> 'last') ilike '%' || replace(replace(replace(search, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    order by action.created_at desc, action.id
    limit 21 offset greatest(page, 0) * 20
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(matched)) from (select * from matched limit 20) as matched), '[]'),
    'has_more', (select count(*) > 20 from matched)
  )
$$;

create function public.admin_get_action_filters()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'admins', coalesce((
      select jsonb_agg(jsonb_build_object('id', admin.id, 'name', admin.name) order by admin.name)
      from (
        select distinct action.admin_id as id, trim(concat_ws(' ', profile.first_name, profile.last_name)) as name
        from public.admin_actions as action
        join public.profiles as profile on profile.id = action.admin_id
      ) as admin
    ), '[]'),
    'stylists', coalesce((
      select jsonb_agg(jsonb_build_object('id', target.id, 'name', target.name) order by target.name)
      from (
        select distinct stylist.id, stylist.business_name as name
        from public.admin_actions as action
        left join public.reviews as review on review.id = action.review_id
        join public.stylists as stylist on stylist.id = coalesce(action.stylist_id, review.stylist_id)
      ) as target
    ), '[]')
  )
  where public.is_admin_session()
$$;

revoke execute on function
  public.stamp_went_live(),
  public.keep_suspended(),
  public.get_site_url(),
  public.get_contact_uses(),
  public.get_contact_clashes(),
  public.get_service_prices(),
  public.get_contact_matches(uuid),
  public.get_price_outliers(uuid),
  public.is_stripe_verified(public.stylists),
  public.get_profile_flags(uuid),
  public.get_admin_profile_rows(),
  public.notify_suspension(uuid, boolean),
  public.admin_get_profile_stats(),
  public.admin_get_profiles(text, text, text, text, integer),
  public.admin_get_profile(uuid),
  public.admin_save_profile_note(uuid, text),
  public.admin_mark_profile_checked(uuid, text),
  public.admin_suspend_stylist(uuid, text),
  public.admin_unsuspend_stylist(uuid, text),
  public.admin_get_actions(uuid, text, uuid, text, integer),
  public.admin_get_action_filters()
  from public, anon, authenticated;

grant execute on function
  public.admin_get_profile_stats(),
  public.admin_get_profiles(text, text, text, text, integer),
  public.admin_get_profile(uuid),
  public.admin_save_profile_note(uuid, text),
  public.admin_mark_profile_checked(uuid, text),
  public.admin_suspend_stylist(uuid, text),
  public.admin_unsuspend_stylist(uuid, text),
  public.admin_get_actions(uuid, text, uuid, text, integer),
  public.admin_get_action_filters()
  to authenticated;
