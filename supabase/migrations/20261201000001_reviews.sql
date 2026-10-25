-- reviews: one per completed booking, invited by email 2 hours after it's completed and reminded once 3 days later;
-- not editable; the stylist can reply (and edit the reply); anyone signed in can report one
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  client_id uuid references public.profiles (id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  body text check (char_length(body) between 1 and 1000),
  status text not null default 'published' check (status in ('published', 'text_removed', 'removed')),
  reply text check (char_length(reply) between 1 and 1000),
  replied_at timestamptz,
  reply_edited_at timestamptz,
  created_at timestamptz not null default now()
);

create index reviews_stylist_id_created_at_idx on public.reviews (stylist_id, created_at desc);
create index reviews_client_id_idx on public.reviews (client_id);

alter table public.reviews enable row level security;

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  is_stylist boolean not null,
  reason text not null check (reason in ('abusive', 'personal_info', 'conflict', 'spam', 'threat', 'other')),
  details text check (char_length(details) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'kept', 'text_removed', 'removed')),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);

create index review_reports_reporter_id_idx on public.review_reports (reporter_id);
create index review_reports_open_idx on public.review_reports (review_id) where status = 'open';

alter table public.review_reports enable row level security;

create table public.review_invites (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  sent_at timestamptz not null default now(),
  reminded_at timestamptz
);

alter table public.review_invites enable row level security;

-- the review page's path
insert into public.reserved_slugs (slug) values ('review') on conflict do nothing;

alter table public.booking_tokens drop constraint booking_tokens_purpose_check;
alter table public.booking_tokens
  add constraint booking_tokens_purpose_check
  check (purpose in ('manage', 'invite', 'secure', 'confirm', 'card', 'review'));

-- a review counts toward the rating unless it was removed or a report about it is still open
create function public.is_review_counted(review public.reviews)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select review.status <> 'removed'
    and not exists (select 1 from public.review_reports where review_id = review.id and status = 'open')
$$;

-- no rating until 3 reviews count
create function public.get_stylist_rating(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'rating', case when count(*) >= 3 then round(avg(reviews.rating), 1) end,
    'review_count', count(*)
  )
  from public.reviews
  where reviews.stylist_id = target and public.is_review_counted(reviews)
$$;

-- first name and last initial; an anonymised booking shows no name
create function public.get_reviewer_name(contact jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when contact ? 'account_deleted' or nullif(trim(contact ->> 'first'), '') is null then 'Former client'
    else concat_ws(' ', trim(contact ->> 'first'), nullif(upper(left(trim(contact ->> 'last'), 1)) || '.', '.'))
  end
$$;

create function public.queue_review_invite(target uuid, template text)
returns void
language sql
security definer
set search_path = ''
as $$
  select public.queue_email(
    bookings.contact ->> 'email',
    template,
    public.get_booking_details(bookings.id) || jsonb_build_object(
      'client_first', bookings.contact ->> 'first',
      'expires_at', bookings.completed_at + interval '30 days',
      'review_url', bookings.site || '/review?token='
        || public.create_booking_token(bookings.id, 'review', bookings.completed_at + interval '30 days')
    ),
    bookings.client_id
  )
  from public.bookings
  where bookings.id = target
$$;

-- every completed booking with an email: invited 2 hours after it's completed (a checkout undone within 10 minutes
-- is never invited), reminded once 3 days later if there's no review yet
create function public.send_review_invites()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  invited uuid;
  sent integer := 0;
begin
  for invited in
    insert into public.review_invites (booking_id)
    select bookings.id from public.bookings
    where bookings.status = 'completed'
      and bookings.completed_at <= now() - interval '2 hours'
      and bookings.completed_at > now() - interval '7 days'
      and nullif(trim(bookings.contact ->> 'email'), '') is not null
      and not exists (select 1 from public.review_invites where booking_id = bookings.id)
      and not exists (select 1 from public.reviews where booking_id = bookings.id)
    on conflict do nothing
    returning booking_id
  loop
    perform public.queue_review_invite(invited, 'review_invite');
    sent := sent + 1;
  end loop;

  for invited in
    update public.review_invites set reminded_at = now()
    from public.bookings
    where bookings.id = review_invites.booking_id
      and review_invites.reminded_at is null
      and review_invites.sent_at <= now() - interval '3 days'
      and bookings.status = 'completed'
      and bookings.completed_at > now() - interval '29 days'
      and nullif(trim(bookings.contact ->> 'email'), '') is not null
      and not exists (select 1 from public.reviews where booking_id = bookings.id)
    returning review_invites.booking_id
  loop
    perform public.queue_review_invite(invited, 'review_reminder');
    sent := sent + 1;
  end loop;

  return sent;
end;
$$;

-- the review page, by the link in the client's email
create function public.get_review_page(token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'booking_id', bookings.id,
    'ref', bookings.ref,
    'service_name', bookings.snapshot ->> 'service_name',
    'stylist_name', stylists.business_name,
    'stylist_slug', stylists.slug,
    'starts_at', bookings.starts_at,
    'client_first', bookings.contact ->> 'first',
    'rating', reviews.rating,
    'state', case
      when reviews.id is not null then 'reviewed'
      when bookings.status <> 'completed' then 'unavailable'
      else 'open'
    end
  )
  from public.booking_tokens
  join public.bookings on bookings.id = booking_tokens.booking_id
  join public.stylists on stylists.id = bookings.stylist_id
  left join public.reviews on reviews.booking_id = bookings.id
  where booking_tokens.token_hash = sha256(convert_to(coalesce(token, ''), 'UTF8'))
    and booking_tokens.purpose = 'review' and booking_tokens.expires_at > now()
$$;

create function public.submit_review(token text, rating integer, body text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  page jsonb := public.get_review_page(token);
  booking public.bookings;
  stylist public.stylists;
  owner_email text;
  preference public.notification_preferences;
  review public.reviews;
begin
  if page is null then
    return 'link_not_valid';
  end if;

  if page ->> 'state' <> 'open' then
    return page ->> 'state';
  end if;

  select * into booking from public.bookings where id = (page ->> 'booking_id')::uuid;
  select * into stylist from public.stylists where id = booking.stylist_id;

  insert into public.reviews (booking_id, stylist_id, client_id, rating, body)
  values (booking.id, booking.stylist_id, booking.client_id, rating, nullif(trim(body), ''))
  on conflict (booking_id) do nothing
  returning * into review;

  if review.id is null then
    return 'reviewed';
  end if;

  select email into owner_email from auth.users where id = stylist.owner_id;
  select * into preference from public.notification_preferences
  where stylist_id = stylist.id and event = 'review_received';

  if owner_email is not null and coalesce(preference.email, true) then
    perform public.queue_email(
      owner_email, 'review_received',
      public.get_booking_details(booking.id) || jsonb_build_object(
        'rating', review.rating, 'body', review.body, 'studio_url', booking.site || '/studio'
      ),
      stylist.owner_id
    );
  end if;

  if stylist.contact_phone is not null and coalesce(preference.sms, false) then
    perform public.queue_sms(
      stylist.contact_phone, 'review_received',
      public.get_booking_details(booking.id) || jsonb_build_object('rating', review.rating), stylist.owner_id
    );
  end if;

  return 'submitted';
end;
$$;

-- the reviews on a public profile, newest first, with how many there are in all
create function public.get_stylist_reviews(lookup text, page integer default 0, page_size integer default 10)
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
        'rating', shown.rating,
        'body', case when shown.status = 'published' then shown.body end,
        'is_text_removed', shown.status = 'text_removed',
        'author', public.get_reviewer_name(shown.contact),
        'is_former', shown.contact ? 'account_deleted',
        'service_name', shown.service_name,
        'created_at', shown.created_at,
        'reply', shown.reply,
        'replied_at', shown.replied_at,
        'is_reply_edited', shown.reply_edited_at is not null,
        'is_mine', shown.client_id is not null and shown.client_id = auth.uid()
      ) order by shown.created_at desc, shown.id)
      from shown
    ), '[]')
  )
$$;

-- signed in only; the stylist reports from Studio, anyone else from the profile; one report per person per review
create function public.report_review(target uuid, reason text, details text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  review public.reviews;
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

  return case when report_id is null then 'already_reported' else 'reported' end;
end;
$$;

-- Studio's Reviews tab: every review that's still up, with the client (to open their card) and whether it's being checked
create function public.get_studio_reviews(target uuid)
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
      'is_reported', exists (
        select 1 from public.review_reports where review_id = reviews.id and reporter_id = auth.uid()
      )
    ) order by reviews.created_at desc, reviews.id)
    from public.reviews
    join public.bookings on bookings.id = reviews.booking_id
    where reviews.stylist_id = target and reviews.status <> 'removed'
  ), '[]'))
  where public.is_stylist_owner(target)
$$;

-- the first reply emails the client; later changes mark it edited
create function public.reply_to_review(target uuid, reply text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  review public.reviews;
  booking public.bookings;
  text_value text := nullif(trim(reply), '');
begin
  select * into review from public.reviews where id = target and status <> 'removed';

  if review.id is null or not public.is_stylist_owner(review.stylist_id) then
    raise exception 'review_not_found';
  end if;

  if text_value is null then
    raise exception 'reply_required';
  end if;

  if review.reply = text_value then
    return;
  end if;

  update public.reviews
  set reply = text_value,
    replied_at = coalesce(replied_at, now()),
    reply_edited_at = case when replied_at is null then null else now() end
  where id = target;

  if review.replied_at is null then
    select * into booking from public.bookings where id = review.booking_id;

    perform public.queue_email(
      booking.contact ->> 'email', 'review_reply',
      public.get_booking_details(booking.id) || jsonb_build_object(
        'client_first', booking.contact ->> 'first',
        'reply', text_value,
        'profile_url', booking.site || '/' || (select slug from public.stylists where id = review.stylist_id)
      ),
      booking.client_id
    );
  end if;
end;
$$;

create or replace function public.get_stylist_profile(lookup text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', stylist.slug,
    'business_name', stylist.business_name,
    'business_type', stylist.business_type,
    'bio', stylist.bio,
    'area_label', stylist.area_label,
    'travel_radius_miles', stylist.travel_radius_miles,
    'contact_email', stylist.contact_email,
    'instagram', stylist.instagram,
    'tiktok', stylist.tiktok,
    'youtube', stylist.youtube,
    'website', stylist.website,
    'cover_path', stylist.cover_path,
    'status', stylist.status,
    'pause_on', stylist.pause_on,
    'pause_until', stylist.pause_until,
    'next_start', public.get_next_start(stylist.id, (
      select min(duration_min) from public.services where stylist_id = stylist.id and status = 'active'
    ), null, null, null),
    'stylist_categories', (
      select coalesce(jsonb_agg(category order by category.sort), '[]')
      from public.stylist_categories as category where category.stylist_id = stylist.id
    ),
    'services', (
      select coalesce(jsonb_agg(to_jsonb(service) || jsonb_build_object(
        'service_variations', (
          select coalesce(jsonb_agg(variation order by variation.sort), '[]')
          from public.service_variations as variation where variation.service_id = service.id
        ),
        'service_addons', (
          select coalesce(jsonb_agg(link), '[]')
          from public.service_addons as link where link.service_id = service.id
        )
      ) order by service.sort), '[]')
      from public.services as service
      where service.stylist_id = stylist.id and service.status = 'active'
    ),
    'addons', (
      select coalesce(jsonb_agg(addon), '[]')
      from public.addons as addon where addon.stylist_id = stylist.id and addon.status = 'active'
    ),
    'working_hours', (
      select coalesce(jsonb_agg(hours order by hours.weekday), '[]')
      from public.working_hours as hours where hours.stylist_id = stylist.id
    ),
    'closed_periods', (
      select coalesce(jsonb_agg(period order by period.starts_on), '[]')
      from public.closed_periods as period
      where period.stylist_id = stylist.id and period.ends_on >= (now() at time zone 'Europe/London')::date
    ),
    'payment_policy', (
      select to_jsonb(policy) from public.payment_policies as policy
      where policy.stylist_id = stylist.id order by policy.created_at desc limit 1
    ),
    'portfolio_photos', (
      select coalesce(jsonb_agg(photo order by photo.sort), '[]')
      from public.portfolio_photos as photo where photo.stylist_id = stylist.id
    )
  ) || public.get_stylist_rating(stylist.id)
  from public.stylists as stylist
  where stylist.id = coalesce(
      (select id from public.stylists where slug = lookup::extensions.citext),
      (select stylist_id from public.stylist_slug_history where slug = lookup::extensions.citext)
    )
    and (stylist.status in ('live', 'paused') or stylist.owner_id = auth.uid())
$$;

-- search results carry the rating too (a new return column, so the function is replaced)
drop function public.search_stylists(
  double precision, double precision, integer, text, text, text, text[], integer, date, time, time, text, integer,
  integer
);

create function public.search_stylists(
  lat double precision default null,
  lng double precision default null,
  radius_miles integer default null,
  service_type text default null,
  service_group text default null,
  search_text text default null,
  venues text[] default null,
  max_price_pence integer default null,
  on_date date default null,
  time_from time default null,
  time_to time default null,
  sort text default 'distance',
  page integer default 0,
  page_size integer default 12
)
returns table (
  id uuid,
  slug text,
  business_name text,
  area_label text,
  business_type text,
  cover_path text,
  distance_miles double precision,
  from_pence integer,
  next_start timestamptz,
  matches jsonb,
  total_count bigint,
  rating numeric,
  review_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with place as (
    select case when lat is not null and lng is not null
      then extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
    end as point
  ),
  found as (
    select stylists.*, extensions.st_distance(stylists.location, place.point) / 1609.344 as distance
    from public.stylists, place
    where stylists.status = 'live'
      and (venues is null or stylists.business_type = any (venues))
      and (place.point is null or radius_miles is null
        or extensions.st_dwithin(stylists.location, place.point, 1609.344 * greatest(radius_miles, 25)))
  ),
  matched as materialized (
    select services.*, public.service_from_pence(services.id) as from_price,
      services.name ilike '%' || search_text || '%' as is_named
    from found
    join public.services on services.stylist_id = found.id and services.status = 'active'
    where (service_type is null or services.service_type_id = service_type)
      and (service_group is null or services.service_group_id = service_group)
      and (search_text is null
        or services.name ilike '%' || search_text || '%'
        or found.business_name ilike '%' || search_text || '%')
  ),
  priced as materialized (
    select stylist_id,
      min(from_price + public.booking_fee_pence(from_price)) as from_pence,
      min(duration_min) as minutes,
      jsonb_path_query_array(jsonb_agg(jsonb_build_object(
        'id', matched.id,
        'name', matched.name,
        'from_pence', from_price + public.booking_fee_pence(from_price),
        'minutes', duration_min
      ) order by is_named desc nulls last, from_price, matched.sort), '$[0 to 1]') as matches
    from matched
    group by stylist_id
  ),
  timed as (
    select found.*, priced.from_pence, priced.matches,
      public.get_next_start(found.id, priced.minutes, on_date, time_from, time_to) as next_start
    from found
    join priced on priced.stylist_id = found.id
    cross join place
    where (place.point is null or case
        when found.business_type = 'mobile' then found.distance <= found.travel_radius_miles
        else radius_miles is null or found.distance <= radius_miles
      end)
      and (max_price_pence is null or priced.from_pence <= max_price_pence)
  ),
  paged as (
    select timed.*, count(*) over () as total
    from timed
    where (on_date is null and time_from is null) or timed.next_start is not null
    order by
      case when sort = 'price' then timed.from_pence end,
      case when sort = 'price-desc' then timed.from_pence end desc,
      case when sort = 'newest' then timed.created_at end desc,
      case when sort = 'earliest' then timed.next_start end nulls last,
      case when timed.business_type = 'mobile' then 0 else timed.distance end nulls last,
      timed.next_start nulls last,
      timed.id
    limit least(greatest(page_size, 1), 24)
    offset greatest(page, 0) * least(greatest(page_size, 1), 24)
  )
  select paged.id, paged.slug::text, paged.business_name, paged.area_label, paged.business_type,
    paged.cover_path, paged.distance, paged.from_pence, paged.next_start, paged.matches, paged.total,
    (score ->> 'rating')::numeric, (score ->> 'review_count')::integer
  from paged
  cross join lateral public.get_stylist_rating(paged.id) as score
  order by
    case when sort = 'price' then paged.from_pence end,
    case when sort = 'price-desc' then paged.from_pence end desc,
    case when sort = 'newest' then paged.created_at end desc,
    case when sort = 'earliest' then paged.next_start end nulls last,
    case when paged.business_type = 'mobile' then 0 else paged.distance end nulls last,
    paged.next_start nulls last,
    paged.id
$$;

-- Studio's activity feed also lists new reviews
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
  public.is_review_counted(public.reviews),
  public.get_stylist_rating(uuid),
  public.get_reviewer_name(jsonb),
  public.queue_review_invite(uuid, text),
  public.send_review_invites(),
  public.get_review_page(text),
  public.submit_review(text, integer, text),
  public.get_stylist_reviews(text, integer, integer),
  public.report_review(uuid, text, text),
  public.get_studio_reviews(uuid),
  public.reply_to_review(uuid, text),
  public.search_stylists(
    double precision, double precision, integer, text, text, text, text[], integer, date, time, time, text, integer,
    integer
  )
  from public, anon, authenticated;

grant execute on function public.get_review_page(text), public.submit_review(text, integer, text) to service_role;

grant execute on function
  public.get_stylist_reviews(text, integer, integer),
  public.search_stylists(
    double precision, double precision, integer, text, text, text, text[], integer, date, time, time, text, integer,
    integer
  )
  to anon, authenticated;

grant execute on function
  public.report_review(uuid, text, text),
  public.get_studio_reviews(uuid),
  public.reply_to_review(uuid, text)
  to authenticated;

select cron.schedule('review-invites', '*/15 * * * *', $$select public.send_review_invites()$$);
