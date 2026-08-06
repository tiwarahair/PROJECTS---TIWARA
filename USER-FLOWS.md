# Tiwara's House — User Flows (benchmarked against Fresha)

I walked through a real booking on Fresha (Marina Salon by FKZ, Manchester) rather than going off memory. What follows is every user action mapped to a flow, noting where Fresha's pattern is worth copying and where your app already does something better or different on purpose.

## What Fresha's client flow actually looks like

Homepage (geolocated to Manchester automatically) → browse by category or search → salon profile page (Photos / Services / Team / Reviews / Portfolio / About tabs, opening hours, "Book now" sticky button) → tap "Book" on a service → **4-step wizard**: `Services → Professional → Time → Confirm`.

Three things stood out as structurally different from your app:

1. **Multi-service cart.** Fresha lets you add several services to one booking (a running total builds in a sidebar as you add more) — your wizard books one service per pass.
2. **Variants live inside the service picker.** Choosing "Wash and Blow dry" opened a sub-modal to pick hair length/type (Short-Mid straight, Mid-Long straight, Extra Long/curly, etc.), each at a different price — done at selection time, not as a separate step later.
3. **"Any professional" is the default**, with named staff as an alternative, sorted by rating.

None of these are gaps in your plan — see the comparison table at the end for which ones are worth adopting.

---

## Client flows

### 1. Discover a stylist
**Trigger:** landing on `/search` or the homepage search bar.

1. Client lands on `search-page.tsx`, sets a location and/or hairstyle filter (`use-search-filters.ts` already models this client-side)
2. Frontend calls `GET /stylists?location=&style=` (§10 of BACKEND-PLAN.md)
3. Backend geocodes the location via postcodes.io if it's a postcode, filters by distance (`geolib`), and by whether the stylist offers the selected style
4. Results render as `stylist-card.tsx` — matches Fresha's browse grid, minus the category-tile browsing (Fresha's "Beauty Salons in Manchester" style pages) which isn't needed yet at one-stylist scale

### 2. View a stylist profile
**Trigger:** tapping a result from search, or a direct `/:stylistSlug` link.

1. `GET /stylists/:slug` — profile, services offered, portfolio, reviews
2. Renders the existing profile page, extended with `GET /stylists/:id/reviews`
3. Fresha's tabbed layout (Services / Team / Reviews / Portfolio / About) is worth adopting here once there's real review/portfolio data to show — right now the frontend doesn't tab these, it's a flat page

### 3. Book an appointment
**Trigger:** "Book" from a profile or search card → `/book`.

This is your existing 9-step wizard (`use-booking-wizard.ts`), unchanged in shape:

```
service → style → when & where → stylist → customise → schedule → details → review → confirm
```

Backend touchpoints, in order:
1. `GET /services` + `GET /style-config` populate steps 1, 2, 5 (already static-data-driven today, will move to endpoints per §14 of BACKEND-PLAN.md)
2. `GET /stylists?location=&style=` powers step 3 (when & where → stylist)
3. `POST /bookings` fires at step 9, creating the row with `status: PENDING` and kicking off the Stripe `PaymentIntent` (§5)
4. `POST /payments/webhook` confirms payment → flips `status: CONFIRMED`, triggers the Resend confirmation email (§13)

**On Fresha's multi-service cart:** don't adopt this for MVP. Your booking is built around one stylist customising one look end-to-end (with a live visual preview) — bundling three services into one cart is a different product shape and adds real complexity to availability math (three services, one time slot, whose duration wins?). Worth revisiting once there's demand for it, not before.

### 4. Customise a style (the dynamic visual preview)
**Trigger:** step 4 of the booking wizard, or reached directly from a service row on a profile.

1. Client picks colour, length, size, add-ons (`step-style.tsx` / style-config data)
2. The canvas preview re-renders on every change (`strand-configs.ts` / `strand-path.ts` — procedural, not a real photo composite, per your CLAUDE.md notes)
3. No backend call needed here — this is pure client-side rendering over the style-config catalog

This is a genuine differentiator Fresha doesn't have at all (their variant picker is just a price list, no visual preview) — worth keeping as a headline feature rather than folding it into the service-selection modal the way Fresha does. Your instinct to keep it as its own dedicated step is the right call, not a gap to close.

**"Something else? Request a custom style" — parked, not part of this flow yet.** It's fully designed in the frontend (`request-style-overlay.tsx` — description, optional inspiration photo, clear copy about the stylist reviewing/accepting), but has no backend model in either plan and you've said to leave it for now. Noting it here so it isn't accidentally rebuilt as part of the customise flow before it's actually scoped.

### 5. Pay a deposit or in full
**Trigger:** final action of the review step.

1. Client picks deposit (flat 25%, platform-wide) or full price — **this choice has no field to live in yet**: `BookingState` needs a new `paymentPlan` field added before this step can work at all (§10 of BACKEND-PLAN.md)
2. Stripe Elements collects card details in the review/confirm step, `PaymentIntent` created server-side (total/fee/deposit always recomputed from stored prices, never trusted from the client), client confirms — matches Fresha's own "pay by app" + 3D Secure pattern
3. On success: `status: confirmed`, confirmation step renders, confirmation email sends via Resend

### 6. Receive confirmation & reminder
**Trigger:** automatic, after step 5.

1. Booking confirmed → Resend sends a confirmation email immediately (booking details, deposit/balance breakdown, stylist contact)
2. A scheduled job (`node-cron`, §13) checks for bookings 24-48h out and sends a reminder email

### 7. Reschedule an appointment
**Trigger:** a logged-in client opens a past booking (needs a "my bookings" view — not yet in the frontend), or a guest follows their manage-booking link (§11) — either way, up to 48h before the appointment.

1. `GET /bookings?clientId=` for a logged-in client, or the token-scoped guest view — lists/loads the booking(s) (neither view exists in the frontend yet; flagging as new UI needed, not just a backend gap)
2. `PATCH /bookings/:id/reschedule` (or the guest token equivalent) — rejects server-side if `now > appointmentDateTime - 48h` (§13)
3. New `Booking` row created with `rescheduledFromId` pointing at the original (§4), original marked cancelled — no refund/re-charge either way, since it's the same payment carried forward, not a cancellation

### 8. Cancel an appointment
**Trigger:** same "my bookings" view, or the guest manage-booking link (see §11). Confirmed refund policy:

- **More than 24 hours before the appointment:** 50% of the amount actually paid is refunded
- **24 hours or less before the appointment:** no refund

1. `PATCH /bookings/:id/status` → `CANCELLED` (or the guest equivalent, `PATCH /bookings/manage/:token/cancel`)
2. Server computes `now` vs `appointmentDateTime` and issues a Stripe refund (`stripe.refunds.create`) for 50% of whatever was actually charged (deposit or full price) if outside the 24h window, or skips the refund call entirely inside it
3. `status: CANCELLED` either way — the slot frees up immediately for other clients regardless of whether a refund was issued (the double-booking constraint in §4 only excludes non-cancelled bookings)
4. Cancellation triggers a confirmation email via Resend, stating what was (or wasn't) refunded

### 9. Leave a review
**Trigger:** post-appointment, likely a follow-up email link or a prompt next time they open the app.

1. Only allowed once `Booking.status === COMPLETED` — the API should reject a review attempt on any other status, not just hide the button client-side
2. `POST /reviews` → `GET /stylists/:id/reviews` for it to show up on the profile

### 10. Favourite a stylist
**Trigger:** a heart/save icon on a profile or search card. Later feature per your docs, schema already sketched (§4 `Favourite` table).

1. `POST /favourites` / `DELETE /favourites/:stylistId`
2. A "favourites" filter or tab on the client's account view (new UI, doesn't exist yet)

### 11. Guest checkout (confirmed — booking never requires an account)
**Trigger:** the details step of the booking wizard, for anyone not logged in.

Unlike Fresha, which requires an account before a booking completes, a client can book end-to-end with just the details already collected in `step-details.tsx` (name, email, phone) — no `POST /auth/register` in the way.

1. `POST /bookings` accepts a booking with no authenticated user — `Booking.clientId` is nullable for exactly this case (update to §4's schema); the row's own `firstName`/`lastName`/`email`/`phone` fields (already there) are the guest's identity, not a `User` row
2. Since a guest has no account to log into, reschedule/cancel (flows 7-8) happen via a **manage-booking link**: the confirmation email includes a URL with a signed, random token (`Booking.manageToken`, unguessable — not a sequential ID) that opens a scoped view of that one booking, no login required
3. If the same person later creates a real account with the same email, linking past guest bookings to it is a nice-to-have, not a requirement — don't build that reconciliation now

### 12. Sign up / log in
**Trigger:** optional, at any point — for favouriting stylists (flow 10) or seeing a full booking history in one place, per your PROJECT CONTEXT doc ("Clients will also be able to log in & favourite...", phrased as additive, not gating).

1. `POST /auth/register` or `POST /auth/login` (§9/§10)
2. A logged-in client's bookings use `clientId` instead of the guest token, and their `GET /bookings?clientId=` list replaces the need for per-booking manage links

---

## Stylist flows

### 1. Onboard onto the platform (revised — two-phase, confirmed design)
Fully detailed in §7 of BACKEND-PLAN.md. Three phases, not one continuous form:

**Phase 1 — Application** (`/for-stylists`, public, no account): fills in name, business name, postcode, experience, email, phone, Instagram, category-level service interest, bio, portfolio link → creates a `businesses` row with `status: pending` → Resend notifies Tiwara's admin inbox → appears in the new admin "Pending Applications" view.

**Phase 2 — Admin decision**: Accept flips status to `invited` and sends a branded invite email (via Supabase Auth's `inviteUserByEmail`, wrapped in a Resend template) with a personal sign-up link. Decline flips status to `declined`, with a polite email by default.

**Phase 3 — Self-serve onboarding** (the invite link, net-new wizard): stylist sets a password → lands in a form **pre-filled from their application data** → adds postcode confirmation (city auto-filled from the postcodes.io lookup), specific catalog services with **price + duration per service** (the field that started this whole thread — nothing in the current frontend collects it), portfolio images, working hours → submit flips status to `approved` directly, live in search.

### 2. Log in / reach a dashboard
1. `POST /auth/login`
2. Lands on a stylist dashboard — **this entire surface doesn't exist in the frontend yet.** Everything built so far is client-facing; the stylist side is 100% new screens, not a reconciliation of existing ones.

### 3. View & manage bookings
1. `GET /bookings?stylistId=` — upcoming/past appointments
2. `PATCH /bookings/:id/status` — confirm or decline a `PENDING` booking (relevant if you ever require stylist confirmation rather than auto-confirming on payment)

### 4. Manage availability
1. Edit `WorkingHours` (recurring weekly) and `AvailabilityException` (one-off closures/extra slots) — §4
2. This is the natural home for `react-big-calendar` or `FullCalendar` (§8) — a stylist-facing calendar UI, not the client booking wizard

### 5. View earnings
1. `GET /stylists/:id/earnings` — aggregates completed bookings and Stripe payouts
2. Needs Stripe Connect's payout data alongside your own `Payment` records to show a true picture (what's been paid out vs what's pending)

### 6. Edit profile & portfolio
1. `PATCH /stylists/:id`, `POST /stylists/:id/portfolio` (Cloudinary)
2. Same underlying data as onboarding steps 2-4 — build this as a reusable form, not a duplicate of the onboarding UI

---

## Admin flow (Tiwara's House, wearing the admin hat)

### 1. Review a pending application (revised)
**Trigger:** a new row lands in the "Pending Applications" view (net-new admin dashboard page) after someone submits `/for-stylists`.

1. Review the application's details (name, business, postcode, experience, category interest, bio, portfolio link) — no account exists yet at this point, just a `pending` `businesses` row
2. **Accept** → `invite-stylist` Edge Function flips status to `invited`, triggers a Supabase Auth invite email (branded via Resend) containing a personal sign-up link
3. **Decline** → `decline-application` flips status to `declined`, sends a polite decline email by default

### 2. Stylist appears in search
Only once they've completed phase 3 of onboarding themselves (§7 of BACKEND-PLAN.md) does status reach `approved` — there's no second admin gate after that; vetting happens once, at the application stage.

---

## Fresha patterns: adopt, adapt, or skip

| Pattern | Verdict |
|---|---|
| Multi-service cart | Skip for MVP — different product shape, adds availability-math complexity your single-service flow avoids |
| Variant picker inside service selection | Skip — your dedicated customise step with a live visual preview is a real differentiator, don't collapse it into a price-variant modal |
| "Any professional" default | Not directly applicable yet — your stylists are individual businesses, not a salon with an interchangeable team. Revisit only if a stylist profile ever represents a multi-chair salon rather than one person |
| Tabbed profile (Services/Team/Reviews/Portfolio/About) | Adopt once there's real review and portfolio data — current profile page is flatter than this and would benefit from the structure |
| Live running-total sidebar on every step | Already effectively covered by your review step; not worth adding to every step for a single-service booking |
| Deposit or card-on-file with 3D Secure | Already in your plan via Stripe (§5) |
