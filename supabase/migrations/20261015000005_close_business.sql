-- Closing a business (Studio → Close business): the booking page goes offline at once and can be reopened for
-- 15 days; after that a nightly job removes the business details and photos. The anonymised row stays so its
-- slug is never reused and payment records keep their link.
alter table public.stylists
  add column closed_at timestamptz,
  alter column owner_id drop not null,
  alter column location drop not null,
  add constraint stylists_location_unless_closed check (location is not null or status = 'closed'),
  drop constraint stylists_check1,
  add constraint stylists_contact_unless_closed
    check (contact_email is not null or contact_phone is not null or status = 'closed');

create function public.close_business()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stylists
  set status = 'closed', closed_at = now()
  where owner_id = auth.uid() and status <> 'closed';

  if not found then
    raise exception 'no open business on this account';
  end if;
end;
$$;

/** Within 15 days of closing; the go-live rule decides when it's live again. */
create function public.reopen_business()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stylists
  set status = 'draft', closed_at = null
  where owner_id = auth.uid() and status = 'closed' and closed_at > now() - interval '15 days';

  if not found then
    raise exception 'this business can no longer be reopened';
  end if;
end;
$$;

create function public.get_due_closures()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.stylists
  where status = 'closed' and closed_at < now() - interval '15 days' and owner_id is not null
$$;

/** Photos of businesses due for clearing; the Edge Function deletes these before clearing the rows. */
create function public.get_due_closure_photos()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select photo from (
    select path as photo from public.portfolio_photos where stylist_id in (select public.get_due_closures())
    union all
    select unnest(array[cover_path, avatar_path]) from public.stylists where id in (select public.get_due_closures())
  ) as photos
  where photo is not null
$$;

/** Clears businesses closed over 15 days ago, keeping the anonymised row for its slug and payment records. */
create function public.purge_closed_businesses()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  due uuid[] := array(select public.get_due_closures());
begin
  update auth.users
  set raw_app_meta_data = raw_app_meta_data - 'is_stylist'
  where id in (select owner_id from public.stylists where id = any (due));

  delete from public.portfolio_photos where stylist_id = any (due);
  delete from public.services where stylist_id = any (due);
  delete from public.addons where stylist_id = any (due);
  delete from public.stylist_categories where stylist_id = any (due);
  delete from public.working_hours where stylist_id = any (due);
  delete from public.time_blocks where stylist_id = any (due);
  delete from public.closed_periods where stylist_id = any (due);
  delete from public.booking_rules where stylist_id = any (due);
  delete from public.stylist_private where stylist_id = any (due);

  update public.stylists
  set owner_id = null, business_name = 'Closed business', bio = null, location = null, area_label = null,
    contact_email = null, contact_phone = null, instagram = null, tiktok = null, youtube = null,
    website = null, vat_number = null, cover_path = null, avatar_path = null, referral_source = null
  where id = any (due);
end;
$$;

revoke execute on function public.close_business(), public.reopen_business() from public, anon;
grant execute on function public.close_business(), public.reopen_business() to authenticated;
revoke execute on function
  public.get_due_closures(), public.get_due_closure_photos(), public.purge_closed_businesses()
  from public, anon, authenticated;
grant execute on function
  public.get_due_closures(), public.get_due_closure_photos(), public.purge_closed_businesses()
  to service_role;

-- nightly at 03:30: the Edge Function purges and deletes the photos (its URL and secret live in Vault)
create extension if not exists pg_net;

select cron.schedule(
  'purge-closed-businesses',
  '30 3 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/purge-closed-businesses',
    headers := jsonb_build_object(
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
  $$
);
