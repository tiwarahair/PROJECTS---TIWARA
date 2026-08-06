# Tiwara's House — Implementation Plan

Executes BACKEND-PLAN.md §14 against your actual repo, in order. Each phase names the real files it touches and the commands it runs. Follow CLAUDE.md's rules throughout: new branch off latest `main` for all of this, never commit to `main`, ask before adding any new dependency not already named in BACKEND-PLAN.md.

## Phase 0 — Frontend fixes that need no backend at all

Do this first and separately — none of it depends on Supabase existing yet, so it can land on `main` (via its own branch/PR) before anything else starts.

1. **`src/data/stylist/stylist.json`** — fix `specialityIds: ["knotless"]` → `["braids"]` for Tiwara's House.
2. **`src/utils/money.ts`** — rewrite `calcDeposit`/`calcPlatformFee`/`formatPence` to operate on integer pence throughout, not floats. Update `src/utils/money.test.ts` accordingly.
3. **`src/types/booking.ts`** — add `paymentPlan: "deposit" | "full"` and `hairTextureId: string | null` to `BookingState`. Replace `lengthIndex: number` with `lengthId: string | null` (or keep both temporarily if the length-picker UI needs the index for rendering order, but the value sent anywhere it matters should be the id).
4. **`src/features/booking/use-booking-wizard.ts`** — wire the two new fields into `initialState`/`selectLength`/a new `selectPaymentPlan`/`selectHairTexture`, update `totalsOf`/`snapshotOf` if the pence-math change in step 2 affects their signatures.
5. **`src/features/booking/step-details.tsx`** — add React Hook Form + Zod validation (this was already planned before this thread started; nothing here changed).
6. **`src/features/pages/stylists-page.tsx`** — leave the UI mostly as-is for now (it becomes the real application form in Phase 2), but this is a natural place to also add Zod validation on the existing required fields while you're in the file.

## Phase 1 — Supabase project & schema

1. Create the project at supabase.com (free tier).
2. In the repo root:
   ```
   yarn add @supabase/supabase-js
   yarn add -D supabase
   npx supabase init
   npx supabase link --project-ref <your-project-ref>
   ```
3. Create `supabase/migrations/20260806_initial_schema.sql` with the full schema from BACKEND-PLAN.md §3 (extensions, enums, all tables, the exclusion constraint).
4. `npx supabase db push` to apply it.
5. Write a small Node script (`scripts/generate-seed.ts`, run once, not a permanent part of the build) that reads `src/data/services/services.json` and `src/data/style-config/style-config.json` and emits `supabase/seed.sql` — INSERTs for `service_categories`, `catalog_services`, `style_config_groups`, `category_config_groups`, `style_config_options`. Generating this from the actual JSON (rather than hand-typing it) is what guarantees the ids match your frontend exactly, per BACKEND-PLAN.md §3's "no translation layer" principle.
6. `npx supabase db push` again (or `psql` the seed file directly) to load the catalog data.
7. Add `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, confirm it's already covered by `.gitignore`.
8. `src/lib/supabase.ts` (new file) — the single `createClient()` call the rest of the app imports from.

**Checkpoint before moving on:** manually insert one test business row and one appointment row in the Supabase dashboard's SQL editor, then try to insert a second overlapping appointment for the same business — confirm the exclusion constraint from §3 actually rejects it. This is the single most important integrity rule in the schema; verify it before building anything on top of it.

## Phase 2 — Auth & the two-phase onboarding flow

1. `npx supabase functions new submit-application`, `invite-stylist`, `decline-application`, `complete-onboarding` — scaffolds under `supabase/functions/`.
2. Implement each per BACKEND-PLAN.md §5/§7. `invite-stylist` is the one worth extra care: it calls `supabase.auth.admin.inviteUserByEmail()` (needs the service-role key, only ever used inside an Edge Function, never shipped to the frontend) and then sends the branded Resend email containing that invite link.
3. **New frontend, in order:**
   - `src/features/auth/` — login/signup pages (client-facing), using `supabase.auth.signInWithPassword`/`signUp` directly from `supabase-js`
   - Rework `src/features/pages/stylists-page.tsx` — on submit, call `submit-application` instead of the current fake local-state success message
   - `src/features/admin/pending-applications-page.tsx` (new) — lists `businesses` where `status = 'pending'`, Accept/Decline buttons calling the two Edge Functions
   - `src/features/onboarding/` (new directory) — the multi-step wizard from BACKEND-PLAN.md §7 phase 3: postcode confirmation, service selection with price+duration per service, portfolio upload placeholder (real upload lands in Phase 5), working hours. Pre-fill every field it can from the application data passed in via the invite link.
4. Add the RLS policies from BACKEND-PLAN.md §4 in a follow-up migration (`supabase/migrations/<timestamp>_rls_policies.sql`) — write these as their own file so they're reviewable independently of the table definitions.

**Checkpoint:** submit a real test application through the `/for-stylists` form, accept it from the admin page, click through the emailed invite link end-to-end, confirm the onboarding wizard actually pre-fills.

## Phase 3 — Search & discovery

1. Replace `src/utils/filter-stylists.ts`'s substring match with a call to a `search-businesses` Edge Function (or a Postgres function exposed via RPC) that geocodes the client's postcode via postcodes.io and runs the `ST_DWithin` query from BACKEND-PLAN.md §3.
2. Wire it into `src/features/search/search-page.tsx` and `use-search-filters.ts`, replacing the current `STYLISTS` static-array filtering.
3. Update `src/data/stylist/stylist.ts`'s helper functions (`findStylist`, `getOfferedServices`, etc.) to read from Supabase instead of the static JSON — this is the point where `stylist.json` stops being imported directly.

## Phase 4 — Booking engine

1. `npx supabase functions new available-slots create-booking cancel-booking reschedule-booking`.
2. **`available-slots` first, and test it in isolation** before building anything that calls it — per BACKEND-PLAN.md §5, this is the trickiest function in the system (weekly hours minus existing appointments minus time off).
3. `create-booking`: validate the slot is still free, recompute `total_pence`/`booking_fee_pence`/`deposit_pence`/`balance_pence` server-side from `stylist_services.price_pence` and any add-ons — never from the request body's price fields.
4. **Concurrency test, explicitly:** fire two `create-booking` requests for the exact same slot at nearly the same time (a simple `Promise.all` in a throwaway script is enough) and confirm exactly one succeeds and the other gets a clean "that slot was just taken" error from the exclusion constraint.
5. Wire `use-booking-wizard.ts` to the real endpoints, now that Phase 0's field fixes (`paymentPlan`, `hairTextureId`, length-by-id) are already in place.

## Phase 5 — Images

1. Create a Supabase Storage bucket for portfolio images, with an RLS policy scoping writes to the owning stylist and public read access for approved businesses.
2. Wire actual upload into the onboarding wizard's portfolio step (Phase 2) and into a stylist profile-edit page.

## Phase 6 — Payments (last, per BACKEND-PLAN.md §6)

1. Create the Stripe account, enable Connect.
2. `npx supabase functions new stripe-webhook`.
3. Extend `create-booking` to create the `PaymentIntent` with `application_fee_amount` and `transfer_data.destination`.
4. Extend `cancel-booking` with the 50%/24h refund calculation and the actual `stripe.refunds.create` call — resolve the still-open "does a refund also claw back the platform fee" question (BACKEND-PLAN.md §6) before this ships.
5. Add Stripe Elements to the review/confirm step of the booking wizard.

## Phase 7 — Reviews, favourites, stylist dashboard

1. `POST`-equivalent Supabase insert for reviews, gated to `appointment.status = 'completed'` via RLS or a check in a lightweight Edge Function.
2. Favourites — direct Supabase insert/delete under RLS, no Edge Function needed.
3. Stylist dashboard pages: bookings list, availability/hours editor (this is where `react-big-calendar` or `FullCalendar` from the original packages list earns its place), earnings (aggregates `appointments` + Stripe payout data).
4. Wire `star-rating.tsx` to a real aggregate from `reviews` instead of its current hardcoded placeholder.

## Not in this plan

"Request a custom style," multi-staff businesses, per-stylist cancellation policies, SMS reminders, and real (non-procedural) style-preview photos are all deliberately out of scope here — see BACKEND-PLAN.md §15 for why each is deferred rather than forgotten.
