-- an unpaid fee or balance link is reminded once, two days before it runs out; sending it again starts a new week
alter table public.payment_links add column reminded_at timestamptz;

create function public.reset_link_reminder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.expires_at > old.expires_at then
    new.reminded_at := null;
  end if;

  return new;
end;
$$;

create trigger payment_links_reset_reminder before update of expires_at on public.payment_links
for each row execute function public.reset_link_reminder();

-- the same email as the link's own, with a fresh link that keeps the expiry; it isn't one of the stylist's resends
create function public.remind_expiring_links()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.payment_links;
  token text;
  booking public.bookings;
  fee public.booking_fees;
  reminded integer := 0;
begin
  for link in
    select * from public.payment_links
    where status = 'pending' and reminded_at is null and expires_at > now() and expires_at <= now() + interval '2 days'
    for update skip locked
  loop
    token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');

    update public.payment_links set token_hash = sha256(convert_to(token, 'UTF8')), reminded_at = now()
    where id = link.id;

    select * into booking from public.bookings where id = link.booking_id;

    if link.purpose = 'fee' then
      select * into fee from public.booking_fees where id = link.fee_id;

      perform public.queue_email(
        booking.contact ->> 'email',
        'fee_declined',
        public.get_booking_details(booking.id) || jsonb_build_object(
          'kind', fee.kind,
          'fee_pence', fee.amount_pence,
          'amount_pence', link.amount_pence,
          'card_label', fee.card_label,
          'expires_at', link.expires_at,
          'pay_url', booking.site || '/pay?token=' || token,
          'is_reminder', true
        ),
        booking.client_id
      );
    else
      perform public.queue_email(
        booking.contact ->> 'email', 'balance_due',
        public.get_receipt_details(booking.id) || jsonb_build_object(
          'amount_pence', link.amount_pence,
          'expires_at', link.expires_at,
          'pay_url', booking.site || '/pay?token=' || token,
          'is_reminder', true
        ),
        booking.client_id
      );
    end if;

    reminded := reminded + 1;
  end loop;

  return reminded;
end;
$$;

-- a booking waiting for its confirm link needs an email to send it to (texts come later)
create function public.require_confirm_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.protection_status = 'pending' and nullif(trim(new.contact ->> 'email'), '') is null
    and (tg_op = 'INSERT' or new.protection_status is distinct from old.protection_status
      or new.contact is distinct from old.contact) then
    raise exception 'email_required';
  end if;

  return new;
end;
$$;

create trigger bookings_require_confirm_email before insert or update of protection_status, contact
on public.bookings
for each row execute function public.require_confirm_email();

revoke execute on function public.remind_expiring_links() from public, anon, authenticated;

select cron.schedule('complete-and-remind', '*/5 * * * *',
  $$select public.complete_past_bookings(); select public.queue_due_reminders(); select public.fail_unreplaced_cards();
  select public.remind_expiring_links()$$);
