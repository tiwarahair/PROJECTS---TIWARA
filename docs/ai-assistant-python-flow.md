# AI assistant: Python layer flow

End-to-end path for version 1 when the AI assistant is owned as a **separate Python service**, and the existing React + Supabase app stays the product shell.

Related:

- Overall plan: [`ai-hair-assistant.md`](./ai-hair-assistant.md)
- Layer dependencies: [`ai-assistant-layer-map.md`](./ai-assistant-layer-map.md)
- Current app: [`architecture.md`](./architecture.md)

**Decision (leaning / working assumption):** Python does the model work. Supabase remains source of truth for users (already) and for **new** hair profile, chats, and photos. Browser talks to Python with a Supabase JWT (no Deno proxy required for v1).

**Note:** A client hair profile is **not** in the product today (no DB table, no real FE feature — only account placeholder/demo UI). It must be built as part of assistant v1.

---

## What’s talking to what

```
Browser (React)
    │  Supabase Auth (same as /account, /book)
    │
    ├─► Supabase  (users, hair profile, chats, private photos, care-note rows)
    │
    └─► Python AI service  (retrieve notes, call model, safety, shape the reply)
              │
              └─► Model API (OpenAI / etc.)
```

Secrets for the model live in Python. The browser never sees them.

---

## Step by step

### 1. Log in

1. User opens `/login` (existing onboarding).
2. Supabase Auth signs them in. React already puts that session in Redux (`session-slice`).
3. They get a **JWT** (access token) the client can send on later requests.

The AI owner does **not** implement login. The assistant only requires “must be logged in.”

### 2. Open the assistant

1. User goes to the new UI — e.g. `/assistant` or a section under `/account` (open decision).
2. Front end checks `session.loggedIn`. If not, send them to `/login?return=/assistant`.
3. Front end loads their **hair profile** and **recent conversation** from Supabase (RLS: only their rows) — both are **new** data once migrations exist.

If they have no profile yet, show a short form (current style, goals, lifestyle, etc.) and save to a new `hair_profiles` table. Do not rely on the current account “Hair profile” placeholder.

### 3. Upload an image

1. User picks a photo in the assistant UI.
2. Front end uploads to a **private** Supabase Storage bucket (e.g. `assistant-images`), path like `{user_id}/{conversation_id}/{file}`.
3. Storage policies: only that user can upload/read; no public URLs.
4. Front end keeps a **storage path** (or a short-lived signed URL). Prefer not sending the raw file to Python when a path/signed URL is enough.
5. Optionally insert a message row: role `user`, image attached, `image_path` set.

Consent once: “We may send this photo to our AI provider to answer your question.”

### 4. Ask a question

1. User types something like: “What should I do after swimming?”
2. Front end saves a user message in `assistant_messages` (text + optional image path).
3. Front end calls the **Python service**, for example:

   `POST /v1/chat`  
   Headers: `Authorization: Bearer <supabase_jwt>`  
   Body: `{ conversationId, messageId }`  
   (or `{ conversationId, text, imagePath }` if Python creates the row)

4. Python **verifies the JWT** with Supabase (same project as the app). Invalid → 401. User is not the conversation owner → 403.

Do not trust the browser’s word about who they are.

### 5. What Python does on that request

One request pipeline for v1:

1. **Auth** — verify JWT → `user_id`.
2. **Load context from Supabase** (service role or user-scoped client):
   - hair profile for `user_id`
   - last N messages in this conversation
   - image: fetch via signed URL or storage API if present
3. **Retrieve care notes** — search the knowledge store (e.g. Postgres + `pgvector`, or embedded docs) for the topic (e.g. locs + swimming + aftercare).
4. **Safety gate** — classify ordinary / concerning / urgent (rules + model). If urgent, skip casual advice and return referral wording.
5. **Call the model** — system prompt + profile + retrieved notes + history + image + user question.
6. **Validate reply** — no fake prices/stylists; no diagnosis claims.
7. **Save** assistant message to Supabase (role `assistant`, text, optional `safety_path`, `retrieved_doc_ids`).
8. **Return** `{ reply, conversationId, messageId, safety: "general" }` to the browser.

Streaming (token by token) is optional for v1. A single JSON reply is enough for a closed test.

### 6. Receive the response

1. React gets the JSON (or stream).
2. UI appends the assistant bubble (or refetches messages from Supabase so refresh stays correct).
3. User sees the answer. If safety was “urgent”, show the referral block more clearly.
4. User can delete the conversation/photo later → front end deletes storage object + rows under RLS. Python does not have to own delete if policies allow the user to do it.

---

## One-line summary

**Log in with existing Supabase Auth → open assistant UI → profile from DB → photo into private Storage → question saved → Python checks JWT, loads profile/history/notes/image, calls model, saves reply → UI shows reply.**

---

## Who owns what

| AI owner | Already there / others |
|---|---|
| Python service, prompts, RAG, safety | Login UI, session, Stripe, Studio, `/book` |
| Assistant UI + calls to Python from `src/lib` / RTK Query | Site chrome, onboarding |
| Migrations (or PRs) for hair profile, chats, knowledge | Core `profiles` / bookings schema |
| Model API keys, eval set | Booking edge functions |

---

## Browser → Python vs Edge → Python

| Option | Role |
|---|---|
| **Browser → Python** (v1 default here) | Simpler while only the AI is owned. CORS + JWT verify on Python. |
| Browser → Edge → Python | Browser only talks to Supabase; needs a tiny Deno proxy someone ships. |

Working choice for this doc: **browser → Python with Supabase JWT**.

---

## What “done” looks like on this path

Ada is logged in. Profile says shoulder-length locs and that she swims twice a week. She uploads a photo in the assistant, asks about after swimming. Python pulls her profile + loc/swim notes + image, the model answers specifically, the reply is stored, the UI shows it — no booking CTA, no invented stylist.

---

## Out of scope for this flow

- Wiring the assistant into `/search` or `/book` (later milestone)
- Stylist-facing assistant (version 2)
- Reimplementing auth, Studio, or payments in Python
