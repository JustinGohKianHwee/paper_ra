# Data model

Schema lives in `supabase/migrations/`; typed access in `lib/supabase/database.types.ts`
(re-exports of the generated `database.gen.ts`). Every content table has:

- `user_id` referencing `auth.users`, with an **owner-only RLS policy**
  (`user_id = auth.uid()` for USING and WITH CHECK) — a signed-in user can only ever
  touch their own rows;
- `visibility` (`private` | `publishable`) **defaulting to `private`** — publishing is
  not implemented, but any future public export must select `publishable` explicitly,
  so forgetting a filter fails closed;
- `created_at` / `updated_at` (trigger-maintained).

## Entities

| Table                                                       | Purpose                            | Notable fields                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `papers`                                                    | Library entries                    | slug (stable, unique per user), authors[], organisation, year, venue, arxiv_id, doi, urls, abstract, `reading_status`, `verification_status`, priority 1–5, tiktok_shop/team/production relevance 0–5, production_evidence, primary_source_verified, needs_revisit, note_source, last_read_at |
| `paper_notes`                                               | **One row per structured section** | `section_type` (24-value enum matching `lib/templates/paper.ts`), body_md, position, unique (paper_id, section_type)                                                                                                                                                                          |
| `topics` / `paper_topics`                                   | Research areas                     | overview_md, synthesis_md, knowledge_gaps_md                                                                                                                                                                                                                                                  |
| `concepts` / `paper_concepts`                               | Reusable techniques                | plain/technical definitions, equation_md, why_it_helps_md, failure_modes_md, my_implementations_md, misconceptions_md                                                                                                                                                                         |
| `experiments` (+`experiment_papers`, `experiment_concepts`) | Your own studies                   | repo/branch refs, question/hypothesis/baseline/treatment/dataset, results/segments/latency markdown, `metrics_json` jsonb, `status`, happened_on                                                                                                                                              |
| `misconception_corrections`                                 | Belief → correction records        | initial_belief_md, why_i_believed_md, corrected_understanding_md, evidence_md, optional paper/concept links, corrected_on, confidence 1–5, can_explain_without_notes                                                                                                                          |
| `paper_relations`                                           | Typed paper↔paper links            | builds_on / contrasts_with / same_family / cites / supersedes                                                                                                                                                                                                                                 |
| `reading_sessions`                                          | Reading log                        | feeds "continue reading" + weekly target                                                                                                                                                                                                                                                      |
| `synthesis_notes`                                           | Weekly/monthly synthesis           | unique (user, kind, period_start)                                                                                                                                                                                                                                                             |
| `sources`                                                   | Citations / page refs / claims     | locator, quote_or_claim, `needs_verification`                                                                                                                                                                                                                                                 |
| `radar_candidates`                                          | Future Research Radar queue        | normalised_title, provider, score + jsonb breakdown, `radar_status`, accepted_paper_id                                                                                                                                                                                                        |

Storage: private bucket `paper-attachments` with owner-only object policies.

## Status enums

- `reading_status`: to_read → queued → skimmed → **studied_through_guide** → deep_read →
  implemented → revisit. "Studied through a guide" is deliberately distinct from reading
  the original.
- `verification_status`: metadata_only → secondary_summary_only → primary_opened →
  primary_claims_verified. Nothing upgrades this automatically; the UI shows an amber
  callout below `primary_claims_verified`.
- `experiment_status`: proposed → implementing → running → analysing → completed /
  abandoned.

## Search

Generated `tsvector` columns + GIN indexes on papers, paper_notes, concepts,
experiments, misconception_corrections, synthesis_notes. One SQL function
`search_all(query text)` (SECURITY INVOKER — RLS applies) UNIONs ranked results with
`ts_headline` excerpts, returning kind/id/title/slug/excerpt/status/topics/updated_at.

### Extension path: semantic search (not built)

1. `create extension vector;`
2. `embeddings(entity_type text, entity_id uuid, chunk int, embedding vector(1536), …)`
   with owner RLS, backfilled offline by a script (mirroring the seed-script pattern —
   no runtime LLM calls in the app).
3. A `search_semantic(query_embedding)` RPC, merged with `search_all` results in the UI.

## Indexes

FTS GIN indexes plus btree on (user_id, reading_status), (user_id, verification_status),
(user_id, priority), (user_id, year), (user_id, updated_at), junction FKs, and
misconception/source lookups. Library-page filtering itself happens in memory
(`lib/papers/filters.ts`) because a personal library is small; FTS handles body search.

## Conventions

- Slugs are generated once (`lib/slug.ts`) and never regenerated on rename.
- Schema changes = new timestamped migration; never edit an applied one. After a
  migration: `npx supabase db reset && npm run seed` and regenerate
  `database.gen.ts`.
