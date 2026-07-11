# Research Atlas

A **private, AI-assisted notebook for studying research papers** — general-purpose, built
around how you actually learn: add a paper from a link, let the assistant break it down,
study it side-by-side with the PDF, capture questions and misconceptions as you read, and
consolidate everything into weekly syntheses.

> **Privacy rule (read first):** this app is for **public papers and personal learning
> only**. Do not enter confidential employer information: internal metrics, proprietary
> model or project names, private code, screenshots, datasets, experiment results, or
> non-public architecture details. Everything is private by default and there are no
> public routes; see [docs/privacy-and-safe-note-taking.md](docs/privacy-and-safe-note-taking.md).
> When AI features are enabled, paper text and metadata are sent to OpenAI — the UI
> discloses this wherever it applies.

## The core loop

1. **Add a paper** (`/papers/new`): paste an arXiv link, DOI, title, or URL — or upload a
   PDF. Metadata resolves automatically (arXiv/Crossref); the AI pipeline then extracts
   the full text, builds a passage-by-passage breakdown, drafts structured notes into
   empty sections, and proposes topics/concepts/priority/relevance. Everything AI-made is
   labelled, editable, and **never overwrites your notes**; suggestions wait for your
   accept/reject.
2. **Read** (`/papers/[slug]/read`): split-screen PDF + page-linked AI passage summaries
   that guide (not replace) the paper. Annotate inline — notes, questions, corrections,
   ideas — and quick-create concepts/misconceptions without leaving the flow. Sessions
   start/resume with one click and log themselves when you end them (duration, takeaway,
   what to continue).
3. **View** (`/papers/[slug]`): the clean, read-only record of everything accumulated —
   summary, breakdown with your annotations, structured notes, misconceptions,
   experiments, relations, sources. Deep editing lives at `/papers/[slug]/notes`.
4. **Synthesise** (`/synthesis`): weekly/monthly notes; "Draft with AI" writes a first
   pass from that week's actual recorded activity, you edit and approve, and the original
   draft is preserved alongside your version.

Plus: searchable/filterable library, topics & concepts pages, experiments,
misconception records, dashboard ("what should I work on next?"), Postgres full-text
search over everything (`Ctrl+K`), and honest reading/verification statuses.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui ·
Supabase (Postgres, Auth, RLS, Storage) · OpenAI (server-side only) · Zod ·
react-markdown + KaTeX + highlight.js · Vitest · Playwright. Package manager: **npm**.

## Local development

Prerequisites: Node 20+, npm, **Docker Desktop** (local Supabase), and optionally an
OpenAI API key for the AI features.

```bash
npm install

# 1. Start the local Supabase stack (first run downloads images)
npx supabase start

# 2. Configure the app: copy .env.example → .env.local and fill in the values
#    `supabase start` printed, plus OPENAI_API_KEY if you want AI features.

# 3. Create the schema (applies supabase/migrations/)
npx supabase db reset

# 4. Seed the starter library (29 papers, 16 topics, 17 concepts)
npm run seed

# 5. Run the app
npm run dev
```

Sign in at http://localhost:3000/login with the seed account
(`SEED_EMAIL` / `SEED_PASSWORD` from `.env.local`). If Supabase env vars are missing the
app renders a setup screen; if the OpenAI key is missing the app still works with AI
features disabled.

### Everyday commands

| Command                                 | What it does                                                           |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                           | Dev server                                                             |
| `npm run seed`                          | Idempotent, non-destructive seed                                       |
| `npm run db:reset`                      | Recreate the DB from migrations (wipes data)                           |
| `npm run test`                          | Unit tests (no Supabase/OpenAI needed)                                 |
| `npm run test:integration`              | CRUD/RLS/search/pipeline tests (local Supabase + built-in OpenAI mock) |
| `npm run test:e2e`                      | Playwright flows (local Supabase + built-in OpenAI mock — no API cost) |
| `npm run lint` / `typecheck` / `format` | Hygiene                                                                |

After changing migrations: `npx supabase db reset && npm run seed`, then regenerate types
with `npx supabase gen types typescript --local > lib/supabase/database.gen.ts`.

## AI processing details

- Staged, resumable pipeline (`lib/ai/pipeline.ts`): extract text → passage breakdown →
  structured-note drafts → suggestions. Progress persists per stage; a failure resumes
  where it stopped. Every run is recorded in `processing_runs` (stage, model, prompt
  version, attempts, errors, token usage) and every proposal in `paper_suggestions`
  with its accept/reject decision.
- Long papers are chunked page-aligned (max ~8 chunks) so page anchors stay valid for
  the split viewer; extracted text is treated as untrusted input (prompt-injection
  guidance baked into every prompt).
- Outbound fetches for user-supplied URLs go through an SSRF-hardened fetcher
  (`lib/ai/safe-fetch.ts`): https-only, private/loopback/metadata hosts blocked (with
  DNS re-checking), manual redirect validation, size/time/content-type caps. Processing
  is rate-limited per user (`AI_MAX_RUNS_PER_HOUR`).
- Tests run against a deterministic local mock (`tests/mocks/openai-server.mjs`) wired
  via `OPENAI_BASE_URL` — CI never spends API credit.

## Production deployment

1. Create a hosted Supabase project; `npx supabase link --project-ref <ref>` then
   `npx supabase db push`.
2. Disable public sign-ups after creating your account (single-user tool).
3. Deploy to a Node host (e.g. Vercel): set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `OPENAI_API_KEY` (server env only). Do **not**
   deploy the service-role key with the app.
4. Note: paper processing can run for a few minutes on long PDFs. `maxDuration = 300`
   is set on the processing route; on serverless plans with shorter limits the run
   fails mid-way and the Retry button resumes from the last completed stage.

## Docs

- [docs/architecture.md](docs/architecture.md) — decision log
- [docs/data-model.md](docs/data-model.md) — schema reference
- [docs/research-radar-roadmap.md](docs/research-radar-roadmap.md) — future automated discovery
- [docs/privacy-and-safe-note-taking.md](docs/privacy-and-safe-note-taking.md)
- [CLAUDE.md](CLAUDE.md) — conventions for AI-assisted development

`docs/source/` is git-ignored local-only source material (purged from git history).
