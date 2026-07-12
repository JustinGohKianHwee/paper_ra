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

## AD-17: Reading mode is a reader-first, three-pane workspace

Reading mode now uses a dedicated client shell and resizable workspace so the PDF remains
the primary object while notes and AI structure stay available:

- The authenticated server layout delegates interactive chrome to `components/app-shell.tsx`.
  The app shell keeps the normal desktop sidebar, mobile header, command palette, theme
  toggle, and sign-out controls, but lets the desktop sidebar collapse on
  `/papers/[slug]/read` to reclaim width for the reader.
- `components/reading/reading-workspace.tsx` owns the three reading panes: structured
  notes on the left, PDF in the center, and the AI passage/annotation/Q&A rail on the
  right. Drag positions persist as `ra:reading-layout:v4`, hidden side panes as
  `ra:reading-hidden-panels:v1` (a hidden pane's content unmounts), and per-paper page +
  zoom as `ra:pdf-state:<paperId>`. Below `1280px` the panes become tabs.
- `react-resizable-panels` size props must be explicit percentage strings, not bare
  numbers. Bare numbers are pixels, which previously made the side panes render as
  unusable slivers. Current defaults are `22% / 52% / 26%`.
- AI passages remain page-anchored: clicking a passage header or non-interactive card
  space jumps the PDF iframe to the passage `page_start`; annotation controls and other
  interactive elements do not trigger the jump.

## AD-18: Formula screenshots convert to copyable KaTeX Markdown

Important equations are often easiest to capture from the PDF visually, but the app's
canonical note format is still Markdown + KaTeX. Reading mode therefore adds an
ephemeral formula-OCR tool rather than a new saved object type:

- `components/reading/formula-ocr-dialog.tsx` accepts a pasted or uploaded equation
  screenshot and an in-dialog drag-crop rectangle (no screen-capture API).
- `actions/formula-ocr.ts` validates the image is a png/jpg/webp data URL and calls
  OpenAI vision with a structured-output prompt that returns raw LaTeX, display-math
  Markdown, confidence, and warnings.
- Screenshots are not written to Supabase or Storage. The user explicitly copies the
  LaTeX/Markdown into important-equation sections, notes, or questions.
- Cost control: `FORMULA_OCR_MODEL` defaults to `gpt-5.4-nano`; users can override it
  in `.env.local` if model availability or quality changes.

## AD-19: Papers get a recoverable trash, not hard deletion

Deleting knowledge should be reversible: `papers.deleted_at` implements a soft delete.
Trashed papers vanish from the library, `search_all` (filtered in SQL), the dashboard,
the command palette, and Radar dedupe-and-recommend surfaces, but everything attached
stays intact until "Delete forever" (Postgres cascades then remove passages, notes,
annotations, Q&A, pages, sessions, sources, suggestions, runs, relations, and links;
misconception records survive with their paper link nulled; topics/concepts are never
deleted with a paper). The confirmation dialogs itemise exactly this split.

## AD-20: Grounded Q&A is retrieval-first and shares the pipeline's audit trail

Questions asked while reading are answered from the paper itself, not model memory:

- The extract stage persists page text (`paper_pages`), so Q&A never re-downloads the
  PDF; older papers are backfilled on their first question.
- `lib/ai/qa-retrieval.ts` (pure, unit-tested) ranks pages lexically against the
  question and sends only the top few within a character budget.
- The prompt forces separation of direct paper claims (cited "(p. N)") from
  interpretation, and an explicit "insufficient" coverage state when the paper does not
  contain the answer. Answers carry `answer_authorship` (`ai` → `ai_edited` on edit),
  coverage, and grounding (cited pages + overlapping passage ids).
- Every ask is a `processing_runs` row with stage `qa` — same rate limit
  (`AI_MAX_RUNS_PER_HOUR`) and usage accounting as ingestion. Failures are stored on
  the `paper_qa` row (status `failed` + error) and retryable.
- Follow-ups thread under the same question annotation (position 2+), passing only the
  last few exchanges — never the whole paper again.

## AD-21: Radar v1 infers interests from the library; no stored profile

There is deliberately no interest-profile table. Each user-triggered refresh derives a
term-weight profile from what the notebook already records: papers weighted by reading
depth × personal relevance × recency, topic/concept names, recent annotations, and past
accept (+) / dismiss (−) decisions. arXiv is queried per top topic (metadata + abstracts
only — candidate PDFs are never downloaded), candidates are deduped against the whole
library (including trash) and prior candidates, scored deterministically
(term overlap + recency), and near-duplicate titles are filtered for queue diversity.
Only the top ~8 survivors get one LLM call for honest per-candidate explanations
(usage recorded on `radar_runs`; refresh works fully without a key). Accepting creates
an honest `queued` + `metadata_only` paper linked to the source topics; the generated
"why" text never becomes canonical notes. A one-off topic search sets `query_context`
on its candidates and leaves no persistent trace in future profiles. Refresh is
user-triggered only in v1 — no scheduled jobs.

## AD-22: One source of truth for status semantics and knowledge-object visuals

`lib/statuses.ts` holds the meaning of every reading/verification status (labels stay
beside the zod enums); badges (tooltips), form selects (inline explanations), filters,
and the docs read from it, so definitions cannot drift. `lib/knowledge-objects.ts`
defines the restrained visual language — topic/blue/Tags, concept/teal/Compass,
question/amber/HelpCircle, misconception+correction/rose, idea/emerald, note/neutral,
AI/violet/Sparkles — always icon + label + colour, never colour alone.

## AD-23: Experiments is dormant, not deleted

The feature is hidden from navigation, dashboard, command palette, paper view, and
search (`search_all` union branch removed), but its tables, migrations, records, and
routes remain (the pages carry a "dormant feature" banner). Restoring it is additive.

## AD-24: Ingestion and Q&A have independent rate budgets; Q&A is not a processing run

Paper ingestion (multi-stage, expensive) and interactive Q&A (single lightweight call) are
different workloads and must not starve each other. Previously both counted against one
`AI_MAX_RUNS_PER_HOUR` budget via `processing_runs`, so a burst of reading-mode questions
could block processing a new paper. Now:

- `processing_runs` is reserved for actual ingestion jobs. Q&A no longer writes a run row —
  its full audit (model, prompt version, coverage, cited pages, token usage, status, error)
  already lives on the `paper_qa` row, so the run row was pure duplication. Nothing in the
  UI, dashboard, or status polling read Q&A run rows, so removing them was safe.
- `assertIngestionWithinLimit` counts `processing_runs` (`AI_MAX_RUNS_PER_HOUR`, default 10);
  `assertQaWithinLimit` counts `paper_qa` rows (`QA_MAX_PER_HOUR`, default 60). Limits are
  read at call time so they are tunable and testable without a rebuild. `RateLimitError`
  carries a `workload` discriminator and a message naming which limit was hit.

## AD-25: The PDF is a pdf.js document layer, not an embedded iframe

Reading mode previously used a native `<iframe>` with `#page`/`zoom` URL-fragment controls
and a nonce-forced remount to jump pages — fragile across browsers and jarring on every
jump. It is replaced by a pdf.js viewer (`components/reading/pdf-viewer.tsx`, via
`react-pdf`) that establishes a real document-interaction layer:

- The document loads **once** from the same-origin auth-scoped proxy (`/api/papers/[id]/pdf`).
  Pages render lazily around the viewport (a window around the current page) so a long paper
  never mounts dozens of canvases; placeholders keep scroll geometry stable.
- Navigation is imperative (`goToPage`) and scrolls without recreating the viewer, exposed
  through a small `PdfNavContext` so passage summaries, Q&A citations, and "return to source"
  can all drive it without prop-drilling. Page, zoom, and reading position persist per paper;
  position is re-anchored when zoom or panel width reflows the layout.
- The pdf.js worker is served from our own origin (`public/pdf.worker.min.mjs`, vendored by
  `scripts/setup-pdf-worker.mjs`), never a CDN. The viewer is client-only; it renders after
  mount so it never executes during SSR.
- **Uniform page-size assumption:** placeholder spacing uses the first page's aspect ratio
  for all pages. This holds for essentially all papers; genuinely mixed page sizes would only
  affect placeholder spacing (not rendering or navigation correctness).

## AD-26: Text selection is a first-class research interaction with stored provenance

The pdf.js text layer makes selection actionable. Selecting paper text raises a small
floating toolbar (`components/reading/selection-actions.tsx`) with **Ask about this** and
**Create note**. Both are ordinary annotations — a selection question is a `question`
annotation (its Q&A threads under it as usual), a selection note is a `note` annotation — so
provenance lives on `paper_annotations` (`page_number`, `selected_text`, `anchor` jsonb),
shared by both and reusing the entire existing annotation/Q&A path rather than a parallel
system. For selection Q&A, the selected passage is passed through
`askAboutSelection → answerQuestion → buildQaPrompt` as **primary evidence**: it is
guaranteed to be in context and always cited, so lexical retrieval never has to rediscover
the passage the user explicitly pointed at (retrieval only supplements). Grounding on the
`paper_qa` row records the selection page.

## AD-27: Anchoring is page-accurate now; exact text-range highlighting is deferred

"Return to source" reliably navigates to the correct page (`page_number` drives
`goToPage`) — that is the guaranteed behaviour. Robust, persistent _exact-range_ highlighting
in pdf.js is genuinely hard: the text layer fragments text into many positioned spans, so a
stored character range does not map cleanly back onto rendered spans, and naive string
matching fails on repeated phrases, hyphenation, ligatures, and cross-span selections. Rather
than fake reliability with brittle matching, the `anchor` column stores a text-quote anchor
(`{ page, quote: { exact, prefix, suffix } }`) now, so a future stage can implement
quote-based highlighting (W3C-style) on top of the existing data without a migration or data
loss. Until then, provenance is page-level and honest about it.

## AD-28: Semantic/hybrid retrieval is the next stage, not this one

Q&A retrieval remains lexical (`lib/ai/qa-retrieval.ts`, term overlap). It is deliberately
kept for this stage: the selection interaction already guarantees the exact passage is
primary context, so grounding does not depend on semantic recall here, and adding pgvector
now would have coupled two large changes. The retrieval call sits behind a single boundary
(`selectContext` produces the supplementary pages fed to the prompt), so a hybrid
lexical+vector retriever can replace it later without touching the selection interaction, the
prompt shape, or the provenance model. That is the recommended next retrieval improvement.
