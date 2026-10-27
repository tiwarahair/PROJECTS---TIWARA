# How the website works today

Snapshot of **this repo on `develop`** (also what `ovie_develop` matches). Not a plan for the AI assistant — that lives in [`ai-hair-assistant.md`](./ai-hair-assistant.md).

Also useful:

- Getting started: [`README.md`](../README.md)
- Coding rules: [`CLAUDE.md`](../CLAUDE.md)

Staging: [dev.tiwarashouse.com](https://dev.tiwarashouse.com/)

## What Tiwara's House is

A UK hair booking platform for textured hair. Clients search for stylists, book and pay a deposit (or more) through Stripe. Stylists run their business in **Studio** (services, diary, clients, settings, payouts).

This is a **full-stack app**, not a clickable mock. Accounts, stylists, services, slots, holds, and payments go through Supabase and edge functions.

## Tech stack

### Front end

- React 19, TypeScript 5.9, Vite
- React Router (real URLs)
- Redux Toolkit + RTK Query for server data
- React Hook Form + Zod
- Lucide icons, GSAP on the home page
- CSS modules under `src/styles/` (styles stay out of feature folders)

### Back end

- **Supabase**: Auth, PostgreSQL, storage, edge functions, scheduled jobs
- **Stripe**: Connect for stylists, card checkout for clients
- Resend (email), Twilio (SMS), Cloudflare Turnstile (bot checks), Google Maps (places / maps)

Hosted on Vercel. Local stack needs Docker + `yarn db:start`.

## How you move around the site

This is **not** a single home page with panels sliding over it. Each main flow has its own path.

| Path | What it is |
|---|---|
| `/` | Marketing home |
| `/search` | Find stylists (live search) |
| `/:slug` | Public stylist page |
| `/book` | Client booking flow |
| `/manage` | Change or cancel a booking (token / code) |
| `/save-details` | Save details after booking |
| `/account` | Client account |
| `/help` | Help and support |
| `/login`, `/signup`, `/join` | Auth and stylist join |
| `/studio` | Stylist business app |

Routing lives in `src/app-router.tsx`. Pages load lazily. `src/app-layout.tsx` only handles scroll restoration and an outlet.

Entry point: `src/main.tsx` (store, auth listener, cache listener, router).

## Folders that matter

```
src/
  main.tsx, app-router.tsx, app-layout.tsx
  features/     home, search, booking, account, onboarding,
                studio, stylist-profile, manage-booking, help, …
  components/   shared UI (header, toasts, forms, …)
  stores/       Redux + RTK Query API slice
  lib/          Supabase client, auth, search, booking, studio, Stripe helpers
  types/        including generated database.ts
  data/         static JSON (FAQs, service groups, home demo chat, …)
  styles/       CSS modules mirroring features/
  hooks/, utils/, test/

supabase/
  migrations/   schema and RLS
  functions/    edge functions (booking, Stripe, notifications, …)
  seed.sql      local demo data

api/            small Vercel helpers (e.g. link preview), not the main app API
```

## State

Redux (`src/stores/store.ts`) holds:

- **session** — logged in or not, user id, email, stylist/admin flags (`session-slice.ts`, driven by `auth-listener.ts`)
- **favourites** — saved stylists
- **toast** — short messages
- **api** — RTK Query cache (`api-slice.ts`)

Most booking and Studio UI still uses local React state inside feature hooks. Server reads/writes go through `src/lib/*` and the RTK Query API (search, public profiles, slots, holds, checkout, manage booking, studio fetch, 2FA devices, and so on).

## Accounts and roles

Supabase Auth. Onboarding UI is in `src/features/onboarding/` (`/login`, `/signup`, `/join`).

`profiles` store name, phone, marketing preference. A stylist row links to the owner profile (`stylists.owner_id`). Session exposes `isStylist` / `isAdmin`.

Clients use `/account`. Stylists use `/studio` after join / onboarding.

## Marketplace (real)

### Search

`/search` calls live stylist search (`src/lib/search-api.ts` → database). Filters include service group, place (Google Places), and more. Results are not a hard-coded front-end list.

`src/data/stylists.json` is seed / reference style data for the product catalogue story — not “the search index.”

### Public stylist page

`/:slug` loads a public profile from the database (`public-profiles` / `public-stylist` helpers). Portfolio, services, hours, book CTA.

### Booking

`/book` is a multi-step flow against a real stylist:

1. Service  
2. Customise  
3. Time (slots from the server)  
4. Details  
5. Review  
6. Pay (Stripe)

There are holds, travel-area checks, resume banners, size guide, and confirmation. Edge functions cover calendar, hold, checkout, cancel, invite, webhooks, and related jobs.

### Manage booking

`/manage` lets someone view, reschedule, or cancel with a secure link / code — not only while logged in.

## Studio (stylist side)

`/studio` is the business app: home, bookings, clients, services catalogue, settings (profile, availability, payouts / Stripe Connect, security / 2FA, notifications), and sheets/overlays inside Studio.

**Client hair notes in Studio** (`features/studio/clients/…`) are notes the **stylist** keeps about a client (products, sensitivities). Private to that stylist. They are **not** the client’s own hair profile for an AI assistant.

## Client hair profile — not a product feature yet

There is **no** client hair profile in the database (no `hair_profiles` table or equivalent). Nothing is saved or loaded for personalisation.

What exists today is only **placeholder chrome**:

- `/account` has a nav item labelled “Hair profile.” In demo / fixture mode it can show hard-coded sample rows or an empty “take the quiz” CTA. That is not backed by the API.
- The home **quiz strip** (`features/home/quiz-strip.tsx`) is marketing: chips into `/search?group=…`. There is no quiz wizard and no write path into a profile.

For the AI assistant, hair profile is **new work** on both front end and database. Do not treat the account section as an existing feature to “wire up.”

## What looks like “chat” but is not an AI assistant

On the home page, a phone animation plays a fixed script from `src/data/chat.json` (`use-chat-sequence.ts`). That is marketing (“booking by messaging is messy”), not a product chatbot.

There is **no** floating help chatbot, **no** AI Style Discovery, and **no** model calls in this codebase. Help is `/help` (FAQs + email).

## Database (high level)

Generated types: `src/types/database.ts` (from `yarn db:types`).

Among other things: `profiles`, `stylists`, `stylist_private`, services and variations, add-ons, working hours, time blocks, portfolio photos, bookings and related tokens/events/codes, notifications, Stripe Connect / tax details, rate limits, public search helpers.

Row level security is on. Clients see their own account data; stylists see what they own; booking manage paths use tokens and verification.

There are **no** tables yet for AI conversations, care-note documents, embeddings, or a client hair-characteristics profile used by an assistant.

## Edge functions

Under `supabase/functions/`, including: booking calendar / hold / checkout / cancel / invite, Stripe Connect and webhooks, notifications, tax details, purge closed businesses, email status.

These are where secrets stay (Stripe, etc.). The Vite app uses the publishable Supabase key and calls RPCs / functions through `src/lib`.

## Static data in `src/data/`

JSON used by the front end for catalogues and copy: service groups/types/specs, colours, FAQs, default add-ons, platform customisations, password blocklist, home chat script, seed addresses, and similar.

Live stylists and bookings do **not** live only in these files.

## What this architecture is not

- Not a front-end-only prototype
- Not overlay-only navigation (that was an older branch)
- Not an AI product yet
- Not a client hair profile or hair quiz product (only account/demo placeholders)
- Not “fake” search and booking on `develop` — those paths talk to Supabase and Stripe

## If you add something new

1. Prefer a real route under `app-router.tsx` and a feature folder, with CSS under `src/styles/features/…`.
2. Server secrets and model keys belong in Supabase edge functions (or similar), not in Vite env exposed to the browser.
3. Use RTK Query / `src/lib` for server reads and writes; keep session in the existing session slice.
4. Do not confuse Studio’s stylist-owned client notes with a client-owned hair profile for the assistant.
5. Branch from up-to-date `develop`. The old `ovie` tip that matched `main` described an outdated UI-only tree.
