# Research Atlas

A **private-first research notebook** for recommender-systems / ML papers — built for
recording not just what you read, but _how you reason_: structured paper notes,
misconceptions and corrections, open questions, experiments, and weekly/monthly syntheses.

> **Privacy rule (read first):** this app is for **public papers and personal learning
> only**. Do not enter confidential TikTok / ByteDance information, internal metrics,
> proprietary model names, private code, screenshots, datasets, experiment results, or
> non-public architecture details. Everything is private by default and there are no
> public routes; see [docs/privacy-and-safe-note-taking.md](docs/privacy-and-safe-note-taking.md).

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui ·
Supabase (Postgres, Auth, RLS, Storage) · Zod · react-markdown + KaTeX + highlight.js ·
Vitest · Playwright. Package manager: **npm**.

## Local development

Prerequisites: Node 20+, npm, and **Docker Desktop** (for the local Supabase stack).

```bash
npm install

# 1. Start the local Supabase stack (first run downloads images)
npx supabase start

# 2. Configure the app
#    Copy .env.example → .env.local, then paste the values `supabase start`
#    printed: API URL → NEXT_PUBLIC_SUPABASE_URL, anon key →
#    NEXT_PUBLIC_SUPABASE_ANON_KEY, service_role key → SUPABASE_SERVICE_ROLE_KEY.

# 3. Create the schema (applies supabase/migrations/)
npx supabase db reset

# 4. Seed the starter library (29 papers, 16 topics, 17 concepts)
npm run seed

# 5. Run the app
npm run dev
```

Sign in at http://localhost:3000/login with the seed account
(`SEED_EMAIL` / `SEED_PASSWORD` from `.env.local`; defaults
`researcher@example.com` / `research-atlas-dev`), or create your own account and
re-run `npm run seed` with `SEED_EMAIL` pointed at it.

If Supabase env vars are missing the app renders a setup screen with instructions
instead of crashing.

### Everyday commands

| Command                                 | What it does                                                  |
| --------------------------------------- | ------------------------------------------------------------- |
| `npm run dev`                           | Dev server                                                    |
| `npm run seed`                          | Idempotent, non-destructive seed (skips anything that exists) |
| `npm run db:reset`                      | Recreate the DB from migrations (wipes data)                  |
| `npm run test`                          | Unit tests (no Supabase needed)                               |
| `npm run test:integration`              | CRUD/RLS/search tests against the local stack                 |
| `npm run test:e2e`                      | Playwright: login → edit note → autosave → search             |
| `npm run lint` / `typecheck` / `format` | Hygiene                                                       |

After changing migrations: `npx supabase db reset && npm run seed`, then regenerate types
with `npx supabase gen types typescript --local > lib/supabase/database.gen.ts`.

## What's inside

- **Dashboard** — reading queue, unresolved questions, recent corrections, experiments in
  flight, verification backlog, weekly reading target, synthesis status.
- **Papers** — searchable/filterable library; each paper has ~24 independently
  autosaving structured sections (thesis, mechanism, equations with KaTeX, failure
  modes, TikTok Shop relevance, boss-facing explanation, …) plus honest
  `reading_status` / `verification_status` ("studied through guide" ≠ "verified from
  the primary paper").
- **Topics / Concepts** — reusable technique pages linked across papers.
- **Experiments** — your own toy implementations; a paper only counts as
  "implemented" when an experiment record exists.
- **Misconceptions** — first-class belief → correction records.
- **Synthesis** — weekly/monthly templated consolidation notes.
- **Search** — Postgres full-text search across everything (`Ctrl+K` command palette).
- **Radar** — disabled placeholder; see
  [docs/research-radar-roadmap.md](docs/research-radar-roadmap.md).

Seeded notes are derived from the two study guides in `docs/source/` and are marked
`secondary summary only` with `needs verification` sources — the amber callout on each
paper reminds you to verify against the primary paper before citing anything.

## Production deployment

1. Create a hosted Supabase project. Push the schema:
   `npx supabase link --project-ref <ref>` then `npx supabase db push`.
2. In Supabase Auth settings, disable public sign-ups after creating your account
   (this is a single-user tool), or keep email confirmation on.
3. Deploy to Vercel (or any Node host): set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` project env vars. Do **not** set the service-role
   key in the web app environment — it is only for seeding/admin scripts run locally.
4. Optionally seed the hosted project by running `npm run seed` locally with the hosted
   URL + service key in your shell env (never commit them).

## Docs

- [docs/architecture.md](docs/architecture.md) — decision log
- [docs/data-model.md](docs/data-model.md) — schema reference
- [docs/research-radar-roadmap.md](docs/research-radar-roadmap.md) — future automated discovery
- [docs/privacy-and-safe-note-taking.md](docs/privacy-and-safe-note-taking.md)
- [CLAUDE.md](CLAUDE.md) — conventions for AI-assisted development
