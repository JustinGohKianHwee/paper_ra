# Research Atlas — Implementation Plan

## Context

Justin (recommender-systems / ML engineer returning to TikTok / ByteDance) wants a **private-first technical research notebook web app** ("Research Atlas") to record, connect, search, and revisit knowledge from public research papers — emphasising _how he reasons_ (misconceptions, corrections, open questions, experiments), not just what he read. It must warn against entering confidential ByteDance material, be private by default, and be a maintainable multi-year personal knowledge system.

## Repository findings

- Repo: `C:\Justin Folder\coding_projects\paper_researcher\paper_ra\` (git repo, remote `JustinGohKianHwee/paper_ra`). Contents: stub `README.md` + untracked `docs/source/` with the two seed PDFs. **Greenfield** — no stack, no package manager; nothing to reuse.
- The app will be built at the repo root `paper_ra/` (keeping `docs/source/`).
- **Seed source material extracted (read-only, verified):**
  - `Latest LLM Research for TikTok Shop Recommendation Engineering.pdf` (15 pp): ranked reading tiers, evidence table with claimed online metrics, radar rubric, two-week sprint plan.
  - `llm_recsys_tiktok_shop_deep_study_guide.pdf` (37 pp): 14 per-paper chapters, each with Problem / Core technique / Why it works / Evidence / Caveats / TikTok Shop application / Toy experiment / Boss-facing sentence / Debugging checklist — maps almost 1:1 onto the paper template sections.
  - Source index (guide p.37) gives arXiv IDs: Qwen3 `2505.09388`, DeepSeek-V3 `2412.19437`, DeepSeek-R1 `2501.12948`, DataComp-LM `2406.11794`, vLLM/PagedAttention `2309.06180`, FlashInfer `2501.01005`, LONGER `2505.04421`, RankMixer `2507.15551`, UG-Separation `2602.10455`, LMN `2502.05558`, LEMUR `2511.10962`, OneRec `2502.18965`, HSTU `2402.17152`, Atomic Intent Reasoning `2606.10357`, RecGPT `2507.22879`, RecGPT-V2 `2512.14503`, RecGPT-Mobile `2605.04726`, PinRec `2504.10507`, DPO `2305.18290`, DCPO `2603.09117`, ItemRAG `2511.15141`, LLM-I2I `2512.21595`, From 128K to 4M `2504.06214`, Gemma 3 `2503.19786`, InstructGPT `2203.02155`. Foundational (well-known canonical IDs, not in index): SASRec `1808.09781`, BERT4Rec `1904.06690` (confirmed in report's link list), BST `1905.06874`. **OneTrans: no ID in sources → leave `arxiv_id` blank with TODO; strong empty template; highest team-relevance priority.**
- Toolchain: Node v24.15.0, npm 11.12.1, Docker Desktop 29.5.3 installed (**daemon not running — will start it during implementation**), no pnpm, no global Supabase CLI (use `npx supabase`).

## Key decisions (long-term consequences)

1. **Stack**: Next.js 15 (App Router) + TypeScript strict + Tailwind CSS v4 + shadcn/ui + Supabase (Postgres, Auth, RLS, Storage) + Zod. **npm** as package manager (already installed, Windows-friendly; documented in README).
2. **Local-first Supabase via Docker** (`npx supabase start`) as the dev path; same migrations deploy to hosted Supabase for production (Vercel + hosted Supabase documented). `.env.example` + a config guard that renders a clear setup-error screen when Supabase env vars are missing.
3. **Structured notes as rows, not one blob**: `paper_notes(paper_id, section_type enum, body_md, position)` — one row per template section, independently editable/autosaved, individually indexed for FTS. Same pattern reused for synthesis note bodies.
4. **Markdown pipeline**: textarea-based section editor (edit/preview tabs, monospace) — _not_ a custom rich-text editor. Rendering via `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` + `rehype-highlight`. Autosave: 1.5 s debounce per section + Ctrl/Cmd+S + `beforeunload` guard + Saving/Saved/Save failed/last-edited indicator.
5. **Search**: Postgres FTS — generated `tsvector` columns + GIN indexes on papers, paper_notes, concepts, experiments, misconception_corrections, synthesis_notes; one `search_all(query)` SQL function returning type/title/excerpt (`ts_headline`)/status/updated_at. Documented pgvector extension path (no embeddings in MVP).
6. **Privacy by design**: every content table has `user_id` + RLS (`user_id = auth.uid()`), `visibility text default 'private'` check-constrained to `private|publishable`. No public routes in MVP; persistent slim privacy reminder in editors; `docs/privacy-and-safe-note-taking.md`.
7. **Radar = schema + interfaces only**: `radar_candidates` table, typed provider interface (`searchRecentPapers`, `normalisePaperMetadata`, `deduplicateCandidates`, `scoreCandidate`, `explainRecommendation`) in `lib/radar/`, relevance-rubric scoring + dedup implemented and unit-tested, disabled `/radar` page, roadmap doc. No fetching in MVP.
8. **Deterministic seed**: `npm run seed` (tsx script, service-role key) — no LLM calls at runtime. Content lives in checked-in `seed/data/*.ts` authored from the two PDFs with source-guide name + page refs, honest statuses, `needs_primary_verification: true`, TODOs where guides lack info. Never invents claims; exact numbers flagged for primary-source verification.
9. **App name** in one place: `lib/config.ts` → `APP_NAME = "Research Atlas"`.

## Data model (Postgres, one migration set under `supabase/migrations/`)

Enums: `reading_status` (to_read, queued, skimmed, studied_through_guide, deep_read, implemented, revisit), `verification_status` (metadata_only, secondary_summary_only, primary_opened, primary_claims_verified), `visibility` (private, publishable), `experiment_status` (proposed, implementing, running, analysing, completed, abandoned), `paper_section_type` (~20 values matching template: thesis, problem, insufficiency, architecture, mechanism, equations, intuition, why_it_works, training_setup, evaluation, results, production_evidence, serving, failure_modes, segment_risks, tiktok_relevance, implementation_mapping, experiment_proposal, misconceptions, open_questions, related_papers, boss_explanation, sources_to_verify), `synthesis_kind` (weekly, monthly), `radar_status` (fetched, scored, in_review, accepted, dismissed), `relation_kind` (builds_on, contrasts_with, same_family, cites, supersedes).

Tables (all with `user_id uuid references auth.users`, RLS owner-only, `created_at/updated_at` triggers):

- `papers` — fields per spec §6 (title, slug unique per user, subtitle, authors text[], organisation, year, venue, arxiv_id, doi, canonical_url, pdf_url, abstract, reading_status, verification_status, priority int 1–5, visibility, tiktok_shop_relevance int 0–5, team_relevance int 0–5, production_relevance int 0–5, production_evidence text, primary_source_verified bool, needs_revisit bool, note_source text, last_read_at). Indexes: FTS, (user_id, reading_status), (user_id, priority), (user_id, year), updated_at, slug.
- `topics` (name, slug, overview_md, synthesis_md, knowledge_gaps_md), `paper_topics` (junction)
- `concepts` (name, slug, plain_definition_md, technical_definition_md, equation_md, why_it_helps_md, failure_modes_md, my_implementations_md, misconceptions_md), `paper_concepts`
- `paper_notes` (paper_id, section_type, body_md, position, unique(paper_id, section_type))
- `experiments` (title, slug, repo_name, branch_ref, research_question, hypothesis, baseline, treatment, dataset, parameters_md, metrics_md, results_md, segment_results_md, latency_memory_md, interpretation_md, failure_cases_md, next_experiment_md, metrics_json jsonb, status, happened_on date), `experiment_papers`, `experiment_concepts`
- `misconception_corrections` (initial_belief_md, why_i_believed_md, corrected_understanding_md, evidence_md, paper_id?, concept_id?, corrected_on, confidence int 1–5, can_explain_without_notes bool)
- `paper_relations` (from_paper, to_paper, relation_kind, note)
- `reading_sessions` (paper_id, occurred_on, minutes, note) — feeds weekly reading target
- `synthesis_notes` (kind weekly|monthly, period_start date, title, body_md seeded from template questions)
- `sources` (paper_id, source_name, locator/page, url, quote_or_claim, needs_verification bool) — citation/page tracking
- `radar_candidates` (title, normalised_title, arxiv_id, doi, url, abstract, provider, published_on, topics text[], score numeric, score_breakdown jsonb, why_it_matters, status radar_status)
- Storage bucket `paper-attachments` (private, owner-only policies) for optional PDFs.

## App structure

```
paper_ra/
  app/
    (auth)/login/            # Supabase email+password sign-in (signup enabled)
    (app)/                   # auth-guarded via middleware + layout w/ sidebar, theme toggle
      dashboard/  papers/  papers/[slug]/  papers/new/
      topics/  topics/[slug]/  concepts/  concepts/[slug]/
      experiments/ (+[slug], new)  misconceptions/ (+new)
      synthesis/ (+[id], new)  search/  radar/        # radar = disabled explainer page
    layout.tsx  globals.css
  components/   # shadcn/ui primitives + MarkdownView, SectionEditor (autosave), StatusBadge,
                # VerificationWarning callout, PriorityDots, TopicBadge, PaperCard, CommandPalette (cmdk),
                # PrivacyReminder, EmptyState/ErrorState/skeletons
  lib/
    supabase/ (server/client/middleware helpers, typed Database)  config.ts  slug.ts
    validation/ (Zod schemas)  papers/filters.ts (filter/sort query builder — unit tested)
    templates/ (paper template §10, synthesis templates §5H)
    radar/ (types.ts provider interface, scoring.ts rubric, dedupe.ts — unit tested; no live providers)
  actions/      # server actions: papers, notes (upsertSection), topics, concepts, experiments,
                # misconceptions, synthesis, readingSessions — Zod-validated, revalidate paths
  supabase/ (config.toml, migrations/)
  seed/ (index.ts runner, data/{topics,concepts,papers,notes}.ts)
  tests/ (unit/ integration/ e2e/)  docs/  CLAUDE.md  README.md  .env.example
```

Dashboard sections (queries, no gamification): continue reading (last `reading_sessions`/`last_read_at`), recently edited, reading queue (queued/to_read by priority), unresolved questions (papers with non-empty `open_questions` sections), recent misconception corrections, experiments in progress, papers awaiting primary verification, topic knowledge gaps (topics with `knowledge_gaps_md`), weekly reading target (sessions this week vs. simple target), monthly synthesis status (exists for current month?), quick-capture button (opens command palette actions).

Command palette (Ctrl/Cmd+K): search-as-you-type via `search_all`, plus actions: add paper / note / misconception / experiment, jump to topic.

Design direction: academic, calm, information-dense; system font stack or Inter + a serious mono for code; light/dark via `next-themes`; badges for topic/status/priority; amber "needs primary verification" callout on every paper page whose status < primary_claims_verified. No gradients/animation noise.

## Seed data (§8–9)

- 16 topics (spec §5D list) and ~17 concepts (spec §5E list) with plain-language definitions written only where the guides support them, otherwise stubs with TODO.
- ~29 papers: foundational (SASRec, BERT4Rec, BST — `metadata_only`, minimal notes), OneTrans (top priority, team_relevance 5, empty template sections with TODO placeholders, `metadata_only`, explicit "complete manually — do not trust generated content" note), long-history (LONGER, LMN, From 128K to 4M), generative (OneRec, HSTU, PinRec), LLM-enhanced (AIR, RecGPT ×3, ItemRAG, LLM-I2I), multimodal (LEMUR, Gemma 3), ranking/serving (RankMixer, UG-Separation, vLLM, FlashInfer), pretraining/post-training (Qwen3, DeepSeek-V3, DeepSeek-R1, DataComp-LM, InstructGPT, DPO, DCPO).
- Every seeded paper: topics linked, priority + relevance ratings from the report's tiers, `note_source` = guide name + chapter/page, reading_status honest (`to_read`/`queued` — the guide's existence ≠ papers read), verification `secondary_summary_only` where notes exist else `metadata_only`, `needs_revisit`/`primary_source_verified=false`, exact numeric claims recorded in `sources` rows with `needs_verification=true`. Example misconception records (LMN vs LONGER, summary tokens) seeded from the user's prompt examples. No fabricated implementations/experiments.

## Testing (§13)

- **Unit (Vitest)**: slug generation/uniqueness, radar relevance scoring rubric + dedup (arxiv/doi/normalised-title), library filter/sort query builder, template builders, search excerpt helper, Zod schemas.
- **Integration (Vitest, gated on local Supabase running)**: CRUD flows for papers/notes/experiments/misconceptions via service client; RLS check (second user cannot read first user's rows); `search_all` returns edited content.
- **E2E (Playwright, one spec)**: login → open seeded paper → edit a structured section → autosave confirms "Saved" → global search finds the edited text.
- No render-only component tests.

## Docs & handoff (§15)

`README.md` (setup: npm install, Docker Desktop, `npx supabase start`, `db reset`, `npm run seed`, `npm run dev`; deployment to Vercel + hosted Supabase), `CLAUDE.md` (purpose, conventions, data-model rules, privacy rules, testing expectations, **rule: never invent paper content — leave TODO + mark needs verification**), `docs/architecture.md` (decision log), `docs/data-model.md`, `docs/research-radar-roadmap.md` (provider interface, rubric, workflow: fetch → score → review queue → accept/dismiss → reading queue → notes → experiment → synthesis; never auto-mark read, never auto-write canonical notes), `docs/privacy-and-safe-note-taking.md`, `.env.example`.

## Implementation order

1. Scaffold Next.js app in `paper_ra/` (npm, strict TS, Tailwind, shadcn/ui, ESLint+Prettier), `.gitignore`, CLAUDE.md, docs skeleton.
2. Start Docker Desktop; `npx supabase init/start`; write migrations (enums, tables, RLS, FTS, triggers, storage bucket); typed DB definitions; `.env.example` + missing-config guard.
3. Auth (login page, `@supabase/ssr` middleware, route protection).
4. Papers: library list w/ search-filter-sort + compact/detailed views; paper page with 20 sectioned editors + autosave; new-paper flow with template; topic/concept linking; paper relations.
5. Topics, concepts pages; experiments; misconceptions; synthesis notes (templated).
6. Dashboard; global search page; command palette; radar disabled page + `lib/radar/`.
7. Seed data authored from the PDFs; `npm run seed`.
8. Tests (unit → integration → E2E); loading/empty/error states; dark mode polish.
9. Final: format, lint, typecheck, `npm test`, `npm run build`, E2E run, walk the 17 acceptance criteria, write summary + next-phase suggestions.

## Verification

- `npm run lint && npm run typecheck && npm test && npm run build` all green.
- `npx supabase db reset && npm run seed` → app boots at localhost:3000 with clear error screen if env missing.
- Playwright E2E passes against seeded local stack.
- Manual pass of MVP acceptance criteria §14 (sign in, library, filter, edit sections w/ KaTeX + code rendering, create paper, link topics/concepts, record experiment + misconception + synthesis, dashboard, reload persistence, honest statuses, README-driven startup).

## Out of scope (documented, not built)

Public publishing/export, pgvector semantic search, live radar providers, attachments UI beyond basic upload, mobile app.
