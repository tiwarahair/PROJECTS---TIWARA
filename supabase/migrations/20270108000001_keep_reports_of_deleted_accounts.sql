alter table public.review_reports
  drop constraint review_reports_reporter_id_fkey,
  alter column reporter_id drop not null,
  add constraint review_reports_reporter_id_fkey
    foreign key (reporter_id) references auth.users (id) on delete set null;

create or replace function public.admin_get_reports(tab text, sort text default 'oldest', page integer default 0)
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
            'reporter_deleted', reports.reporter_id is null,
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
