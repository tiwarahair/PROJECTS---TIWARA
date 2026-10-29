-- "Decided this week" counted decision rows, so a decision changed on appeal counted twice and a re-reported review still counted;
-- it now counts the Decided tab's reviews whose decision is from the last 7 days
create or replace function public.admin_get_report_stats()
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
  ),
  decided as (
    select review_id, max(created_at) as decided_at from public.review_decisions
    where outcome <> 'hidden' and review_id not in (select review_id from waiting)
    group by review_id
  )
  select jsonb_build_object(
    'open', (select count(*) from open_reviews),
    'hidden', (select count(*) from public.reviews where status = 'hidden'),
    'appealed', (select count(distinct review_id) from public.review_appeals where status = 'open'),
    'decided', (select count(*) from decided),
    'decided_this_week', (select count(*) from decided where decided_at > now() - interval '7 days'),
    'overdue', (select count(*) from waiting where public.get_review_due_at(waiting.review_id) < now())
  )
  where public.is_admin_session()
$$;
