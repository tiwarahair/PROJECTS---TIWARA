-- Admin (Phase 7c part 1): admins decide on reported reviews, both sides can appeal once, every action is logged.
-- Admins are flagged by SQL (app_metadata.is_admin) and must have entered a two-step code this session.

-- 'hidden': hidden while an admin checks it (harmful reports hide a review straight away)
alter table public.reviews drop constraint reviews_status_check;
alter table public.reviews
  add constraint reviews_status_check check (status in ('published', 'text_removed', 'removed', 'hidden')),
  -- what a hidden review goes back to if it's kept
  add column status_before_hidden text check (status_before_hidden in ('published', 'text_removed'));

create index reviews_hidden_idx on public.reviews (created_at) where status = 'hidden';
create index review_reports_open_created_idx on public.review_reports (created_at) where status = 'open';

alter table public.booking_tokens drop constraint booking_tokens_purpose_check;
alter table public.booking_tokens
  add constraint booking_tokens_purpose_check
  check (purpose in ('manage', 'invite', 'secure', 'confirm', 'card', 'review', 'appeal'));

insert into public.reserved_slugs (slug) values ('appeal') on conflict do nothing;

-- every admin action, newest first; the Action log page reads this
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in (
    'review_kept', 'review_text_removed', 'review_removed', 'review_hidden', 'appeal_kept', 'appeal_changed',
    'profile_checked', 'stylist_suspended', 'stylist_unsuspended'
  )),
  review_id uuid references public.reviews (id) on delete set null,
  stylist_id uuid references public.stylists (id) on delete set null,
  note text not null check (char_length(note) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index admin_actions_created_at_idx on public.admin_actions (created_at desc);
create index admin_actions_admin_id_idx on public.admin_actions (admin_id, created_at desc);
create index admin_actions_stylist_id_idx on public.admin_actions (stylist_id, created_at desc);

alter table public.admin_actions enable row level security;

-- one row per decision on a review; the latest is the one that stands
create table public.review_decisions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  admin_id uuid references auth.users (id) on delete set null,
  outcome text not null check (outcome in ('kept', 'text_removed', 'removed', 'hidden')),
  note text not null check (char_length(note) between 1 and 1000),
  -- made when answering an appeal: can't be appealed again
  is_final boolean not null default false,
  -- clock time, so two decisions in one transaction still have an order
  created_at timestamptz not null default clock_timestamp()
);

create index review_decisions_review_id_idx on public.review_decisions (review_id, created_at desc);
create index review_decisions_created_at_idx on public.review_decisions (created_at desc);

alter table public.review_decisions enable row level security;

-- the reviewer and the stylist can each appeal a decision once, within 14 days
create table public.review_appeals (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.review_decisions (id) on delete cascade,
  review_id uuid not null references public.reviews (id) on delete cascade,
  appellant text not null check (appellant in ('reviewer', 'stylist')),
  body text not null check (char_length(body) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'kept', 'changed')),
  answered_by uuid references auth.users (id) on delete set null,
  answer_note text check (char_length(answer_note) between 1 and 1000),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (decision_id, appellant)
);

create index review_appeals_open_idx on public.review_appeals (created_at) where status = 'open';
create index review_appeals_review_id_idx on public.review_appeals (review_id);

alter table public.review_appeals enable row level security;

-- an admin with a two-step code entered this session
create function public.is_admin_session()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.is_admin() and public.is_aal2()
$$;

-- TO DO: send individually to admins instead of the general email
create function public.get_admin_alert_email()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'info@tiwarashouse.com'
$$;

-- weekdays only, in UK time
create function public.add_working_days(start timestamptz, days integer)
returns timestamptz
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  result timestamptz := start;
  added integer := 0;
begin
  while added < days loop
    result := result + interval '1 day';

    if extract(isodow from result at time zone 'Europe/London') < 6 then
      added := added + 1;
    end if;
  end loop;

  return result;
end;
$$;

create function public.is_harmful_reason(reason text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select reason in ('abusive', 'personal_info', 'threat')
$$;

-- reviews count unless they're removed or hidden while checked; other reports no longer stop a review counting
create or replace function public.is_review_counted(review public.reviews)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select review.status in ('published', 'text_removed')
$$;

-- a harmful report hides the review straight away and alerts the admins
create or replace function public.report_review(target uuid, reason text, details text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  review public.reviews;
  booking public.bookings;
  report_id uuid;
begin
  select * into review from public.reviews where id = target and status <> 'removed';

  if auth.uid() is null or review.id is null then
    raise exception 'review_not_found';
  end if;

  if review.client_id = auth.uid() then
    raise exception 'own_review';
  end if;

  insert into public.review_reports (review_id, reporter_id, is_stylist, reason, details)
  values (target, auth.uid(), public.is_stylist_owner(review.stylist_id), reason, nullif(trim(details), ''))
  on conflict (review_id, reporter_id) do nothing
  returning id into report_id;

  if report_id is null then
    return 'already_reported';
  end if;

  if public.is_harmful_reason(reason) and review.status in ('published', 'text_removed') then
    update public.reviews set status = 'hidden', status_before_hidden = review.status where id = target;

    select * into booking from public.bookings where id = review.booking_id;

    perform public.queue_email(
      public.get_admin_alert_email(), 'admin_report_alert',
      jsonb_build_object(
        'reason', reason,
        'stylist_name', (select business_name from public.stylists where id = review.stylist_id),
        'rating', review.rating,
        'admin_url', booking.site || '/admin'
      )
    );
  end if;

  return 'reported';
end;
$$;

-- the emails a decision sends: the reviewer (words or review removed, with an appeal link), the stylist, and any
-- clients who reported it
create function public.notify_review_decision(target uuid, outcome text, is_final boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  review public.reviews;
  booking public.bookings;
  stylist public.stylists;
  owner_email text;
  appeal_until timestamptz := now() + interval '14 days';
  reason text;
  stylist_reported boolean;
  decision_details jsonb;
begin
  select * into review from public.reviews where id = target;
  select * into booking from public.bookings where id = review.booking_id;
  select * into stylist from public.stylists where id = review.stylist_id;
  select email into owner_email from auth.users where id = stylist.owner_id;

  select review_reports.reason into reason from public.review_reports
  where review_id = target group by review_reports.reason order by count(*) desc, min(created_at) limit 1;

  stylist_reported := exists (select 1 from public.review_reports where review_id = target and is_stylist);

  decision_details := public.get_booking_details(booking.id) || jsonb_build_object(
    'outcome', outcome,
    'reason', reason,
    'rating', review.rating,
    'appeal_until', case when is_final then null else appeal_until end
  );

  if outcome in ('text_removed', 'removed') then
    perform public.queue_email(
      booking.contact ->> 'email', 'review_decision_reviewer',
      decision_details || jsonb_build_object(
        'client_first', booking.contact ->> 'first',
        'appeal_url', case when is_final then null else booking.site || '/appeal?token='
          || public.create_booking_token(booking.id, 'appeal', appeal_until) end
      ),
      booking.client_id
    );
  end if;

  perform public.queue_email(
    owner_email, 'review_decision_stylist',
    decision_details || jsonb_build_object(
      'can_appeal', not is_final and stylist_reported and outcome in ('kept', 'text_removed'),
      'studio_url', booking.site || '/studio'
    ),
    stylist.owner_id
  );

  perform public.queue_email(users.email, 'review_report_outcome', decision_details, users.id)
  from public.review_reports
  join auth.users on users.id = review_reports.reporter_id
  where review_reports.review_id = target and not review_reports.is_stylist;
end;
$$;

-- sets the review's status, closes its open reports (unless it's only hidden), records and logs the decision
create function public.apply_review_decision(target uuid, outcome text, note text, is_final boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  review public.reviews;
  decision_id uuid;
  clean_note text := nullif(trim(note), '');
begin
  if outcome not in ('kept', 'text_removed', 'removed', 'hidden') then
    raise exception 'invalid_outcome';
  end if;

  if clean_note is null then
    raise exception 'note_required';
  end if;

  select * into review from public.reviews where id = target for update;

  if review.id is null then
    raise exception 'review_not_found';
  end if;

  update public.reviews
  set status = case outcome
      when 'kept' then case when review.status = 'hidden' then coalesce(review.status_before_hidden, 'published')
        else 'published' end
      else outcome
    end,
    status_before_hidden = case
      when outcome <> 'hidden' then null
      when review.status in ('published', 'text_removed') then review.status
      else review.status_before_hidden
    end
  where id = target;

  insert into public.review_decisions (review_id, admin_id, outcome, note, is_final)
  values (target, auth.uid(), outcome, clean_note, is_final)
  returning id into decision_id;

  if outcome <> 'hidden' then
    update public.review_reports
    set status = case outcome when 'kept' then 'kept' else outcome end, decided_by = auth.uid(), decided_at = now()
    where review_id = target and status = 'open';
  end if;

  return decision_id;
end;
$$;

create function public.admin_decide_review(target uuid, outcome text, note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  stylist_id uuid;
begin
  if not public.is_admin_session() then
    raise exception 'not_allowed';
  end if;

  perform public.apply_review_decision(target, outcome, note, false);

  select reviews.stylist_id into stylist_id from public.reviews where id = target;

  insert into public.admin_actions (admin_id, kind, review_id, stylist_id, note)
  values (auth.uid(), 'review_' || outcome, target, stylist_id, trim(note));

  if outcome <> 'hidden' then
    perform public.notify_review_decision(target, outcome, false);
  end if;
end;
$$;

-- who may appeal the latest decision on a review, and until when
create function public.get_appeal_state(target uuid, appellant text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'decision_id', decision.id,
    'outcome', decision.outcome,
    'decided_at', decision.created_at,
    'appeal_until', decision.created_at + interval '14 days',
    'state', case
      when exists (
        select 1 from public.review_appeals where decision_id = decision.id and review_appeals.appellant = get_appeal_state.appellant
      ) then 'appealed'
      when decision.is_final or decision.created_at < now() - interval '14 days' then 'closed'
      when appellant = 'reviewer' and decision.outcome in ('text_removed', 'removed') then 'open'
      when appellant = 'stylist' and decision.outcome in ('kept', 'text_removed')
        and exists (select 1 from public.review_reports where review_id = target and is_stylist) then 'open'
      else 'closed'
    end
  )
  from (
    select * from public.review_decisions
    where review_id = target and outcome <> 'hidden'
    order by created_at desc limit 1
  ) as decision
$$;

-- the stylist appeals from Studio
create function public.appeal_review_decision(target uuid, body text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  review public.reviews;
  appeal jsonb;
begin
  select * into review from public.reviews where id = target;

  if review.id is null or not public.is_stylist_owner(review.stylist_id) then
    raise exception 'review_not_found';
  end if;

  if nullif(trim(body), '') is null then
    raise exception 'appeal_required';
  end if;

  appeal := public.get_appeal_state(target, 'stylist');

  if appeal is null or appeal ->> 'state' <> 'open' then
    return coalesce(appeal ->> 'state', 'closed');
  end if;

  insert into public.review_appeals (decision_id, review_id, appellant, body)
  values ((appeal ->> 'decision_id')::uuid, target, 'stylist', trim(body))
  on conflict do nothing;

  return 'appealed';
end;
$$;

-- the reviewer's appeal page, by the link in their decision email
create function public.get_appeal_page(token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'review_id', reviews.id,
    'stylist_name', stylists.business_name,
    'service_name', bookings.snapshot ->> 'service_name',
    'starts_at', bookings.starts_at,
    'client_first', bookings.contact ->> 'first',
    'rating', reviews.rating,
    'outcome', appeal ->> 'outcome',
    'decided_at', appeal ->> 'decided_at',
    'appeal_until', appeal ->> 'appeal_until',
    'state', coalesce(appeal ->> 'state', 'closed')
  )
  from public.booking_tokens
  join public.bookings on bookings.id = booking_tokens.booking_id
  join public.reviews on reviews.booking_id = bookings.id
  join public.stylists on stylists.id = bookings.stylist_id
  cross join lateral public.get_appeal_state(reviews.id, 'reviewer') as appeal
  where booking_tokens.token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8'))
    and booking_tokens.purpose = 'appeal' and booking_tokens.expires_at > now()
$$;

create function public.submit_appeal(token text, body text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  page jsonb := public.get_appeal_page(token);
  appeal jsonb;
begin
  if page is null then
    return 'link_not_valid';
  end if;

  if page ->> 'state' <> 'open' then
    return page ->> 'state';
  end if;

  if nullif(trim(body), '') is null or char_length(trim(body)) > 1000 then
    return 'invalid';
  end if;

  appeal := public.get_appeal_state((page ->> 'review_id')::uuid, 'reviewer');

  insert into public.review_appeals (decision_id, review_id, appellant, body)
  values ((appeal ->> 'decision_id')::uuid, (page ->> 'review_id')::uuid, 'reviewer', trim(body))
  on conflict do nothing;

  return 'appealed';
end;
$$;

-- keep the decision, or replace it with a final one; both sides are told
create function public.admin_answer_appeal(target uuid, outcome text, note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  appeal public.review_appeals;
  review public.reviews;
  booking public.bookings;
  owner_email text;
  details jsonb;
  is_kept boolean := outcome = 'keep';
  result text;
begin
  if not public.is_admin_session() then
    raise exception 'not_allowed';
  end if;

  if nullif(trim(note), '') is null then
    raise exception 'note_required';
  end if;

  select * into appeal from public.review_appeals where id = target and status = 'open' for update;

  if appeal.id is null then
    raise exception 'appeal_not_found';
  end if;

  if is_kept then
    update public.review_decisions set is_final = true where id = appeal.decision_id;
    select review_decisions.outcome into result from public.review_decisions where id = appeal.decision_id;
  else
    if outcome = 'hidden' then
      raise exception 'invalid_outcome';
    end if;

    perform public.apply_review_decision(appeal.review_id, outcome, note, true);
    result := outcome;
  end if;

  update public.review_appeals
  set status = case when is_kept then 'kept' else 'changed' end,
    answered_by = auth.uid(), answer_note = trim(note), answered_at = now()
  where id = target;

  select * into review from public.reviews where id = appeal.review_id;
  select * into booking from public.bookings where id = review.booking_id;
  select email into owner_email from auth.users
  where id = (select owner_id from public.stylists where id = review.stylist_id);

  insert into public.admin_actions (admin_id, kind, review_id, stylist_id, note)
  values (auth.uid(), case when is_kept then 'appeal_kept' else 'appeal_changed' end, review.id, review.stylist_id,
    trim(note));

  details := public.get_booking_details(booking.id) || jsonb_build_object(
    'outcome', result, 'is_changed', not is_kept, 'appellant', appeal.appellant
  );

  perform public.queue_email(
    booking.contact ->> 'email', 'review_appeal_answered',
    details || jsonb_build_object('audience', 'reviewer', 'client_first', booking.contact ->> 'first'),
    booking.client_id
  );

  perform public.queue_email(
    owner_email, 'review_appeal_answered',
    details || jsonb_build_object('audience', 'stylist', 'studio_url', booking.site || '/studio'),
    (select owner_id from public.stylists where id = review.stylist_id)
  );
end;
$$;

-- when a review's open report or appeal is due: harmful 24 hours, everything else 5 working days
create function public.get_review_due_at(target uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select public.add_working_days(min(created_at), 5) from public.review_appeals
      where review_id = target and status = 'open'),
    (select case when bool_or(public.is_harmful_reason(reason)) then min(created_at) + interval '24 hours'
        else public.add_working_days(min(created_at), 5) end
      from public.review_reports where review_id = target and status = 'open')
  )
$$;

-- the Reports page's stats, tab counts and the sidebar badge
create function public.admin_get_report_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with open_reviews as (
    select distinct review_id from public.review_reports where status = 'open'
  ),
  waiting as (
    select review_id from open_reviews
    union
    select review_id from public.review_appeals where status = 'open'
  )
  select jsonb_build_object(
    'open', (select count(*) from open_reviews),
    'hidden', (select count(*) from public.reviews where status = 'hidden'),
    'appealed', (select count(distinct review_id) from public.review_appeals where status = 'open'),
    'decided', (
      select count(distinct review_id) from public.review_decisions
      where outcome <> 'hidden' and review_id not in (select review_id from waiting)
    ),
    'decided_this_week', (
      select count(*) from public.review_decisions
      where outcome <> 'hidden' and created_at > now() - interval '7 days'
    ),
    'overdue', (select count(*) from waiting where public.get_review_due_at(waiting.review_id) < now())
  )
  where public.is_admin_session()
$$;

-- one page (20) of reported reviews for a tab: open, hidden, appealed or decided
create function public.admin_get_reports(tab text, sort text default 'oldest', page integer default 0)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with picked as (
    select reviews.id,
      case tab
        when 'appealed' then (select min(created_at) from public.review_appeals
          where review_id = reviews.id and status = 'open')
        when 'decided' then (select max(created_at) from public.review_decisions
          where review_id = reviews.id and outcome <> 'hidden')
        else (select min(created_at) from public.review_reports where review_id = reviews.id and status = 'open')
      end as sort_at
    from public.reviews
    where case tab
      when 'open' then exists (select 1 from public.review_reports where review_id = reviews.id and status = 'open')
      when 'hidden' then reviews.status = 'hidden'
      when 'appealed' then exists (select 1 from public.review_appeals where review_id = reviews.id and status = 'open')
      when 'decided' then exists (select 1 from public.review_decisions where review_id = reviews.id and outcome <> 'hidden')
        and not exists (select 1 from public.review_reports where review_id = reviews.id and status = 'open')
        and not exists (select 1 from public.review_appeals where review_id = reviews.id and status = 'open')
      else false
    end
  ),
  shown as (
    select picked.* from picked
    order by
      case when sort = 'newest' then picked.sort_at end desc,
      picked.sort_at,
      picked.id
    limit 20 offset greatest(page, 0) * 20
  )
  select jsonb_build_object(
    'total', (select count(*) from picked),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', reviews.id,
        'rating', reviews.rating,
        'body', reviews.body,
        'status', reviews.status,
        'created_at', reviews.created_at,
        'service_name', bookings.snapshot ->> 'service_name',
        'client_name', case when bookings.contact ? 'account_deleted' then 'Former client'
          else concat_ws(' ', bookings.contact ->> 'first', bookings.contact ->> 'last') end,
        'stylist_id', stylists.id,
        'stylist_name', stylists.business_name,
        'stylist_slug', stylists.slug,
        'sort_at', shown.sort_at,
        'due_at', public.get_review_due_at(reviews.id),
        'reports', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'reason', reports.reason,
            'details', reports.details,
            'is_stylist', reports.is_stylist,
            'reporter_name', case when reports.is_stylist then null
              else concat_ws(' ', profiles.first_name, profiles.last_name) end,
            'status', reports.status,
            'created_at', reports.created_at
          ) order by reports.created_at), '[]')
          from public.review_reports as reports
          left join public.profiles on profiles.id = reports.reporter_id
          where reports.review_id = reviews.id
        ),
        'decision', (
          select jsonb_build_object(
            'outcome', decisions.outcome,
            'note', decisions.note,
            'admin_name', concat_ws(' ', profiles.first_name, profiles.last_name),
            'created_at', decisions.created_at
          )
          from public.review_decisions as decisions
          left join public.profiles on profiles.id = decisions.admin_id
          where decisions.review_id = reviews.id and decisions.outcome <> 'hidden'
          order by decisions.created_at desc limit 1
        ),
        'appeal', (
          select jsonb_build_object(
            'id', appeals.id,
            'appellant', appeals.appellant,
            'body', appeals.body,
            'created_at', appeals.created_at
          )
          from public.review_appeals as appeals
          where appeals.review_id = reviews.id and appeals.status = 'open'
          order by appeals.created_at limit 1
        )
      ) order by
        case when sort = 'newest' then shown.sort_at end desc,
        shown.sort_at,
        shown.id)
      from shown
      join public.reviews on reviews.id = shown.id
      join public.bookings on bookings.id = reviews.booking_id
      join public.stylists on stylists.id = reviews.stylist_id
    ), '[]')
  )
  where public.is_admin_session()
$$;

-- 9am UK summary to the admin address when anything is waiting (runs hourly; sends once a day)
create function public.send_admin_report_summary()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  open_count integer;
  overdue_count integer;
  appeal_count integer;
begin
  if extract(hour from now() at time zone 'Europe/London') <> 9 then
    return false;
  end if;

  if exists (
    select 1 from public.notifications
    where template = 'admin_report_summary'
      and (created_at at time zone 'Europe/London')::date = (now() at time zone 'Europe/London')::date
  ) then
    return false;
  end if;

  select count(distinct review_id) into open_count from public.review_reports where status = 'open';
  select count(*) into appeal_count from public.review_appeals where status = 'open';

  select count(*) into overdue_count from (
    select review_id from public.review_reports where status = 'open'
    union
    select review_id from public.review_appeals where status = 'open'
  ) as waiting
  where public.get_review_due_at(waiting.review_id) < now();

  if open_count + appeal_count = 0 then
    return false;
  end if;

  perform public.queue_email(
    public.get_admin_alert_email(), 'admin_report_summary',
    jsonb_build_object(
      'open', open_count, 'overdue', overdue_count, 'appeals', appeal_count,
      -- the newest booking's site, so staging links to staging
      'admin_url', coalesce((select site from public.bookings order by created_at desc limit 1),
        'https://www.tiwarashouse.com') || '/admin'
    )
  );

  return true;
end;
$$;

-- public reviews: a hidden one shows as "being checked" with no stars or words
create or replace function public.get_stylist_reviews(lookup text, page integer default 0, page_size integer default 10)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with stylist as (
    select stylists.id from public.stylists
    where stylists.id = coalesce(
        (select id from public.stylists where slug = lookup::extensions.citext),
        (select stylist_id from public.stylist_slug_history where slug = lookup::extensions.citext)
      )
      and (stylists.status in ('live', 'paused') or stylists.owner_id = auth.uid())
  ),
  visible as (
    select reviews.* from public.reviews
    join stylist on stylist.id = reviews.stylist_id
    where reviews.status <> 'removed'
  ),
  shown as (
    select visible.*, bookings.contact, bookings.snapshot ->> 'service_name' as service_name
    from visible
    join public.bookings on bookings.id = visible.booking_id
    order by visible.created_at desc, visible.id
    limit least(greatest(page_size, 1), 20)
    offset greatest(page, 0) * least(greatest(page_size, 1), 20)
  )
  select jsonb_build_object(
    'total', (select count(*) from visible),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', shown.id,
        'rating', case when shown.status <> 'hidden' then shown.rating end,
        'body', case when shown.status = 'published' then shown.body end,
        'is_text_removed', shown.status = 'text_removed',
        'is_checking', shown.status = 'hidden',
        'author', public.get_reviewer_name(shown.contact),
        'is_former', shown.contact ? 'account_deleted',
        'service_name', shown.service_name,
        'created_at', shown.created_at,
        'reply', case when shown.status <> 'hidden' then shown.reply end,
        'replied_at', shown.replied_at,
        'is_reply_edited', shown.reply_edited_at is not null,
        'is_mine', shown.client_id is not null and shown.client_id = auth.uid()
      ) order by shown.created_at desc, shown.id)
      from shown
    ), '[]')
  )
$$;

-- Studio's Reviews tab: every review, removed ones too, with what was decided and whether the stylist can appeal
create or replace function public.get_studio_reviews(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_stylist_rating(target) || jsonb_build_object('reviews', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', reviews.id,
      'booking_id', reviews.booking_id,
      'ref', bookings.ref,
      'rating', reviews.rating,
      'body', case when reviews.status = 'published' then reviews.body end,
      'status', reviews.status,
      'is_text_removed', reviews.status = 'text_removed',
      'client_name', case when bookings.contact ? 'account_deleted' then 'Former client'
        else concat_ws(' ', bookings.contact ->> 'first', bookings.contact ->> 'last') end,
      'is_former', bookings.contact ? 'account_deleted',
      'stylist_client_id', bookings.stylist_client_id,
      'service_name', bookings.snapshot ->> 'service_name',
      'starts_at', bookings.starts_at,
      'created_at', reviews.created_at,
      'reply', reviews.reply,
      'replied_at', reviews.replied_at,
      'is_reply_edited', reviews.reply_edited_at is not null,
      'is_counted', public.is_review_counted(reviews),
      'is_checking', exists (select 1 from public.review_reports where review_id = reviews.id and status = 'open'),
      'is_reported', exists (
        select 1 from public.review_reports where review_id = reviews.id and reporter_id = auth.uid()
      ),
      'decision', appeal ->> 'outcome',
      'appeal_state', appeal ->> 'state',
      'appeal_until', appeal ->> 'appeal_until'
    ) order by reviews.created_at desc, reviews.id)
    from public.reviews
    join public.bookings on bookings.id = reviews.booking_id
    left join lateral public.get_appeal_state(reviews.id, 'stylist') as appeal on true
    where reviews.stylist_id = target
  ), '[]'))
  where public.is_stylist_owner(target)
$$;

-- Studio's activity feed also lists decisions and answered appeals on the stylist's reviews
create or replace function public.get_studio_activity(target uuid, max_rows integer)
returns table (
  id text, kind text, at timestamptz, booking_id uuid, client_first text, service text, amount_pence integer,
  is_unread boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with items as (
    -- when it was confirmed (paid, or nothing to pay), not when its hold started
    select 'booking:' || bookings.id as id, 'new_booking' as kind, coalesce(bookings.paid_at, bookings.created_at) as at,
      bookings.id as booking_id,
      null::integer as amount_pence
    from public.bookings
    where bookings.stylist_id = target and bookings.created_by = 'client' and bookings.status not in ('held', 'expired')

    union all

    select 'event:' || events.id,
      case events.kind
        when 'confirmed' then 'client_confirmed'
        when 'cancelled' then 'client_cancelled'
        when 'rescheduled' then 'client_rescheduled'
        when 'fee_settled' then 'fee_' || (events.data ->> 'outcome')
        else events.kind
      end,
      events.created_at, events.booking_id, payments.amount_pence
    from public.booking_events as events
    join public.bookings on bookings.id = events.booking_id
    left join public.payments
      on payments.stripe_payment_intent_id = coalesce(events.data ->> 'payment_intent', events.data ->> 'payment_intent_id')
    where bookings.stylist_id = target
      and (
        -- a cancellation the stylist recorded for the client is their own action
        (events.kind in ('confirmed', 'cancelled', 'rescheduled') and events.data ->> 'by' = 'client'
          and not events.data ? 'recorded_by')
        or (events.kind = 'fee_settled' and events.data ->> 'outcome' in ('paid', 'unpaid'))
        or events.kind in ('auto_cancelled', 'fee_paid_by_link', 'balance_paid_by_link')
      )

    union all

    select 'dispute:' || disputes.id, 'dispute_opened', disputes.created_at, disputes.booking_id, disputes.amount_pence
    from public.disputes
    where disputes.stylist_id = target

    union all

    select 'payout:' || payouts.id, 'payout_' || payouts.status, payouts.status_at, null,
      payouts.amount_pence
    from public.payouts
    where payouts.stylist_id = target and payouts.status in ('paid', 'failed')

    union all

    select 'review:' || reviews.id, 'review_received', reviews.created_at, reviews.booking_id, null
    from public.reviews
    where reviews.stylist_id = target and reviews.status <> 'removed'

    union all

    select 'decision:' || decisions.id, 'review_' || decisions.outcome, decisions.created_at, reviews.booking_id, null
    from public.review_decisions as decisions
    join public.reviews on reviews.id = decisions.review_id
    where reviews.stylist_id = target and decisions.outcome <> 'hidden'

    union all

    select 'appeal:' || appeals.id, 'appeal_' || appeals.status, appeals.answered_at, reviews.booking_id, null
    from public.review_appeals as appeals
    join public.reviews on reviews.id = appeals.review_id
    where reviews.stylist_id = target and appeals.status <> 'open'
  )
  select items.id, items.kind, items.at, items.booking_id, bookings.contact ->> 'first',
    bookings.snapshot ->> 'service_name', items.amount_pence,
    items.at > coalesce(private.activity_seen_at, '-infinity')
  from items
  left join public.bookings on bookings.id = items.booking_id
  left join public.stylist_private as private on private.stylist_id = target
  where public.is_stylist_owner(target)
  order by items.at desc
  limit max_rows
$$;

revoke execute on function
  public.is_admin_session(),
  public.get_admin_alert_email(),
  public.add_working_days(timestamptz, integer),
  public.is_harmful_reason(text),
  public.notify_review_decision(uuid, text, boolean),
  public.apply_review_decision(uuid, text, text, boolean),
  public.admin_decide_review(uuid, text, text),
  public.get_appeal_state(uuid, text),
  public.appeal_review_decision(uuid, text),
  public.get_appeal_page(text),
  public.submit_appeal(text, text),
  public.admin_answer_appeal(uuid, text, text),
  public.get_review_due_at(uuid),
  public.admin_get_report_stats(),
  public.admin_get_reports(text, text, integer),
  public.send_admin_report_summary()
  from public, anon, authenticated;

grant execute on function public.get_appeal_page(text), public.submit_appeal(text, text) to service_role;

grant execute on function
  public.admin_decide_review(uuid, text, text),
  public.admin_answer_appeal(uuid, text, text),
  public.admin_get_report_stats(),
  public.admin_get_reports(text, text, integer),
  public.appeal_review_decision(uuid, text)
  to authenticated;

select cron.schedule('admin-report-summary', '0 * * * *', $$select public.send_admin_report_summary()$$);
