# AI assistant v1 — build order (FE / BE handoff)

Shared plan so backend (Python + Supabase data) and front end can work in parallel.

Related:

- [`ai-hair-assistant.md`](./ai-hair-assistant.md) — product plan  
- [`ai-assistant-layer-map.md`](./ai-assistant-layer-map.md) — who talks to whom  
- [`ai-assistant-python-flow.md`](./ai-assistant-python-flow.md) — login → reply path

**Out of scope for v1:** `/search`, `/book`, Stripe, Studio, stylist assistant, “share photo with stylist.”

---

## Who does what

| Area                                                       | Owner (working assumption)                         |
| ---------------------------------------------------------- | -------------------------------------------------- |
| Supabase migrations, RLS, storage bucket, knowledge seed   | Backend (AI) — or PR reviewed with whoever owns DB |
| Python AI service                                          | Backend (AI)                                       |
| Assistant UI, hair profile UI, wiring to Supabase + Python | Front end                                          |
| Care-note content + clinical safety wording                | CEO (not only engineering)                         |
| Model vendor choice + API keys                             | Backend (AI)                                       |

Front end already has: Supabase Auth, `session-slice`, account shell, `src/lib/supabase.ts`, RTK Query patterns.

Front end does **not** already have: a real hair profile, assistant chat, or any call to a model.

---

## Contracts to agree first (do this before heavy UI)

Lock these in a short shared note or ticket. Names can change; shapes should not thrash weekly.

### Auth

- User must be signed in (existing `/login`).
- Every Python call: `Authorization: Bearer <supabase access_token>`.
- 401 → front end sends user to login (with return URL).

### Hair profile (new table — not in DB today)

Suggested fields for v1 (trim if needed):

| Field           | Type (conceptual)        | Notes                       |
| --------------- | ------------------------ | --------------------------- |
| `user_id`       | uuid, PK/FK to auth user | One profile per client      |
| `current_style` | text, optional           | e.g. “shoulder-length locs” |
| `goals`         | text, optional           | e.g. “retain length”        |
| `lifestyle`     | text, optional           | e.g. “swims twice a week”   |
| `sensitivities` | text, optional           | User-disclosed only         |
| `location`      | text, optional           | City / area                 |
| `budget_notes`  | text, optional           | Free text for v1            |
| `updated_at`    | timestamptz              |                             |

RLS: user can select/insert/update/delete **only their row**.

**Front end expects from backend:** table live locally + on staging; types via `yarn db:types` (or a typed helper in `src/lib`); clear error if no row yet.

### Conversations and messages

| Table | Purpose |
|---|---|
| `assistant_conversations` | `id`, `user_id`, `created_at`, `title` optional |
| `assistant_messages` | `id`, `conversation_id`, `role` (`user` \| `assistant`), `body` text, `image_path` nullable, `safety` nullable on assistant rows, `created_at` |

RLS: user only sees own conversations/messages.

**Preferred write path for a turn:**

1. FE creates/uses a conversation.
2. FE inserts the **user** message (and image path) into Supabase.
3. FE calls Python: `{ conversationId, messageId }`.
4. Python writes the **assistant** message.
5. FE shows the reply from the response and/or refetches messages.

### Photos

- Private bucket, e.g. `assistant-images`.  
- Path: `{user_id}/{conversation_id}/{uuid}.jpg` (or similar).  
- FE uploads via Supabase Storage (same idea as stylist uploads, but **private**).  
- Message stores `image_path` only.  
- Consent copy before first upload (product copy).

### Python chat API

```http
POST /v1/chat
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

{ "conversationId": "uuid", "messageId": "uuid" }
```

**200**

```json
{
  "reply": "string",
  "conversationId": "uuid",
  "messageId": "uuid",
  "assistantMessageId": "uuid",
  "safety": "general"
}
```

`safety`: `"general"` | `"concerning"` | `"urgent"`.

**Errors FE should handle**

| Status | Meaning | FE behaviour |
|---|---|---|
| 401 | Bad/missing JWT | Re-login |
| 403 | Not owner of conversation/message | Error toast; don’t retry blindly |
| 404 | Unknown ids | Error; refresh thread |
| 422 | Validation / missing image / empty body | Inline error |
| 503 / 5xx | Model or Python down | “Try again”; keep user message visible |

**Env for FE:** e.g. `VITE_ASSISTANT_API_URL` (origin only; no model secrets).

Until Python is ready, FE can mock `POST /v1/chat` and still build the full UI against Supabase.

---

## Build order (overview)

| Step | Name | Unblocks |
|---|---|---|
| 0 | Agree contracts + widget placement | **Done** |
| 1 | Supabase schema, RLS, photo bucket | **Done** on `feat/assistant-schema` |
| 2 | Hair profile (BE table already in 1; FE UI) | Personalised answers |
| 3 | Assistant chat UI against Supabase only (mock Python) | Demoable shell |
| 4 | Python service + model + safety (curl-tested) | Real answers |
| 5 | FE wires Send → Python | End-to-end |
| 6 | Knowledge notes + embeddings | Non-generic answers |
| 7 | Hardening: delete, consent, empty/error/safety UI | Closed beta |
| 8 | Closed test + eval set | Ship decision |

Steps **2 and 3** can overlap after step 1.  
Step **4** can start as soon as step 1 lands (even before polish on UI).  
Step **6** can start in parallel with 2–4 (content + seed scripts).

---

## Step 0 — Align with front end (½–1 day)

### Goal

Same picture of layers, contracts, and what v1 is not.

### Backend / AI brings

- This doc + layer map + Python flow.  
- Draft field list and `POST /v1/chat` shape (above).  
- Placement is decided: **global floating chat widget** (not a top-nav page). Account “Hair profile” placeholder can later link into profile edit inside/near the widget.

### Front end brings / decides

- Confirm widget details (corner, which pages, Studio yes/no).  
- Confirm: replace vs ignore current account “Hair profile” demo fixture.  
- Confirm mock strategy until `VITE_ASSISTANT_API_URL` exists.

### Done when

Everyone agrees on contracts and widget behaviour. FE can scaffold the assistant feature without waiting for migrations.

---

## Step 1 — Supabase foundation

### Goal

Data and storage exist so FE is not blocked.

### Backend delivers

- Migration(s): `hair_profiles`, `assistant_conversations`, `assistant_messages`, knowledge tables (can be minimal stub).  
- RLS policies.  
- Private `assistant-images` bucket + policies.  
- `yarn db:types` updated (or a short note for Faith/Abi: pull migration, reset local DB, run types if needed).  
- Seed user path documented for local testing.  
- Optional: one SQL example of insert profile + conversation + message.

### Front end can do in parallel (after contracts)

- Scaffold `src/features/assistant/` (fab + panel **and** `/assistant` history page).  
- Mount the widget from the shared layout (`AppLayout` or equivalent) so it appears on every page.  
- History page: list conversations + open a thread (same Supabase tables as the widget).  
- If chat requires login: opening while logged out → `/login?return=<current path>`.  
- **Do not** call a model; no secrets in Vite.

### Front end expects

- Local `yarn db:reset` (or equivalent) creates tables.  
- Signed-in client can CRUD own profile and messages from the browser with the existing Supabase client.  
- Upload to `assistant-images` succeeds only for own folder.

### Done when

FE (or BE) can insert a hair profile row and a user message in Studio SQL / app against local Supabase.

---

## Step 2 — Hair profile UI (front end) + API helpers

### Goal

User can create and edit the structured profile the assistant will read.

### Front end builds

- Form: current style, goals, lifestyle, sensitivities, location, budget notes.  
- States: empty (first-time), saved, validation errors, loading.  
- View / edit / delete (or clear fields).  
- Entry points: onboarding gate before first chat **and/or** settings under account.  
- Remove or replace demo fixture content so it never looks “real” when empty.

### Backend supports

- Stable column names.  
- RLS correct (no cross-user reads).  
- Optional: `src/lib` helpers or RTK endpoints **if** FE wants BE to add them; otherwise FE can use Supabase client directly like other features.

### Front end expects from backend

- Documented column names and nullability.  
- No Python required for this step.

### Done when

Signed-in user saves a profile, refreshes, sees the same data. Ada-style fields can be entered by hand.

---

## Step 3 — Chat shell against Supabase (mock Python)

### Goal

Full chat UX without the model.

### Front end builds

- Conversation list or single-thread v1 (single thread is fine).  
- Message list (user / assistant).  
- Composer + send.  
- Image attach → Storage upload → set `image_path` on user message.  
- On send: insert user message; call **mock** that returns a fake reply after 1s **or** insert a placeholder assistant row locally for UI only.  
- Loading / disabled send while “waiting.”  
- Empty state: “Ask about care, styles, or upload a photo.”  
- **No** book/search CTAs in v1.

### Backend supports

- Confirm message + storage behaviour from step 1.  
- Share mock response shape matching real `POST /v1/chat` so switching later is one client change.

### Front end expects

```ts
// Same shape as production
type ChatResponse = {
  reply: string;
  conversationId: string;
  messageId: string;
  assistantMessageId: string;
  safety: "general" | "concerning" | "urgent";
};
```

### Done when

FE demo: log in → fill profile → upload photo → send text → see a bubble (mocked). History survives refresh via Supabase.

---

## Step 4 — Python service (backend)

### Goal

Real `POST /v1/chat` with JWT, DB, model, safety — proven with curl, not the UI.

### Backend builds

- Service (FastAPI or similar).  
- Verify Supabase JWT.  
- Load profile, history, image, retrieve notes (even if notes are a tiny seed set).  
- Call multimodal model.  
- Safety paths: `general` | `concerning` | `urgent`.  
- Insert assistant message.  
- CORS for local Vite + staging origin.  
- Env: Supabase URL/keys, model key, no commit of secrets.

### Front end

- Continues step 3; no hard dependency until step 5.  
- May need staging URL when ready.

### Front end expects (when BE says ready)

- Published base URL for local/staging.  
- OpenAPI or short README: auth header, body, responses, error codes.  
- Example curl with a real JWT from the browser session.  
- Known limitation list (e.g. “retrieval empty until step 6”).

### Done when

BE can: log in as test user → insert message in DB → `curl` Python → assistant row appears → reply text sensible for a simple care question.

---

## Step 5 — Wire front end to Python

### Goal

Send uses the real service.

### Front end builds

- `src/lib/assistant-api.ts` (or RTK Query) calling `VITE_ASSISTANT_API_URL`.  
- Pass session access token.  
- Map `safety` to UI (especially `urgent` / `concerning` — distinct banner, not just another bubble).  
- Error handling per table above.  
- Remove mock when flag/env points at real API.

### Backend supports

- Stable contract; no breaking changes without notice.  
- Reasonable timeouts (FE should show “still working” after ~few seconds).

### Front end expects

- Same JSON as mock.  
- Assistant message persisted so refresh shows the real reply.  
- Idempotency note: if user double-clicks Send, what happens? (Recommend: FE disables Send until response; BE documents behaviour.)

### Done when

Full path on local: profile + photo + question → real model answer in UI, stored in DB.

---

## Step 6 — Knowledge base (content + embeddings)

### Goal

Answers grounded in reviewed notes, not generic model knowledge alone.

### Backend / content

- Author narrow pack: e.g. braids, locs, wash day, swim, sleep, gym, prep, “we don’t diagnose.”  
- Store text + metadata in Postgres; chunk + embed.  
- Re-embed script when notes change.  
- Python retrieval wired to those chunks.

### Front end

- No special UI required for v1 (optional “based on our care guides” footnote later).  
- May show generic disclaimer once (product copy).

### Front end expects

- No API shape change.  
- Better answer quality; BE may ask FE to retest known prompts (swim + locs).

### Done when

Ada-style prompt returns loc-specific, note-grounded advice in closed review.

---

## Step 7 — Hardening (both)

### Front end

- Delete conversation / delete image.  
- Image consent before first upload.  
- Profile delete / clear.  
- Safety UI copy for three paths (from product).  
- Block send if profile required fields missing (if product wants a gate).  
- Basic accessibility: focus, labels, errors.

### Backend

- Retention rules (even if “delete anytime; keep N days” TBD).  
- Rate limit chat endpoint.  
- Logging without storing full images in logs.  
- Confirm no training opt-in path (default: off).

### Done when

User can delete their data; urgent safety path visible; no secrets in FE bundle.

---

## Step 8 — Closed test

### Both

- Script of ~50 questions (care, photo, lifestyle, personalisation, safety).  
- FE provides stable build on staging.  
- BE provides eval notes / thumbs if wired.  
- Stylists or experts review sample answers.

### Done when

Version 1 bar met: signed-in user, profile, photo, useful personalised answer, medical boundaries — without booking CTAs.

---

## What to tell the front-end developer (short brief)

You can paste this:

> We’re building assistant v1 as: **React + Supabase (data/auth/photos) + Python (model only)**.  
>
> **Not in the product today:** hair profile (DB + real UI), assistant chat, knowledge base. Account “Hair profile” is demo only — we’ll replace it.  
>
> **You own:** global chat widget (icon + panel), dedicated `/assistant` history page (ChatGPT-style conversation list), hair profile form (optional, not a gate), Supabase reads/writes for profile/messages/images, then calling Python `POST /v1/chat` with the user’s JWT.  
>  
> **You don’t own / don’t call:** the model SDK, embeddings, Stripe, search, booking.  
>  
> **Pattern for each question:** upload image to private Storage if any → insert user message in Supabase → `POST /v1/chat` with `{ conversationId, messageId }` → show `reply` + `safety`. History always comes from Supabase, whether they used the widget or the full page.  
>  
> **You can start now:** fab + panel + history page shell against mocks. After migrations land, point at real tables. After Python is curl-green, swap mock for `VITE_ASSISTANT_API_URL`.  
>  
> **Contracts:** see `docs/ai-assistant-build-order.md` (fields, API, errors, widget + history page). Layer diagram: `docs/ai-assistant-layer-map.md`.

---

## Suggested ticket split

| Ticket | Owner | Blocked by |
|---|---|---|
| Agree widget details + contracts | Both | — |
| Migrations + RLS + bucket | BE | Contracts |
| Hair profile UI | FE | Migrations (can mock fields first) |
| Chat widget + `/assistant` history + Storage + mock chat | FE | Migrations |
| Python `/v1/chat` + curl demo | BE | Migrations (+ tiny note seed) |
| Wire FE → Python | FE | Python ready |
| Care notes pack + embed pipeline | BE + content | Migrations |
| Delete / consent / safety UI | FE | Chat UI |
| Rate limit / retention / logging | BE | Python |
| Closed beta script | Both | Wire + notes |

---

## Product choices that affect FE layout

### 1. Where does the assistant live in the app? — decided

**Both: global chat widget + a dedicated history page (ChatGPT / Claude style).**

The widget is only the **entry point**. Chats are still saved in Supabase (`assistant_conversations` / `assistant_messages`). Same data whether they chat from the floating panel or from a full page.

| Piece | How it works |
|---|---|
| Icon | Floating button on pages (e.g. bottom-right). Tap → panel over the current page; URL usually stays put. |
| Panel | Quick chat: messages, composer, image attach, access to recent thread(s). |
| Dedicated page | e.g. `/assistant` — sidebar (or list) of past conversations + main thread. “Open history” / “All chats” in the widget links here. |
| Storage | Always Supabase. Closing the widget does **not** discard the thread. Refresh / other device (same account) can reload history from the DB. |
| Login | Logged out → `/login?return=…` then back; history only for signed-in users. |
| Hair profile | Optional; personalises when present (see #2). Can edit from widget or account. |

**Mental model:** widget = quick ask while browsing; `/assistant` = full inbox of past chats (rename / delete / continue). One backend, two UIs over the same tables.

**What Faith / Abi build:** fab + panel in the shared layout, **and** an `/assistant` (or similar) route for history. Shared components for the message list/composer so both surfaces stay in sync. Confirm whether the widget shows on `/studio` (clients-only vs everyone).

### 2. Must they finish a hair profile before chatting? — decided

**No.** They can send a first message without a completed profile. The profile **personalises** answers when present; it is not a gate.

FE: soft prompt / optional “Add hair details for better answers” is fine; do not block Send.

### 3. Who writes consent and safety copy? — decided

**Mix of the engineering team and Kashope (CEO).** Engineering can draft; Kashope reviews / owns the expert and brand voice, especially care and “see a clinician” wording.

### 4. How long do we keep photos and chats? — still open (guidance)

There is **no single legal “standard number of days.”** UK GDPR says keep data only as long as you need it for a stated purpose, then delete or anonymise. You must publish the period (or the criteria) in the privacy notice.

**What consumer AI apps often do**

| Product pattern | Typical behaviour |
|---|---|
| ChatGPT / Claude (consumer) | Keep chats **until the user deletes**; after delete, often purged from systems within ~30 days (vendor policy; not a template you must copy). |
| Gemini (consumer) | Longer default history (e.g. months) unless the user changes/deletes. |
| Support / business chatbots | Common engineering default: **30–90 days** of identifiable transcripts for quality/complaints, then delete; keep longer only for open disputes or legal hold. |

**Sensible starting point for Tiwara’s assistant (health-adjacent + photos)**

| Data | Suggested v1 default | Why |
|---|---|---|
| Chat messages | Keep while the account exists **and** user can delete anytime; plus auto-delete inactive threads after **90 days** (or 30 if you want stricter) | Matches “my history” UX + GDPR minimisation |
| Uploaded photos | Same as the message they’re attached to; delete file from Storage when message/thread goes | Photos are more sensitive |
| After user hits delete | Remove from app DB/Storage promptly; allow up to ~30 days in backups/logs if needed | Common vendor pattern |
| Aggregated metrics (no personal data) | Longer / indefinite | Fine if truly anonymous |

Model providers also retain data under **their** DPA — pick a provider that does **not** train on API data by default, and say so in the privacy notice.

**Decide with Kashope:** pick 30 vs 90 days for auto-purge (if any), and confirm “keep until user deletes” for active history. Ovie implements the job; Faith/Abi expose delete in the UI.