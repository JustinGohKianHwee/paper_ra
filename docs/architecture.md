# Architecture decisions

Working name: **Research Atlas** (single definition in `lib/config.ts`).

This is the decision log for the private-first research notebook. Each entry states the
decision, the reason, and the consequence. Newer entries go at the bottom.

## AD-1: Next.js App Router + TypeScript strict + Tailwind v4 + shadcn/ui

Greenfield repo with no existing stack. Next.js App Router gives server components for
fast reads, server actions for mutations, and a single deployable app. shadcn/ui provides
accessible primitives without a heavy component-framework dependency. Note: Next 16 —
`proxy.ts` replaces `middleware.ts`; request APIs (`cookies()`, `params`) are async.

**Package manager: npm** (only one installed; simplest on Windows). Documented in README.

## AD-2: Supabase (Postgres + Auth + RLS + Storage), local-first via Docker

Requirements call for auth, row-level security, and attachment storage. Supabase covers
all three with plain Postgres underneath, so the schema stays portable SQL.

- Local dev: `npx supabase start` (Supabase CLI is a dev dependency; requires Docker
  Desktop). Migrations in `supabase/migrations/` apply identically to the hosted project
  used in production.
- Missing configuration renders a clear setup-error screen instead of a crash.

## AD-3: Structured notes are rows, not a blob

`paper_notes(paper_id, section_type, body_md, position)` — one row per template section
(thesis, problem, mechanism, …). Consequences: each section is independently editable and
autosaved, individually indexed for full-text search, and new section types are an enum
value + template entry away. The same "sectioned Markdown" idea is _not_ generalised
further (topics/concepts have a fixed small set of Markdown columns) to avoid a premature
generic-document abstraction.

## AD-4: Markdown everywhere; textarea editor, no rich-text editor

Markdown is the canonical format (portable, diffable, math/code friendly). Rendering via
`react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` + `rehype-highlight`.
The editor is a monospace textarea with Edit/Preview tabs, 1.5 s debounced autosave,
Ctrl/Cmd+S, an unsaved-changes guard, and a Saving/Saved/Failed indicator. Building or
embedding a rich-text editor was rejected as unnecessary complexity.

## AD-5: Search is Postgres FTS with one `search_all` function

Generated `tsvector` columns + GIN indexes on papers, paper_notes, concepts, experiments,
misconception_corrections, and synthesis_notes; a single `search_all(query)` SQL function
UNIONs ranked results with `ts_headline` excerpts. Chosen over external search services
(operational weight) and over embeddings (deferred; see AD-8 extension path).

## AD-6: Privacy by design

Every content table: `user_id` + owner-only RLS + `visibility` defaulting to `'private'`.
No public routes exist in the MVP. A future public export must select
`visibility = 'publishable'` explicitly; because enforcement lives in RLS + the schema
default, a forgotten filter fails closed. A persistent, unobtrusive privacy reminder
(`lib/config.ts` → `PRIVACY_REMINDER`) renders wherever notes are written.

## AD-7: Honest provenance is schema-level

`verification_status` (metadata_only → secondary_summary_only → primary_opened →
primary_claims_verified) is separate from `reading_status`, and `sources` rows carry
`needs_verification` per claim. Seed data derived from the two study-guide PDFs is marked
`secondary_summary_only` with guide name + page recorded in `note_source`/`sources`.
Nothing may upgrade verification automatically.

## AD-8: Research Radar is schema + interfaces only (MVP)

`radar_candidates` table plus typed provider interfaces (`searchRecentPapers`,
`normalisePaperMetadata`, `deduplicateCandidates`, `scoreCandidate`,
`explainRecommendation`) in `lib/radar/`. The relevance rubric and dedup logic are
implemented as pure functions and unit-tested now, so future providers only supply
fetching. `/radar` is a disabled explainer page. Roadmap: `docs/research-radar-roadmap.md`.
Semantic search extension path: enable `pgvector`, add an `embeddings` table keyed by
(entity_type, entity_id), backfill offline — documented, not built.

## AD-9: Deterministic seed

`npm run seed` (tsx + service-role key) inserts checked-in TypeScript data authored from
the PDFs in `docs/source/`. No LLM calls at runtime; re-running the seed is idempotent
(upsert by slug). The seed never invents paper content; gaps are TODOs.
