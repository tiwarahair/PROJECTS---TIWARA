# Tiwara's House — Backend Architecture Plan (v2)

This replaces the earlier Express/Railway draft. It reconciles that draft with the second plan you had written independently (which proposed Supabase), plus every decision made since: Supabase-only architecture, a solo-stylist schema (no multi-staff table for now), a flat 25% deposit, a platform-wide cancellation policy, postcode-only address collection, a two-phase onboarding flow (application → admin decision → self-serve onboarding), and a set of concrete gaps found by reading the actual frontend code, not just the data files.

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Existing React 19 + TypeScript app, + React Hook Form + Zod | You already have this — add validation on top, one schema reused for both client validation and Edge Function request validation |
| Backend | **No standalone server.** Simple reads/writes go straight from the frontend to Supabase's auto-generated API (PostgREST), secured by Row-Level Security. Custom logic (available-slots, booking creation, Stripe webhook, admin invite) lives in **Supabase Edge Functions** | Cheapest path to £0/month — no server to host, ever, until you outgrow Supabase entirely |
| Database | PostgreSQL + PostGIS (bundled with Supabase, free) | Proper radius search (`ST_DWithin`) from day one — no reason to defer this now that it costs nothing extra |
| Auth | **Supabase Auth** | JWT issuing, refresh rotation, password hashing, email verification, and invite-by-email all included — no custom JWT/bcrypt code, no second vendor |
| Storage | Supabase Storage (1GB free), Cloudinary later if galleries outgrow it | Bundled with the same account, no third vendor for MVP |
| Payments | Stripe Connect (built later, not on the MVP critical path) | Handles the deposit/full split and the 2% client fee via `application_fee_amount` |
| Email | Resend | 3,000 free emails/month — admin notifications, stylist invites, booking confirmations |
| ORM inside Edge Functions | `@supabase/supabase-js`, not Prisma | Edge Functions run on Deno; Prisma's edge support doesn't cover Supabase's runtime. `supabase gen types typescript` gives the same type safety Prisma would have |

**Why no Express server at all:** every write route still gets an `authenticate` → `authorize` check, but it's enforced as an RLS policy at the database level (e.g. "a business row can only be updated where `owner_id = auth.uid()`") rather than application code — a bug in a function can't leak a cross-tenant write, because the database itself refuses it. The trade-off is that this logic lives inside Supabase's ecosystem rather than a portable server; the Postgres data itself stays portable if you ever migrate off.

## 2. Repo structure

Supabase doesn't replace your Git repo — it's a hosted project your existing repo talks to via the Supabase CLI. No new repo.

```
your-repo/
├── src/                              ← existing React app
│   ├── data/                         ← current dummy JSON, replaced by real Supabase calls over time
│   └── ...
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 20260806_initial_schema.sql
│   ├── functions/
│   │   ├── available-slots/index.ts
│   │   ├── create-booking/index.ts
│   │   ├── cancel-booking/index.ts
│   │   ├── invite-stylist/index.ts   ← admin "Accept" action
│   │   └── stripe-webhook/index.ts
│   └── seed.sql                      ← services.json / style-config.json seeded here
├── package.json
└── .env.local                        ← Supabase URL + keys, never committed
```

See IMPLEMENTATION-PLAN.md for the exact setup commands.

## 3. Database schema

Adapted from your uploaded draft, with these changes: no `staff` table (solo-only, per your call — a business row *is* the stylist), a three-stage `status` enum instead of two (to represent the application → invite → onboarding flow), no `deposit_pence` per service (flat 25% platform-wide instead), no per-stylist cancellation fields (platform-wide 50%/24h rule instead), and option ids that match your frontend's existing raw strings rather than inventing prefixed ones.

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- needed for the double-booking exclusion constraint

CREATE TYPE user_role AS ENUM ('client', 'stylist', 'admin');

-- 1:1 with Supabase's own auth.users — this table just adds the app-specific fields
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Application status now has three real stages, not two:
--   pending   → application submitted, sitting in the admin dashboard
--   invited   → admin accepted, stylist hasn't finished onboarding yet
--   approved  → onboarding complete, live in client search
--   declined / suspended cover the rest
CREATE TYPE business_status AS ENUM ('pending', 'invited', 'approved', 'declined', 'suspended');

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES profiles(id),        -- null until they complete sign-up (see §8)
  name TEXT NOT NULL,                            -- "Tiwara's House"
  slug TEXT UNIQUE,                              -- generated once approved, not at application time
  description TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  postcode TEXT,                                 -- the only address field the stylist actually types
  city TEXT,                                     -- auto-filled from the postcodes.io lookup, editable
  country TEXT NOT NULL DEFAULT 'GB',            -- never a form field — see §9
  location GEOGRAPHY(POINT, 4326),               -- filled in from the postcode lookup
  contact_email TEXT,
  phone TEXT,
  instagram_handle TEXT,
  years_experience TEXT,
  avatar_url TEXT,
  status business_status NOT NULL DEFAULT 'pending',
  application_note TEXT,                         -- the free-text "tell us about yourself" from the application form
  application_categories TEXT[],                 -- category-level interest captured at application time (§8)
  application_portfolio_url TEXT,                -- the Instagram/Drive link from the application form
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX businesses_location_idx ON businesses USING GIST (location);

CREATE TABLE business_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT DEFAULT 0
);

CREATE TABLE business_specialities (
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES service_categories(id),
  PRIMARY KEY (business_id, category_id)
);

-- ── Platform-wide preset catalog, seeded once from services.json / style-config.json ──

CREATE TABLE service_categories (
  id TEXT PRIMARY KEY,                    -- 'braids', 'wigs', 'natural-hair', 'locs', 'treatments' — matches your ids exactly
  label TEXT NOT NULL,
  description TEXT,
  customisable BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE catalog_services (
  id TEXT PRIMARY KEY,                    -- 'knotless', 'cornrows', ... — matches your ids exactly
  category_id TEXT NOT NULL REFERENCES service_categories(id),
  label TEXT NOT NULL,
  default_price_pence INT NOT NULL,
  default_duration_minutes INT NOT NULL,  -- the upper bound of your "4–6h" style ranges — see note below
  duration_display TEXT                   -- the cosmetic range, e.g. '4–6h', display only
);

CREATE TABLE style_config_groups (
  id TEXT PRIMARY KEY,                    -- 'length', 'colour', 'hair-texture', 'size', 'addons'
  name TEXT NOT NULL
);

CREATE TABLE category_config_groups (
  category_id TEXT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  config_group_id TEXT NOT NULL REFERENCES style_config_groups(id),
  PRIMARY KEY (category_id, config_group_id)
);

-- IDs here match your frontend's existing raw values directly (e.g. '1B', 'Small'),
-- not invented ids like 'colour-1b' — same "no translation layer" principle used
-- for service_categories/catalog_services above.
CREATE TABLE style_config_options (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES style_config_groups(id),
  name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',            -- inches / hex / description+strandCount+strandWidth/etc, shape varies per group
  applicable_category_ids TEXT[],         -- add-ons only
  added_cost_pence INT DEFAULT 0,
  is_pending BOOLEAN DEFAULT false,       -- your add-on "pending: true" — coming soon, not yet bookable
  sort_order INT DEFAULT 0
);

-- ── What a specific stylist actually offers, picked from the catalog above ──

CREATE TABLE stylist_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  catalog_service_id TEXT NOT NULL REFERENCES catalog_services(id),
  price_pence INT NOT NULL,               -- starts as the catalog default; stylist overrides during onboarding
  duration_minutes INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE (business_id, catalog_service_id)
);

CREATE TABLE availability_rules (          -- recurring weekly hours — keyed on business_id directly (solo-only)
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,                -- 0=Sunday ... 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

CREATE TABLE time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT
);

CREATE TYPE appointment_status AS ENUM ('pending','confirmed','completed','cancelled','no_show');
CREATE TYPE payment_plan AS ENUM ('deposit', 'full');

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES profiles(id),  -- nullable — null means a guest booking
  business_id UUID NOT NULL REFERENCES businesses(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  payment_plan payment_plan NOT NULL,
  total_pence INT NOT NULL,                -- always recomputed server-side, never trusted from the client
  booking_fee_pence INT NOT NULL,          -- the 2% client fee
  deposit_pence INT NOT NULL,              -- 25% of total, flat platform-wide
  balance_pence INT NOT NULL,
  refund_pence INT DEFAULT 0,
  rescheduled_from_id UUID REFERENCES appointments(id),
  cancelled_at TIMESTAMPTZ,
  -- guest identity, mirrors the client-details step; NULL when client_id is set
  guest_first_name TEXT,
  guest_last_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  manage_token TEXT UNIQUE,                -- lets a guest reschedule/cancel via an emailed link, no login
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX appointments_business_time_idx ON appointments (business_id, start_at, end_at);

-- The exclusion constraint IS the double-booking guard — not a unique constraint,
-- because it catches two different-length appointments overlapping, not just
-- exact time collisions.
ALTER TABLE appointments
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    business_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  )
  WHERE (status IN ('pending', 'confirmed'));

CREATE TABLE appointment_services (         -- schema supports multiple services per booking;
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,   -- product only ever creates one row today
  stylist_service_id UUID NOT NULL REFERENCES stylist_services(id),
  price_pence INT NOT NULL,                 -- snapshot at time of booking
  duration_minutes INT NOT NULL,
  PRIMARY KEY (appointment_id, stylist_service_id)
);

-- One row per selected style option. App-level rule (enforced in the Edge
-- Function, not the constraint itself): exactly one per single-select group
-- (length/colour/size/hair-texture), any number for add-ons.
CREATE TABLE appointment_style_selections (
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  style_config_option_id TEXT NOT NULL REFERENCES style_config_options(id),
  PRIMARY KEY (appointment_id, style_config_option_id)
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  business_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE favourites (
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, business_id)
);
```

**Not included, deliberately:** a `staff` table (solo-only for now), `deposit_pence`/cancellation-policy columns on `stylist_services` (both flat/platform-wide instead), and any table for "Request a custom style" — that feature is parked, not designed yet, per your instruction.

**Data fix needed before seeding real data:** your `stylist.json` has `specialityIds: ["knotless"]` for Tiwara's House — that's an individual service id where every other stylist's sample data uses a category id. Fix to `["braids"]` before this gets seeded into `business_specialities`.

**Duration:** store the upper bound of your "4–6h" style ranges as `default_duration_minutes`/`stylist_services.duration_minutes` (e.g. 360), keep `duration_display` as the cosmetic string shown to clients. A range can't be scheduled against; erring long is safer than erring short given the exclusion constraint above is what actually prevents overlaps.

**Radius search example:**
```sql
SELECT id, name,
       ST_Distance(location, ST_MakePoint($1, $2)::geography) / 1609.34 AS distance_miles
FROM businesses
WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3 * 1609.34)
  AND status = 'approved'
ORDER BY distance_miles ASC;
```

## 4. Auth & authorization

**Supabase Auth handles the mechanics** — JWT issuing, refresh rotation, password hashing, email verification, password reset, and (critically for §8's onboarding flow) invite-by-email. No custom JWT/bcrypt code, no second auth vendor.

- **Roles** live as one `role` column on `profiles` (`client` | `stylist` | `admin`), not a separate "is this user special" table. Tiwara's House being both the first stylist *and* the platform admin is then just a `profiles` row with `role = 'admin'` that also owns a `businesses` row — the same shape any future admin would have.
- **RLS policies** enforce ownership at the database level: a `businesses` row can only be updated where `owner_id = auth.uid()`; `appointments` are readable by the client who made them or the business that owns them; `admin`-role reads bypass these via a policy checking the role. This means even a bug in a function can't leak a cross-tenant write.
- **Guest checkout stays possible** — `appointments.client_id` is nullable, guest identity lives in the `guest_*` columns, and `manage_token` (an unguessable random string, never a sequential id) lets a guest reschedule/cancel via an emailed link with no login at all.

## 5. API surface

Two kinds of endpoint: direct-to-Supabase (simple CRUD under RLS, called with `@supabase/supabase-js` straight from the frontend, no custom code) and Edge Functions (anything with real logic).

**Direct-to-Supabase (no Edge Function needed):**
- Catalog reads: `service_categories`, `catalog_services`, `style_config_options` — public, read-only
- `businesses` search/profile reads (filtered to `status = 'approved'` by an RLS policy for anonymous users)
- A stylist reading/editing their own `businesses`/`stylist_services`/`availability_rules` rows (RLS-scoped to `owner_id = auth.uid()`)
- A client reading their own `appointments`/`favourites` (RLS-scoped to `client_id = auth.uid()`)

**Edge Functions (real logic, listed with what they do):**
- `submit-application` — the `/for-stylists` form (§8), creates a `pending` business row, emails admin via Resend
- `invite-stylist` — admin's "Accept" action, flips status to `invited`, calls Supabase Auth's `inviteUserByEmail`, sends the branded Resend email with the invite link
- `decline-application` — admin's "Decline" action, flips status to `declined`, optionally emails the applicant
- `complete-onboarding` — the final onboarding wizard submission, flips status to `approved`, generates the `slug`
- `available-slots` — combines weekly hours, existing appointments, time off into real bookable slots (the trickiest function in the whole system — see IMPLEMENTATION-PLAN.md for testing notes)
- `create-booking` — validates the slot is still free, **recomputes total/fee/deposit/balance server-side from stored prices** (never from client input), creates the appointment + Stripe PaymentIntent
- `cancel-booking` — computes the refund (50% if >24h out, 0% if ≤24h) and issues it via Stripe
- `reschedule-booking` — rejects if <48h out, creates the replacement appointment
- `stripe-webhook` — payment confirmation, flips `pending` → `confirmed`

## 6. Payments: Stripe Connect

Unchanged in substance from the earlier draft, confirmed details:

- Each approved stylist gets a Stripe Express connected account (Stripe hosts KYC).
- Client chooses **deposit (flat 25%) or full price** at booking — no per-service override, no per-stylist configuration.
- `create-booking` creates a `PaymentIntent` with `application_fee_amount` (the 2% client booking fee) and `transfer_data.destination` set to the stylist's account — Stripe splits it automatically.
- **Cancellation refund policy (platform-wide, not configurable per stylist):** more than 24 hours before the appointment, refund 50% of whatever was paid; 24 hours or less, no refund. Still open: whether a refund also claws back your `application_fee_amount` proportionally (`refund_application_fee: true`) or the platform keeps its cut regardless — worth a decision before `cancel-booking` is built, not blocking anything before then.
- Built **last** in the build order (§10) — most complex third-party integration, not needed until the core booking flow works end-to-end.

## 7. Onboarding & admin approval (two-phase, confirmed design)

**Phase 1 — Application (`/for-stylists`, public, no account yet):**
1. Stylist fills in the existing form fields (name, business name, postcode instead of free-text location, years of experience, email, phone, Instagram, category-level service interest, bio, portfolio link)
2. `submit-application` Edge Function creates a `businesses` row with `status = 'pending'`, `owner_id = NULL` — no account exists yet
3. Resend sends a notification email to Tiwara's admin inbox
4. The row appears in a new **admin dashboard "Pending Applications" view** (net-new page) with Accept/Decline actions

**Phase 2 — Admin decision:**
- **Accept** → `invite-stylist` flips status to `invited`, calls Supabase Auth `inviteUserByEmail`, and sends a custom-branded Resend email (not Supabase's default template) containing the generated invite link
- **Decline** → `decline-application` flips status to `declined`; defaulting to also sending a polite decline email unless you'd rather send nothing

**Phase 3 — Self-serve onboarding (the real wizard, net-new frontend):**
1. Stylist clicks the invite link → sets a password (Supabase Auth handles this) → `owner_id` gets linked to their new `profiles` row
2. Lands in the onboarding wizard, **pre-filled from their application data** (name/business/email/phone/Instagram/bio/category interest all carry over — nothing retyped)
3. Adds: postcode confirmation (city auto-filled from the postcodes.io lookup, editable), specific catalog services with **price + duration per service** (this is the field your original question was about — nothing in the current frontend collects it, it's fully new), portfolio image upload, weekly working hours
4. Submit → `complete-onboarding` generates the `slug`, flips status to `approved` directly — no second admin gate, since vetting already happened at the application stage

## 8. Address collection: postcode only

Confirmed from a couple of turns back: the stylist only ever types a postcode. `city` is auto-filled from the postcodes.io lookup response (shown for confirmation, editable — avoids the classic typed-city-doesn't-match-postcode mismatch) and `country` is a schema column defaulted to `'GB'`, never a form field, since the platform is UK-only and a postcode that doesn't resolve via postcodes.io is itself sufficient validation. `country` still matters technically because Stripe Connect requires a country code when creating each connected account (§6) — it just never needs to be something a stylist types.

## 9. Search & location

- Geocoding: postcodes.io, free, no key, UK-specific — used both at stylist onboarding and when a client searches by postcode.
- Radius filtering: PostGIS `ST_DWithin`/`ST_Distance` from day one (§3) — no reason to defer to a JS-side `geolib` phase now that PostGIS is free and bundled with Supabase.
- Free-text area search ("near Shoreditch", not just a postcode) is a later nice-to-have via `node-geocoder` + OSM Nominatim, not needed for MVP.
- A visual map of results is optional and later — if you want one, **Leaflet or MapLibre GL JS + OpenFreeMap tiles** is fully free with no metering, which is a better answer than either Google Maps or Mapbox (both meter usage at scale) to the original "which is cheaper" question.

## 10. Known frontend gaps found by reading the actual code

These came out of a direct code review, not just the data files — flagging them here so they're not lost before the build order references them.

- **`/for-stylists` currently submits nowhere** — real fields exist, but "submit" just shows a canned success message. §7 replaces this with a real `submit-application` call.
- **The booking wizard is missing two fields it needs**: `paymentPlan` (deposit vs full — nothing captures this choice today) and `hairTextureId` (Wigs needs it; your own `notes.md` already flags "hair texture isn't used yet"). Both need adding to `BookingState`.
- **`lengthIndex` is a positional array index, not an id** — fragile once length options come from a real API rather than a hardcoded array. Switch to storing the selected option's actual id.
- **`dayNumber` + `timeSlotId` don't carry enough information** to produce a real `start_at`/`end_at` — no year/month exists in `BookingState`, and slot ids are arbitrary labels from the hardcoded `booking-calendar.ts`. The `available-slots` function needs to return real ISO timestamps, and the frontend needs updating to carry them.
- **`money.ts` moves fully to integer-pence math**, not just the database — confirmed. Its own unresolved "IS THE CALCULATION CORRECT?" TODO is evidence of exactly the float-rounding problem pence-based math avoids.
- **Client-submitted totals must never be trusted** — `create-booking` always recomputes `total_pence`/`booking_fee_pence`/`deposit_pence` from the stored `stylist_services.price_pence`, never from whatever the client's review step calculated for display.
- **`star-rating.tsx` shows a hardcoded placeholder rating** — needs wiring to a real aggregate once `reviews` has data.
- **"Request a custom style" is parked** — fully designed in the frontend (`request-style-overlay.tsx`) with zero backend model, deliberately not being built now. Revisit later; no schema exists for it yet.

## 11. New frontend pages needed

None of these exist today — everything built so far is client-facing browsing/booking:

- Login / signup (client and stylist)
- Stylist onboarding wizard (§7, phase 3)
- Admin dashboard: "Pending Applications" (§7, phase 2) — Tiwara's own view, wearing the admin hat
- Stylist dashboard: bookings, availability/hours editor, earnings, profile/portfolio edit
- Client "my bookings" (reschedule/cancel, logged-in) and the guest manage-booking page (token link, no login)
- Favourites tab (later feature)

## 12. Security & compliance checklist

- SQL injection: not applicable in the way it would be with hand-rolled SQL — PostgREST and Edge Functions using `supabase-js` parameterize automatically. The only footgun is raw SQL string-building inside a function; don't do that.
- Every Edge Function that writes data checks `auth.uid()` against ownership before acting, on top of RLS — belt and braces, not either/or.
- Rate limiting on auth and booking-creation endpoints specifically (Supabase has some built in; add explicit limits in Edge Functions for booking spam).
- CORS locked to your actual frontend domain in Supabase project settings.
- UK GDPR: a plain-language privacy policy and a documented lawful basis for storing client contact details/notes — applies regardless of platform size.
- Portfolio image moderation: manual admin review before a stylist's images go live (you're already gating business approval, this piggybacks on the same review).
- Terms of service / liability page — standard for a platform facilitating paid in-person services between two parties who aren't you.
- Backups: Supabase's free tier has none included — a scheduled `pg_dump` via a free GitHub Actions cron job is a reasonable stopgap.

## 13. Cost, by stage

| Stage | Frontend | DB/Auth/Storage | Backend logic | Payments | Est. monthly |
|---|---|---|---|---|---|
| Building/testing | Vercel (free) | Supabase (free) | Edge Functions (free, 500k invocations) | Not needed yet | **£0** |
| Early live (a few dozen stylists) | Vercel (free) | Supabase (free — watch 500MB DB / 50k MAU caps) | Edge Functions (free) | Stripe, ~1.5%+20p/UK transaction, no monthly fee | **£0–£10/mo** (mainly the domain) |
| Growing (hundreds of stylists) | Vercel Pro if bandwidth exceeded | Supabase Pro ($25/mo) | Edge Functions (generous on Pro) | Stripe scales with revenue | **~£25–£60/mo** |

A Supabase free project auto-pauses after 7 days with zero requests — a scheduled ping (GitHub Actions or UptimeRobot) avoids this for a live demo link. SMS reminders (Twilio) and the domain (~£10/year) are the two costs with no meaningful free tier; start email-only and add SMS only if clients ask for it.

## 14. Build order

1. **Frontend fixes that don't depend on the backend at all** — `money.ts` to integer-pence math, add `paymentPlan` + `hairTextureId` to `BookingState`, switch length selection from index to id, add React Hook Form + Zod validation to the booking details step and the (currently unvalidated) `/for-stylists` form
2. **Supabase project + schema** — set up the project, run the §3 migration, seed the catalog tables from `services.json`/`style-config.json`, fix the `specialityIds` data bug first
3. **Auth + the two-phase onboarding flow** — Supabase Auth wired up, `submit-application`/`invite-stylist`/`decline-application`/`complete-onboarding` Edge Functions, **new frontend**: real `/for-stylists` submission, admin "Pending Applications" dashboard, the self-serve onboarding wizard (with the new price+duration-per-service fields), login/signup pages
4. **Search & discovery** — postcode geocoding, PostGIS radius query replacing `filter-stylists.ts`'s substring match, wired into the existing search page
5. **Booking engine** — `available-slots` (test this one explicitly, it's the trickiest function in the system) then `create-booking`/`cancel-booking`/`reschedule-booking`, wired into `use-booking-wizard.ts` with the field fixes from step 1 now landed
6. **Images** — Supabase Storage wired into onboarding's portfolio step and profile pages
7. **Payments** — Stripe Connect, deliberately last: deposit/full PaymentIntents, the 2% fee, the 50%/24h cancellation refund logic
8. **Reviews, favourites, stylist dashboard** (bookings/availability/earnings) — closes the loop

## 15. Deferred, not forgotten

- "Request a custom style" — parked per your instruction, no schema yet
- Multi-staff businesses (a `staff` table) — add if/when a multi-chair salon actually wants to onboard; today's schema doesn't block this, it just doesn't build it early
- Per-stylist cancellation policies — platform-wide fixed rule for now
- SMS reminders — email-only (Resend) until clients specifically ask
- Real photo previews for style customisation (vs. today's procedural canvas render) — the uploaded plan scoped this at ~80 curated photos across the whole catalog if you ever want to pursue it; not decided, just costed out for when you're ready to decide
