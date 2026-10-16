-- Instagram, TikTok and YouTube hold only the username; Studio checks the same rules and the links are built in the app.
alter table public.stylists
  add constraint stylists_instagram_username check (
    instagram ~ '^[A-Za-z0-9._]{1,30}$' and instagram !~ '(^\.|\.$|\.\.)'
  ),
  add constraint stylists_tiktok_username check (
    tiktok ~ '^[A-Za-z0-9._]{2,24}$' and tiktok !~ '\.$'
  ),
  add constraint stylists_youtube_username check (
    youtube ~ '^[A-Za-z0-9._-]{3,30}$'
  );

-- the public profile also returns the YouTube username
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
  )
  from public.stylists as stylist
  where stylist.id = coalesce(
      (select id from public.stylists where slug = lookup::extensions.citext),
      (select stylist_id from public.stylist_slug_history where slug = lookup::extensions.citext)
    )
    and (stylist.status in ('live', 'paused') or stylist.owner_id = auth.uid())
$$;
