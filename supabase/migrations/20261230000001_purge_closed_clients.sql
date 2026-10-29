-- Purging a closed business also clears its clients: the client list, sensitivities, client photos and the client's
-- details on its bookings. Bookings and money stay (6 years for tax); a booking paid in the last 120 days keeps the
-- client's name and email in case a card payment is disputed, and the nightly purge_deleted_client_contacts clears
-- them after, as when a client deletes their account.

-- every business past its 15 days, purged or not, so a photo missed one night is removed the next. Each business's
-- folder is looked up as a name range ('/' is followed by '0'), which uses Storage's (bucket_id, name) index
create function public.get_due_closure_client_photos()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select objects.name
  from public.stylists
  join storage.objects on objects.bucket_id = 'client-photos'
    and objects.name collate "C" >= stylists.id::text || '/' and objects.name collate "C" < stylists.id::text || '0'
  where stylists.status = 'closed' and stylists.closed_at < now() - interval '15 days'
$$;

-- only a booking waiting to be confirmed needs the email its link goes to (as in fix/phase-5-review-bugs'
-- 20261222000008), and anonymising one isn't refused either: a closed business can still have one when it's purged.
-- Sending a new link once it's anonymised is still refused
create or replace function public.require_confirm_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'awaiting_confirmation' and new.protection_status = 'pending'
    and nullif(trim(new.contact ->> 'email'), '') is null
    and (tg_op = 'INSERT' or new.protection_status is distinct from old.protection_status
      or new.contact is distinct from old.contact or new.status is distinct from old.status)
    and not (tg_op = 'UPDATE' and new.contact ? 'account_deleted' and not coalesce(old.contact ? 'account_deleted', false))
  then
    raise exception 'email_required';
  end if;

  return new;
end;
$$;

drop trigger bookings_require_confirm_email on public.bookings;

create trigger bookings_require_confirm_email before insert or update of protection_status, contact, status
on public.bookings
for each row execute function public.require_confirm_email();

create or replace function public.purge_closed_businesses()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  due uuid[] := array(select public.get_due_closures());
  closed_bookings uuid[] := array(select id from public.bookings where stylist_id = any (due));
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

  delete from public.client_sensitivities where stylist_id = any (due);
  delete from public.booking_notes where booking_id = any (closed_bookings);
  delete from public.booking_tokens where booking_id = any (closed_bookings);
  delete from public.booking_codes where booking_id = any (closed_bookings);

  -- emails being sent, or queued in the last day, are left to finish; the 90-day clean-up removes them
  delete from public.notifications
  where payload ->> 'ref' in (select ref from public.bookings where id = any (closed_bookings))
    and (status in ('sent', 'failed') or (status = 'pending' and created_at < now() - interval '1 day'));

  update public.booking_events
  set data = data - 'from' - 'to'
  where kind = 'address_changed' and booking_id = any (closed_bookings);

  update public.bookings
  set contact = case
      when contact is null then null
      when public.has_recent_payment(id) then jsonb_build_object(
        'first', contact ->> 'first', 'last', contact ->> 'last', 'email', contact ->> 'email', 'account_deleted', true
      )
      else jsonb_build_object('account_deleted', true)
    end,
    notes = null,
    allergies = null,
    allergies_consented_at = null,
    cancel_reason = null,
    address = null,
    location = null
  where id = any (closed_bookings);

  update public.stylist_clients
  set first = 'Deleted client', last = null, phone = null, email = null, photo_path = null, hair_notes = null,
    blocked_at = null, client_id = null, deleted_at = coalesce(deleted_at, now())
  where stylist_id = any (due);

  update public.stylists
  set owner_id = null, business_name = 'Closed business', bio = null, location = null, area_label = null,
    contact_email = null, contact_phone = null, instagram = null, tiktok = null, youtube = null,
    website = null, vat_number = null, cover_path = null, avatar_path = null, referral_source = null
  where id = any (due);
end;
$$;

revoke execute on function public.get_due_closure_client_photos() from public, anon, authenticated;
grant execute on function public.get_due_closure_client_photos() to service_role;
