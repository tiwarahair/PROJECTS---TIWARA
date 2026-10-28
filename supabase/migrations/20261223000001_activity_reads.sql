-- a notification opened on its own is read, without marking everything older read too
create table public.stylist_activity_reads (
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  item_id text not null,
  read_at timestamptz not null default now(),
  primary key (stylist_id, item_id)
);

alter table public.stylist_activity_reads enable row level security;

create function public.mark_activity_read(target uuid, item text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.stylist_activity_reads (stylist_id, item_id)
  select target, item
  where public.is_stylist_owner(target)
  on conflict do nothing
$$;

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
      and not exists (
        select 1 from public.stylist_activity_reads as reads
        where reads.stylist_id = target and reads.item_id = items.id
      )
  from items
  left join public.bookings on bookings.id = items.booking_id
  left join public.stylist_private as private on private.stylist_id = target
  where public.is_stylist_owner(target)
  order by items.at desc
  limit max_rows
$$;

revoke execute on function public.mark_activity_read(uuid, text) from public, anon, authenticated;
grant execute on function public.mark_activity_read(uuid, text) to authenticated;
