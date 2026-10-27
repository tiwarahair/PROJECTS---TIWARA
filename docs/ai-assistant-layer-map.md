# AI assistant: layer map (v1)

How the front end, Supabase, and the Python AI service interface for version 1 — including what each layer depends on.

Related:

- Overall plan: [`ai-hair-assistant.md`](./ai-hair-assistant.md)
- Request walkthrough: [`ai-assistant-python-flow.md`](./ai-assistant-python-flow.md)
- Current app: [`architecture.md`](./architecture.md)

---

## The three layers

```text
┌─────────────────────────────────────────────────────────────┐
│  A. React app (Vite)                                        │
│     Assistant UI, session from Redux, calls out             │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────┐   ┌─────────────────────────────┐
│  B. Supabase              │   │  C. Python AI service       │
│  Auth · Postgres · Storage│◄──│  JWT check · RAG · model    │
│  (source of truth)        │   │  safety · write reply       │
└───────────────────────────┘   └──────────────┬──────────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │  D. Model vendor    │
                                    │  (OpenAI, etc.)     │
                                    └─────────────────────┘
```

Booking edge functions, Stripe, and Studio are **not** on this v1 path. Python does not call them.

---

## Who calls whom

| From → To | How | What for |
|---|---|---|
| **A → B** | Supabase JS client (already in `src/lib/supabase.ts`) | Sign-in session (exists today); later also load/save **new** hair profile, conversations/messages, private photo upload, chat history, delete |
| **A → C** | HTTPS `POST /v1/chat` (and maybe health) with `Authorization: Bearer <supabase_jwt>` | “Answer this turn” — the only AI action the UI needs |
| **C → B** | Supabase Python client (user JWT and/or service role) | Verify user, read profile/history/image, search care notes, save assistant reply |
| **C → D** | Vendor SDK / HTTP | Multimodal completion |
| **B → A/C** | — | Supabase does not call React or Python; it only responds |

The front end has **two backends**: Supabase for data, Python for “think.”

---

## What each layer owns

| Layer | Owns | Does not own |
|---|---|---|
| **A. React** | Screens, forms, attaching a file, showing bubbles, gating on `session.loggedIn` | Model keys, RAG, safety classification, inventing answers |
| **B. Supabase** | Users/JWT (exists); **to add:** `hair_profiles`, conversations/messages, private images, knowledge rows (+ embeddings), RLS | Calling the LLM, prompt logic. Hair profile is not in the DB today. |
| **C. Python** | JWT verification, context assembly, retrieval, safety, model call, shaping/saving the assistant message | Login UI, Stripe, search/booking, being the long-term store of chats (that’s B) |
| **D. Model** | Tokens in / tokens out | Your users, your DB |

---

## Dependencies

### A (React) depends on

**From B**

- Working Auth (user can log in; JWT available)
- Tables + RLS for hair profile, conversations, messages
- Storage bucket + policies for assistant images
- Ability to read/write those as the signed-in user

**From C**

- Stable chat API: accept JWT + conversation/message (or text + image path), return reply (+ safety flag)
- CORS allowing the web app origin
- Clear errors (401/403/4xx/5xx) the UI can show

**From D**  
Nothing directly.

| If this is down… | What breaks |
|---|---|
| B | No login, profile, photos, or history |
| C | UI can still load history from B, but “Send” fails |
| D | C fails; A shows an error |

### B (Supabase) depends on

**From A**  
Only as a client: correct uploads, correct row shapes. B does not require C to exist.

**From C**  
Optional: C writes assistant rows. If C never runs, B still holds user data.

**From D**  
Nothing.

B is the **most independent** layer. You can migrate schema and build account hair-profile UI before Python exists.

### C (Python) depends on

**From B (hard dependency)**

- JWT verification against this Supabase project
- Read hair profile, messages, image bytes/URL
- Read knowledge documents
- Write assistant messages (and maybe retrieval metadata)

**From D (hard dependency)**

- Vision + text model API

**From A**  
Only that *someone* calls `POST /v1/chat` with a valid JWT and ids/paths that exist in B. A and C do not share React code or Redux.

| If this changes… | What breaks |
|---|---|
| B schema (e.g. column rename) | C until updated |
| A button copy | Nothing in C |

### D (model vendor) depends on

Nothing in your stack except API keys and request shape from C.

---

## One user turn (who depends on what mid-flight)

```text
1. A uses B Auth           → need session JWT
2. A uploads image to B    → need Storage + policies
3. A inserts user msg in B → need messages table + RLS
4. A calls C with JWT      → need C up + CORS
5. C verifies JWT via B    → need Supabase Auth
6. C reads profile/msgs/image/notes from B
7. C calls D               → need model API
8. C writes assistant msg to B
9. C returns JSON to A
10. A shows reply (from response and/or refetch B)
```

**Critical path for a reply:** A → C → (B + D) → C → A.  
**Critical path for “see my old chats”:** A → B only (Python unused).

---

## Shared contracts (the real interface)

Write these down so layers can be built in parallel.

### 1. Auth contract

Header: `Authorization: Bearer <supabase access_token>`.  
C must reject missing, invalid, or expired tokens.

### 2. Data contract (B schema)

Examples (names can change):

- `hair_profiles`
- `assistant_conversations`
- `assistant_messages`
- `knowledge_documents`
- Storage path convention: `{user_id}/{conversation_id}/…`

### 3. Chat API contract (A ↔ C)

Example:

```text
POST /v1/chat
Body: { "conversationId": "...", "messageId": "..." }
200: {
  "reply": "...",
  "conversationId": "...",
  "messageId": "...",
  "safety": "general" | "concerning" | "urgent"
}
```

Preferred pattern: A creates the user message in B first; C loads by id (avoids sending large images through Python twice).

### 4. Image contract

A uploads to B; C receives `image_path` (or a signed URL), fetches from B, sends to D.

### 5. Knowledge contract

Care notes live in B (or are indexed from B). C only queries them. Authors should not need to redeploy Python to change a care tip.

---

## What does not depend on what

| Myth | Reality in v1 |
|---|---|
| Python needs Deno / edge functions | No |
| React needs the model SDK | No |
| Supabase needs Python to store chats | No — Python is one writer among clients |
| Assistant needs `/book` or `/search` | No for v1 |
| Hair profile already exists to wire up | No — build table + real UI; account “Hair profile” is placeholder/demo only |
| Hair profile UI needs Python | No — only A ↔ B once the table exists |

---

## Build order from dependencies

1. **B first** — new schema (including `hair_profiles`), RLS, photo bucket (unblocks A and C).
2. **A ↔ B** — login (exists); **new** hair profile CRUD; chat shell that saves messages **without** calling Python (stub “thinking…”).
3. **C ↔ B + D** — `POST /v1/chat` works with curl and a real JWT.
4. **A ↔ C** — wire Send to Python.
5. Care notes in B so C retrieval isn’t empty.

---

## Tiny mental model

- **Supabase = filing cabinet + door key**
- **Python = specialist** who reads the file, calls the expert (model), writes the answer back
- **React = receptionist** who checks the key, files the photo and question, asks the specialist, shows the answer

Receptionist talks to both the cabinet and the specialist. Specialist talks to the cabinet and the expert. Cabinet talks to nobody on its own.
