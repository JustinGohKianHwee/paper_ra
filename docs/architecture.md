# Architecture decisions

Working name: **Research Atlas** (single definition in `lib/config.ts`). Originally built
as a recommender-systems-focused notebook; generalised in v2 into a domain-neutral
AI-assisted paper-study tool.

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

---

# v2 — AI-assisted redesign (2026-07-11)

## AD-10: Generalised relevance, no employer coupling

`tiktok_shop_relevance`/`team_relevance` collapsed into one editable `relevance` (0–5)
plus free-text `relevance_note` ("why this matters to me — role, project, or research").
Section `tiktok_relevance` renamed to `relevance_to_me`. Employer names remain only as
factual bibliographic metadata on papers. Consequence: the product is domain-neutral;
personal context lives in editable fields, not schema names.

## AD-11: Staged, resumable, audited AI pipeline

Paper processing (`lib/ai/pipeline.ts`) runs stages — extract → passages → notes →
suggestions — persisting after each. `processing_runs` records status, stage,
stages_completed, model, `PROMPT_VERSION`, attempts, errors, and token usage; retry
resumes from the last completed stage (extraction is recomputed — cheap next to LLM
calls). Executed in a route handler (`maxDuration 300`) with client polling; a
serverless timeout therefore loses at most one stage. Rate-limited per user
(`AI_MAX_RUNS_PER_HOUR`).

## AD-12: AI provenance is schema-level, and AI never overwrites the user

`paper_notes.authorship` (`human|ai|ai_edited`; editing AI content flips to
`ai_edited`), `AiBadge` everywhere AI text renders, `synthesis_notes.ai_draft_md`
preserved beside the edited body. The pipeline writes only _empty_ sections and only
paper-factual ones (`AI_NOTE_SECTIONS`); personal-reasoning sections are human-only.
Proposals (topics, concepts, priority, relevance) land in `paper_suggestions` with an
explicit accepted/rejected audit trail — nothing applies without user action.

## AD-13: Three surfaces per paper (view / read / notes)

- `/papers/[slug]` — **view mode**: clean rendered record, zero editors.
- `/papers/[slug]/read` — **reading mode**: split-screen PDF (same-origin proxy at
  `/api/papers/[id]/pdf` so external hosts can't block framing) beside page-linked AI
  passage summaries (`paper_passages`), inline annotations (`paper_annotations`:
  note/question/correction/idea, questions resolvable), and quick-create dialogs for
  concepts/misconceptions. AI summaries guide reading; they never replace the paper.
- `/papers/[slug]/notes` — the structured 24-section editor, kept for deep work.

Chunking is page-aligned (`chunkPages`) precisely so passage page anchors stay valid for
the viewer.

## AD-14: Reading sessions are an explicit workflow

`reading_sessions` gained `started_at`/`ended_at`/`takeaway_md`/`continue_md`; a partial
unique index enforces one active session per user (starting elsewhere auto-ends the old
one). Sessions start/resume from the reading-mode bar and end through a dialog that logs
duration automatically and captures a takeaway + what to continue; the dashboard resumes
active sessions and surfaces continue hints. No manual timers.

## AD-15: Hardened ingestion

User-supplied URLs and PDFs flow through `lib/ai/safe-fetch.ts`: https-only, no
credentials/custom ports, private/loopback/link-local/metadata hosts blocked with DNS
re-checking, manual redirect verification per hop (max 3), content-type allowlists, and
a streamed 30 MB size cap. Extracted text is treated as untrusted (prompt-injection
preamble in every prompt); the UI discloses OpenAI submission (`AI_DISCLOSURE`).

## AD-16: Deterministic AI testing

`OPENAI_BASE_URL` override + `tests/mocks/openai-server.mjs` (dispatches on the JSON-
schema name) give unit/integration/E2E suites full pipeline coverage with zero API
spend; a gated manual test (`RUN_REAL_AI=1 … tests/manual/real-ai.test.ts`) verifies the
real integration.
