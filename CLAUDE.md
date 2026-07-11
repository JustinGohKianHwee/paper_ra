@AGENTS.md

# Research Atlas (working name — keep easy to change: `lib/config.ts` → `APP_NAME`)

## Project purpose

A **private-first technical research notebook** for a recommender-systems / ML engineer
(TikTok Shop / ByteDance). It records structured notes on public research papers —
including misconceptions, corrections, open questions, experiments, and syntheses —
and emphasises _how the user reasons_, not just what they read. It is a daily thinking
tool, not a portfolio site.

## Architecture conventions

- Next.js App Router (v16 — see AGENTS.md warning; `proxy.ts` not `middleware.ts`,
  async `cookies()`/`params`/`searchParams`), TypeScript strict, Tailwind v4, shadcn/ui.
- Supabase: Postgres + Auth + RLS + Storage. Local dev via `npx supabase start` (Docker).
- Data access: React Server Components for reads; **server actions** in `actions/` for all
  mutations, each validated with Zod schemas from `lib/validation/`.
- Markdown is the canonical note format. Rendering: `react-markdown` + `remark-gfm` +
  `remark-math` + `rehype-katex` + `rehype-highlight`. The editor is a plain textarea with
  edit/preview tabs and debounced autosave — do not build a rich-text editor.
- Domain logic that must be testable (slugs, filters, radar scoring/dedup, templates)
  lives in `lib/` as pure functions, never inline in components.
- App name, targets, and other tunables live in `lib/config.ts`.

## Data model conventions

- Every content table has `user_id` (owner) + owner-only RLS, `created_at`/`updated_at`
  (trigger-maintained), and a `visibility` column defaulting to `'private'`.
- Structured paper content is stored as **one row per section** in `paper_notes`
  (`section_type` enum + Markdown body) — never one giant text column.
- Slugs are stable, generated once from the title, unique per user. Do not regenerate
  slugs on rename.
- Statuses are enums: `reading_status`, `verification_status`, `experiment_status`.
  "Studied through a guide" is **not** the same as "read and verified from the paper" —
  never upgrade `verification_status` programmatically.
- Search is Postgres FTS (`search_all` SQL function). Embeddings/pgvector is a documented
  future extension — do not add it without being asked.
- Schema changes go through `supabase/migrations/` (new timestamped file; never edit an
  applied migration).

## Privacy rules (non-negotiable)

- This app stores notes on **public** papers and personal learning only. UI must keep the
  persistent reminder: do not enter confidential TikTok / ByteDance information, internal
  metrics, proprietary model names, private code, screenshots, datasets, experiment
  results, or architecture details.
- `visibility` defaults to `'private'` everywhere. Publishing is not implemented; any
  future public route/export must filter `visibility = 'publishable'` explicitly and must
  never expose a private record.
- No analytics, tracking, or third-party data sinks.

## Rules against inventing paper content (non-negotiable)

- Never fabricate claims, equations, authors, results, arXiv IDs, or architecture details.
- Seed/note content may only come from the source guides in `docs/source/` with the guide
  name + page/chapter recorded; where sources lack information, leave the field blank or
  add a `TODO:` line.
- Exact numerical claims must be recorded in `sources` with `needs_verification = true`.
- Never mark a paper implemented or claim an experiment happened unless a corresponding
  `experiments` record exists.
- Seeding is deterministic (`npm run seed`); no LLM calls at application runtime.

## Testing expectations

- `npm run test` — Vitest unit tests for domain logic (slug, filters, radar scoring,
  dedup, templates). These must not require Supabase.
- `npm run test:integration` — CRUD/RLS/search tests against the local Supabase stack
  (skipped with a clear message when the stack is not running).
- `npm run test:e2e` — Playwright: login → open paper → edit section → autosave → search.
- No render-only component tests. Test behaviour, not markup.
- Before finishing any task: `npm run lint && npm run typecheck && npm run test`.

## Commands

- `npm run dev` — dev server; `npx supabase start` first (needs Docker Desktop).
- `npx supabase db reset` — recreate DB from migrations; `npm run seed` — deterministic seed.
- `npm run typecheck`, `npm run lint`, `npm run format`.
