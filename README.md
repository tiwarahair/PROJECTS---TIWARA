# Tiwára's House

A hair booking Saas platform for salon owners and paying clients. A full-stack application.

## Current Environments

Staging area - [dev.tiwarashouse](https://dev.tiwarashouse.com/) & local

### Branch management

- Main development branch - `develop` - all changes should be branched off the most up to date `develop` branch, all changes must be tested
- Merges into `main` are held off until tests are completed in the staging area.

## Getting Started

### Prerequisites

- Node via nvm (version pinned is in `.nvmrc`)
- Yarn
- Docker Desktop (running)

### Set-up

After cloning down the repo, run these commands:

- `nvm use`
- `yarn` - install dependencies
- `cp .env.example .env.local && cp supabase/.env.example supabase/.env && cp supabase/.env.example supabase/functions/.env` - create the 3 needed .env files
- `yarn db:start` — start the local Supabase stack (first run downloads docker images, takes a few minutes)
- run `yarn supabase status` -> copy what it returns, paste the the API URL into `VITE_SUPABASE_URL` & the publishable key to `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`
- In both `supabase/.env` and `supabase/functions/.env`, generate your own `TAX_ENCRYPTION_KEY` — run `openssl rand -base64 32` to get the key
- message @faithod/a team member privately for the `.env` files
- run `yarn supabase stop && yarn db:start` — restart so the stack picks up the secrets
- run `yarn db:reset` — applies migrations and loads the demo stylists and scheduled-job secrets
- run `yarn start`
- optionally run a check: `yarn format && yarn lint && yarn typecheck && yarn test && yarn db:test`

#### Database set-up

- `yarn db:start` - start the local database stack (the first run downloads the Docker images and takes a few minutes)

#### Other

Useful local links:

- Supabase Studio (database UI): http://127.0.0.1:54323
- Mailpit (catches every email sent locally): http://127.0.0.1:54324

## Built With

### Front-end

- React 19.x
- Vite
- TypeScript 5.9
- React Hook Form & Zod
- React Router
- React Redux & RTK Query

### Back-end

- Supabase (auth, database (PostgreSQL), storage, edge functions, scheduled jobs)

#### Integrations

- Stripe (payments)
- Resend (Emails)
- Twilio (SMS)
- Cloudflare (bot protection)
- Google Maps API (places automplete, geocoding, maps api)

Vercel (hosting), Vitest and React Testing Library (testing), GitHub Actions (CI)

## Agentic Coding

There is a `CLAUDE.md` file present for anyone that wants to do some agentic coding, feel free to add to it or change to fit how you code.
