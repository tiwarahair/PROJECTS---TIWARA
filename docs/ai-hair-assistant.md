# AI Hair Assistant plan

Plan for the assistant in the *AI Hair Assistant* spec, written against **this repo as it is on** `develop`.

How the current product works: [`architecture.md`](./architecture.md).

Python layer walkthrough (login → photo → answer): [`ai-assistant-python-flow.md`](./ai-assistant-python-flow.md).

Front end / Supabase / Python dependencies: [`ai-assistant-layer-map.md`](./ai-assistant-layer-map.md).

Build order + FE/BE handoff: [`ai-assistant-build-order.md`](./ai-assistant-build-order.md).

**New chat / execution start:** [`ai-assistant-execution-handoff.md`](./ai-assistant-execution-handoff.md) (paste prompt at the bottom).

Keep this file up to date when scope or “reuse vs build” decisions change.

---

## 1. What we are trying to build

The spec describes three products that connect later:

1. **A helper for clients** — knows their hair, preferences, goals, routines, and past styles.
2. **A helper for stylists** — techniques, products, prep, aftercare, talking to the client.
3. **A layer on the marketplace** — advice can point to real stylists, services, and bookings.

**Version 1 is only the client helper.** Stylist tools and “find me a stylist / book it” come later.

The spec’s test for version 1:

> A user can upload an image, ask a relevant question and receive a useful, personalised answer.

In practice: they can sign in, they get a **new** short hair profile (not in the product today), we have written and reviewed Afro-hair care notes, they can send a photo and a question to a model that understands pictures and text, and the system knows when to stop and point to medical help instead of a stylist.

It does **not** mean opening search, checking live diaries, or creating a booking from the assistant yet.

### Why bother, given booking already works?

On `develop`, search, stylist pages, holds, and Stripe checkout are real. The assistant’s job is trusted, specialised advice that remembers this person. Later, a question can lead into the marketplace you already have.

What should make it different from a generic chatbot: quality of hair knowledge, people on the platform, what we know about this user, and (later) live service data.

---

## 2. What already exists (and what does not)

### Already in place — reuse for the assistant platform

| What | Where | How it helps |
|---|---|---|
| Supabase Auth + `profiles` | `src/lib/auth*`, onboarding, `session-slice` | Version 1 needs a signed-in user. Log-in / sign-up already exist (`/login`, `/signup`). |
| Private storage patterns | stylist photos, uploads in `src/lib` | Same idea for private hair photos (new bucket / policies). |
| Edge functions | `supabase/functions/` | Natural home for “call the model, keep the API key secret.” |
| Postgres + migrations + RLS | `supabase/migrations/` | Add tables for hair profile, chats, knowledge docs — same stack. |
| RTK Query API slice | `src/stores/api-slice.ts` | Add assistant endpoints the same way as booking/search. |
| Client account shell | `src/features/account/` | Real account area where a **new** hair profile UI could live. Today’s “Hair profile” nav is placeholder/demo only — not a feature. |
| Live search & booking | `/search`, `/book`, Studio | **Version 3** can open these with real data. Do not invent prices or slots. |
| Studio client notes | `src/features/studio/clients/` | Stylist-private notes (products, sensitivities). Useful later for version 2; **not** the client’s AI profile. |
| Help page | `/help` | Ordinary FAQs and email — separate from the assistant. |

### Not in this codebase anymore (older branch only)

These existed on an outdated UI-only tree (e.g. old `ovie` ≈ `main`). **Do not plan against them** on `develop`:

- Floating FAQ chatbot (`features/chatbot/`, regex replies)
- AI Style Discovery (canvas colour sampling + fake matches)
- Overlay-only “app” with no router
- Front-end-only fake stylist lists as the whole marketplace

If you still see those names in old notes or chats, they describe the wrong branch.

### Sketched but not real yet

| What | Today | For the assistant |
|---|---|---|
| Account “Hair profile” / quiz | Placeholder nav + demo fixtures; home quiz strip → `/search` | **Not shipped.** Build DB table + real edit/save/delete UI from scratch for v1. Quiz-as-feeder is optional and later. |
| Home phone “chat” | Fixed script in `src/data/chat.json` | Marketing only. Not a chat product to extend |

There is **no** language-model integration, **no** care-note knowledge base, and **no** AI conversation tables.

---

## 3. The system we want

Version 1 uses one model that can read text and pictures, this existing backend stack, and a set of written care notes. Do not start with many separate agents.

**A. The model**  
Use an existing service that can see images and answer in text. Do not train our own base model. Only consider extra training later if tests show a clear gap. Keep the vendor behind one adapter.

**B. Hair-care notes**  
A library we write and get reviewed (styles, wash day, swimming, sleep, prep, when to see a clinician). When someone asks, the server finds relevant notes and the model answers from those — not from guesswork. Each note should say source, reviewer, date, related services, and safety limits.

**C. What we know about the user**  

- Structured profile they filled in (current style, goals, lifestyle, sensitivities they choose to share, location, budget).
- Recent chat.
- This session: photo just sent, style under discussion.

Do not save the model’s guesses as facts. People must see, fix, and delete their data.

**D. Photos**  
Upload through the server, keep private, send to the model with the question. Describe what is visible. Do not claim porosity, scalp disease, or other hidden traits.

**E. Safety**  
Ordinary care advice / “this may need a professional look” / “this needs medical help now.” A stylist is never a stand-in for a doctor.

**F. Marketplace actions**  
**Not version 1.** Later: search stylists, show a profile, compare styles, get price/duration from the DB, check slots, book after a clear yes, save an approved preference.

### Fit with the stack you already chose

The product already has React + Supabase + edge functions (booking, Stripe). For the **assistant**, the working choice is a **separate Python service** that owns model calls, retrieval, and safety. Supabase will own users (already), plus **new** hair profile, chats, and photos tables/buckets.

Prefer:

- New tables + RLS in Postgres  
- Private storage for images  
- Python service that verifies the Supabase JWT, loads context, retrieves notes, calls the model, runs safety checks, saves the turn  
- Front-end feature (e.g. `src/features/assistant/`) that talks to Python (and to Supabase for profile/photos)

Booking edge functions stay as they are. Model API keys live in Python, not in `VITE_*` browser env.

Detail: [`ai-assistant-python-flow.md`](./ai-assistant-python-flow.md).

Suggested new entities (names can change): `hair_profiles`, `assistant_conversations`, `assistant_messages`, `knowledge_documents` (+ embeddings / search). Later: referrals, consent records, aftercare plans.

Access: clients only see their own chats and profile. Stylists only see what the client shared or what a confirmed booking requires. Studio hair notes stay stylist-private unless you design an explicit share.

---

## 4. How photos should be used

1. **Talking about this person’s hair (version 1)** — photo + question. Model describes what it sees, says when unsure, asks for missing info.
2. **Matching an inspiration photo (later)** — explain style, time/cost factors, then stylists via live search. There is no AI Style Discovery screen on `develop` to reuse; build this as a new flow when you need it.
3. **Helping a stylist prepare (version 2)** — only with photos the client agreed to share; can sit beside Studio client profiles.
4. **Health worries (rules in version 1)** — acknowledge, state limits, point to proper assessment. Never diagnose from a photo.

---

## 5. Safety and privacy (must ship with version 1)

### Three kinds of question

| Kind | Example | What we do |
|---|---|---|
| Ordinary | “How do I protect twists while sleeping?” | Practical advice from our notes |
| Uncertain | “My edges seem thinner.” | No diagnosis. Limited questions. Suggest assessment |
| Urgent | Sudden heavy loss, severe pain, spreading redness, infection signs | Point to medical care. UK wording needs clinical review |

Safety belongs in the Python service, not in front-end FAQ matching.

### Privacy

- Explicit consent for image processing  
- Private storage; time-limited access  
- Delete photos, chats, and profile fields  
- AI chats stay private; sharing with a stylist is later and explicit  
- Minimal retention  
- No training on customer photos without a separate opt-in (prefer never)  
- UK data protection  
- Never claim a photo proves porosity, scalp disease, or cause of hair loss

Version 1 should skip “share this photo with my stylist.”

---

## 6. Build steps (mapped to this repo)

Do these in order. Each step assumes the previous.

### Important Note — Leave marketplace booking behaviour alone

Do not start by wiring the assistant into `/search` or `/book`. Those already work. Version 1 answers questions; it does not create holds or charges.

### Step 1 — Extend Supabase data + add the Python AI service

Add migrations for hair profile, conversations, messages, knowledge documents (and search/embeddings as you choose — e.g. `pgvector` if you enable it).

Add a **Python service** that:

- verifies the Supabase JWT  
- loads allowed hair profile fields  
- retrieves care notes  
- loads recent messages  
- accepts a private image path / signed URL when present  
- calls the multimodal model  
- runs safety checks  
- saves the turn  
- only proposes profile updates the user confirms  

Wire the React app to Python via `src/lib` + RTK Query (and keep using Supabase client for auth, profile, and photo upload).

Full request path: [`ai-assistant-python-flow.md`](./ai-assistant-python-flow.md).

### Step 2 — Build the client hair profile (new)

This is **not** an existing feature. There is no DB table and no real front-end save path today — only a placeholder account section / demo fixtures.

Add:

- migration for `hair_profiles` (or equivalent) + RLS  
- real UI to create / view / correct / delete (new feature UI; can sit under `/account` or the assistant)  
- fields the assistant needs: current style, goals, lifestyle, sensitivities, location, budget, etc.  

Sign-in already exists. Gate the assistant behind session (`session-slice`).

Optional later: a real quiz that writes into this profile. The home quiz strip is not a quiz product.

### Step 3 — Write the care notes

Biggest non-coding workstream. Start narrow (e.g. braids, locs, wash day, swimming, sleep, gym, appointment prep, “we don’t diagnose”). Reviewed, with metadata.

Without this, the model will sound confident and stay generic.

### Step 4 — Build the assistant chat UI (new)

There is no product chat widget to “just rewire.” Add a new feature (route and/or panel — team choice), for example under `src/features/assistant/`:

- message list, composer, image attach  
- calls the new API  
- empty / error / safety states

Do not extend the home marketing phone animation (`chat.json`). Do not put this behind `/help` FAQ markup.

### Step 5 — Photo as context for the question

User journey for version 1:

1. Sign in
2. Open the assistant
3. Upload a private photo (optional but supported)
4. Ask a question
5. Answer uses photo + profile + retrieved notes
6. Uncertainty is visible; no “book now” push

### Step 6 — Personalisation

Each request includes structured profile, current session (image + question), and a short slice of recent chat.

Spec example: Ada has shoulder-length locs, swims twice a week → “What should I do after swimming?” must not be a generic tip.

### Step 7 — Safety on the server

Classify ordinary / concerning / urgent. UK referral copy reviewed. UI only displays the result.

Never present a stylist as clinical care.

### Step 8 — Closed test in this app

Run local stack (`yarn db:start`, `yarn start`), sign in, use the assistant, upload a photo, ask a focused set. Stylists review answers.

You are **not** testing whether search or Stripe checkout still work — except that you did not break them.

Golden set (~50–100): text-only care, photo + suitability, lifestyle, profile personalisation, safety cases, retrieval quality.

Version 1 should be **narrow and good**, not “ask anything.”

---

## 7. When version 1 is done

Ada is signed in. Her hair profile says shoulder-length locs and that she swims twice a week. In the assistant she uploads a photo and asks what to do after swimming.

The answer is about locs, covers drying / residue (or the same idea from our notes), does not diagnose her scalp, does not invent a stylist or a price, and she can delete the photo and the chat.

That is version 1.

---

## 8. Later versions

Do not start these until version 1 answers are useful in a small test.

### Version 2 — Helper for stylists

**Aim:** clients and stylists find it useful in real work.

- Stylist accounts and Studio profiles already exist — build **workflows** on top (prep, technique caveats, aftercare drafts).  
- Use shared client references only with consent.  
- Can sit next to Studio client hair notes without leaking AI chats by default.  
- Feedback from a small group of experienced stylists.

Still no requirement that the assistant completes a booking.

### Version 3 — Connect advice to the marketplace

**Aim:** go from a hair question to a suitable professional and eventually a finished appointment.

The model interprets intent. Ordinary app code queries and books. The model must not invent prices or slots.

Tools (illustrative): search stylists, get profile, compare styles, get service details, check availability, create booking after explicit confirmation, save approved preference.

**How that attaches to screens you already have:**

| Assistant outcome | Existing product surface |
|---|---|
| Matching stylists | `/search` with real filters / deep links |
| Book this service | `/book` for that stylist / service |
| Open stylist page | `/:slug` |
| After booking | `/manage`, account bookings, notifications you already send |

Also later: reminders, appointment prep, aftercare follow-up, optional products.

### After version 3

- Trusted Afro-hair education  
- Ongoing stylist relationship instead of starting from zero each time  
- Consultations, bookings, return visits, products

Add specialised agents only if splitting work clearly improves reliability. Fine-tune only after eval shows a stubborn gap that notes and prompts cannot fix.

---

## 9. How we know it is good

For each test case: accuracy, personalisation, honest image reading, usefulness, safety, retrieval quality, and (in version 3) true prices and slots.

Qualified people review hard and sensitive cases. Improve notes and instructions **before** considering extra training.

Success is return use, followed guidance, and (later) finding a service — not only high scores on a test sheet.

---

## 10. Notes specific to this repo

- Branch from current `develop`. Docs written against the old overlay-only tree are wrong for this codebase.  
- Put assistant UI in a new feature folder; put model calls in the **Python** service; use `src/lib` / RTK Query from the React app.  
- Coding rules in `CLAUDE.md`: Yarn, ask before new packages, tests when behaviour changes, CSS modules under `src/styles/`.  
- One data platform: auth, Studio, bookings, and assistant **data** share Supabase. Python is an AI worker, not a second copy of the marketplace.  
- Keep the model vendor replaceable.

---

## 11. Decisions

### Settled (working assumptions)

- [x] **AI runtime:** separate Python service (not edge-function-only). Browser → Python with Supabase JWT for v1. See [`ai-assistant-python-flow.md`](./ai-assistant-python-flow.md).
- [x] **Hair profile is optional for chat:** users can message without completing a profile; profile personalises when present (not a gate).
- [x] **Consent / safety copy:** drafted by engineering + Kashope (CEO); she leads expert/brand voice.

### Still open

- [ ] Which model for version 1  
- [ ] Care-note pack (Kashope leads content; Ovie stores/embeds)  
- [x] **Assistant placement:** global floating chat widget **plus** a dedicated history page (e.g. `/assistant`), ChatGPT/Claude-style. Same saved threads in Supabase. See build-order § product choices.  
- [ ] Whether a real hair quiz writes into `hair_profiles` in version 1 or later  
- [ ] Clinical sign-off for UK “see a clinician” wording if needed beyond Kashope’s review  
- [ ] Retention for photos and chats (guidance in build-order; pick 30 vs 90 day auto-purge vs keep-until-delete)  
- [ ] When (if ever) inspiration-photo → stylist matching is built  
