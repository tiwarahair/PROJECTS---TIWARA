-- The data download also covers reviews (Phase 7): the client's own reviews with the stylist's reply, moderation outcomes & their appeals, and the reviews they reported
create or replace function public.get_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'account', jsonb_build_object(
      'email', users.email,
      'created_at', users.created_at,
      'email_confirmed_at', users.email_confirmed_at,
      'last_sign_in_at', users.last_sign_in_at,
      'sign_in_methods', coalesce((
        select jsonb_agg(jsonb_build_object(
          'provider', provider, 'email', identities.email, 'created_at', created_at, 'last_sign_in_at', last_sign_in_at
        ) order by created_at)
        from auth.identities where user_id = users.id
      ), '[]')
    ),
    'profile', (
      select jsonb_build_object(
        'first_name', first_name, 'last_name', last_name, 'phone', phone, 'marketing_emails', marketing_opt_in,
        'login_alerts', login_alerts, 'terms_version', client_terms_version,
        'terms_accepted_at', client_terms_accepted_at, 'created_at', created_at, 'has_photo', photo_path is not null
      )
      from public.profiles where id = users.id
    ),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'created_at', created_at, 'refreshed_at', refreshed_at, 'user_agent', user_agent, 'ip', host(ip)
      ) order by created_at)
      from auth.sessions where user_id = users.id
    ), '[]'),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('device', device, 'last_seen_at', last_seen_at) order by last_seen_at)
      from public.login_devices where user_id = users.id
    ), '[]'),
    'addresses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', label, 'line1', line1, 'line2', line2, 'town', town, 'postcode', postcode, 'is_default', is_default,
        'created_at', created_at
      ) order by created_at)
      from public.client_addresses where client_id = users.id
    ), '[]'),
    'favourites', coalesce((
      select jsonb_agg(jsonb_build_object('stylist', stylists.business_name, 'saved_at', favourites.created_at)
        order by favourites.created_at)
      from public.favourites join public.stylists on stylists.id = favourites.stylist_id
      where favourites.client_id = users.id
    ), '[]'),
    'shared_with_stylists', coalesce((
      select jsonb_agg(jsonb_build_object(
        'stylist', stylists.business_name, 'text', shared.text, 'consent', shared.consent_wording,
        'consented_at', shared.consented_at
      ) order by shared.consented_at)
      from public.client_sensitivities as shared join public.stylists on stylists.id = shared.stylist_id
      where shared.client_id = users.id
    ), '[]'),
    'bookings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ref', bookings.ref,
        'stylist', stylists.business_name,
        'service', bookings.snapshot,
        'status', bookings.status,
        'starts_at', bookings.starts_at,
        'ends_at', bookings.ends_at,
        'booked_at', bookings.created_at,
        'contact', bookings.contact,
        'notes', bookings.notes,
        'allergies', bookings.allergies,
        'allergies_shared_at', bookings.allergies_consented_at,
        'address', bookings.address,
        'price_pence', coalesce(bookings.final_price_pence, bookings.price_pence),
        'booking_fee_pence', bookings.fee_pence,
        'tip_pence', bookings.tip_pence,
        'terms', bookings.terms,
        'policy_accepted_at', bookings.policy_accepted_at,
        'cancelled_at', bookings.cancelled_at,
        'cancelled_by', bookings.cancelled_by,
        'cancel_reason', bookings.cancel_reason,
        'payments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kind', kind, 'method', method, 'amount_pence', amount_pence, 'paid_at', created_at
          ) order by created_at)
          from public.payments where booking_id = bookings.id
        ), '[]'),
        'refunds', coalesce((
          select jsonb_agg(jsonb_build_object(
            'amount_pence', amount_pence, 'reason', reason, 'refunded_at', created_at
          ) order by created_at)
          from public.refunds where booking_id = bookings.id
        ), '[]'),
        'fees', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kind', kind, 'amount_pence', amount_pence, 'refund_pence', refund_pence, 'charge_pence', charge_pence,
            'status', status, 'card', card_label, 'paid_at', paid_at, 'waived_at', waived_at, 'created_at', created_at
          ) order by created_at)
          from public.booking_fees where booking_id = bookings.id
        ), '[]')
      ) order by bookings.starts_at)
      from public.bookings join public.stylists on stylists.id = bookings.stylist_id
      where bookings.id in (select public.client_booking_ids(users.id)) and bookings.status not in ('held', 'expired')
    ), '[]'),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'booking_ref', bookings.ref,
        'stylist', stylists.business_name,
        'rating', reviews.rating,
        'text', reviews.body,
        'status', reviews.status,
        'written_at', reviews.created_at,
        'stylist_reply', reviews.reply,
        'replied_at', reviews.replied_at,
        'decisions', coalesce((
          select jsonb_agg(jsonb_build_object('outcome', outcome, 'decided_at', created_at) order by created_at)
          from public.review_decisions where review_id = reviews.id
        ), '[]'),
        'appeals', coalesce((
          select jsonb_agg(jsonb_build_object(
            'text', body, 'status', status, 'answer', answer_note, 'appealed_at', created_at, 'answered_at', answered_at
          ) order by created_at)
          from public.review_appeals where review_id = reviews.id and appellant = 'reviewer'
        ), '[]')
      ) order by reviews.created_at)
      from public.reviews
      join public.bookings on bookings.id = reviews.booking_id
      join public.stylists on stylists.id = reviews.stylist_id
      where reviews.booking_id in (select public.client_booking_ids(users.id))
    ), '[]'),
    'reviews_reported', coalesce((
      select jsonb_agg(jsonb_build_object(
        'stylist', stylists.business_name, 'reason', reports.reason, 'details', reports.details,
        'status', reports.status, 'reported_at', reports.created_at, 'decided_at', reports.decided_at
      ) order by reports.created_at)
      from public.review_reports as reports
      join public.reviews on reviews.id = reports.review_id
      join public.stylists on stylists.id = reviews.stylist_id
      where reports.reporter_id = users.id
    ), '[]'),
    'emails_and_texts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'channel', channel, 'template', template, 'status', status, 'created_at', created_at, 'sent_at', sent_at
      ) order by created_at)
      from public.notifications
      where notifications.user_id = users.id or lower(notifications.to_address) = lower(users.email)
    ), '[]')
  )
  from auth.users where users.id = (select auth.uid())
$$;
