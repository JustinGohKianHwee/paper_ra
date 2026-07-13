# Research Atlas

**A private, AI-assisted notebook for _thinking through_ research papers — not just summarising them.**

A paper is rarely useful only for its abstract. Most of its value is in the thinking that
happens _while you read it_: the questions it raises, the assumptions you challenge, the
connections you draw to earlier work, the implementation ideas you jot down, and the
explanations you build for the parts that are hard. That thinking is where understanding
actually forms — and it is exactly what usually gets lost, scattered across margins, chat
windows, and half-finished notes.

Research Atlas is built to **capture and develop that thinking at the moment it happens**,
with the paper itself as a first-class, interactive surface. You read the real PDF, select
the sentence that confused you, and ask about _that passage_ — grounded in the paper's own
text, with the answer preserved next to the question as part of a durable research record.
Over time the notes, questions, corrections, and connections compose into a connected
personal research library you can actually think with.

> **Privacy (read first):** for **public papers and personal learning only.** Do not enter
> confidential employer information — internal metrics, proprietary model/project names,
> private code, datasets, results, or non-public architecture. Everything is private by
> default; there are no public routes. When AI features are on, paper text and metadata are
> sent to OpenAI, and the UI says so wherever it applies. See
> [docs/privacy-and-safe-note-taking.md](docs/privacy-and-safe-note-taking.md).

## What makes it different

It is deliberately **not** a generic paper summariser or a PDF chatbot:

- **The PDF is the workspace, not an attachment.** A real pdf.js viewer with a selectable
  text layer sits at the centre. Select text in the paper and turn it directly into a
  persistent highlight, a grounded question, or a note — the interaction lives _in_ the
  paper, not in a side chat. Highlights stay pinned to the passage at any zoom, and a
  highlight can carry a note that the assistant rail opens for you the moment you make it.
- **Answers are grounded in the paper, with provenance.** Q&A retrieves the paper's own
  extracted text, cites the pages it used, separates direct paper claims from
  interpretation, and admits when the paper simply doesn't say. A selected passage is
  treated as primary evidence — the model isn't left to rediscover what you already pointed
  at. Every answer is stored with its question, model, and citations.
- **Your thinking is the artefact.** Questions, misconceptions, corrections, and
  connections are first-class records, not throwaway chat turns. AI-generated content is
  always labelled and never silently overwrites your own notes.
- **Honest by construction.** "Studied through a guide" is never the same as "verified from
  the primary paper"; statuses say what they mean, and accepting a recommendation creates
  an honestly-unread paper — never one pre-marked as understood.

## Screenshots

> The images below are **labelled placeholders** — replace each `.svg` with a real capture
> (same name, `.png`) from a running instance. See
> [docs/screenshots/README.md](docs/screenshots/README.md) for exactly what to capture,
> the target filename, and how to swap them in.

![Reading workspace](docs/screenshots/reading-workspace.svg)

| Highlight → note                                           | Selection → grounded Q&A                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| ![Highlight → note](docs/screenshots/highlight-note.svg)   | ![Ask about a selection](docs/screenshots/selection-ask.svg) |

| Smart add + AI review                                    | Paper view mode                                    |
| -------------------------------------------------------- | -------------------------------------------------- |
| ![Smart add + AI review](docs/screenshots/add-paper-ai.svg) | ![Paper view mode](docs/screenshots/paper-view.svg) |

| Dashboard                                    | Research Radar                       |
| -------------------------------------------- | ------------------------------------ |
| ![Dashboard](docs/screenshots/dashboard.svg) | ![Radar](docs/screenshots/radar.svg) |

| Weekly synthesis                               | Formula OCR                                    |
| ---------------------------------------------- | ---------------------------------------------- |
| ![Weekly synthesis](docs/screenshots/synthesis.svg) | ![Formula OCR](docs/screenshots/formula-ocr.svg) |

| Search & command palette                                       |
| -------------------------------------------------------------- |
| ![Search & command palette](docs/screenshots/search-command.svg) |

## The reading & thinking loop

1. **Add a paper** (`/papers/new`): paste an arXiv link, DOI, title, or URL, or upload a
   PDF. Metadata resolves automatically; the AI pipeline extracts the full text, builds a
   passage-by-passage breakdown, drafts structured notes into _empty_ sections only, and
   proposes topics/concepts/priority/relevance for you to accept or reject.
2. **Read** (`/papers/[slug]/read`): a reader-first three-pane workspace — structured notes
   (editable in place) on the left, the **PDF at the centre**, and the assistant rail
   (page-linked passage summaries, annotations, Q&A) on the right. Panels collapse and
   resize; page, zoom, and layout persist.
3. **Select → highlight, ask, or note**: select text in the paper and either **highlight it**
   (a persistent mark that stays on the PDF), **ask about it** (a question grounded in that
   exact passage, answered with cited pages), or **capture it as a note** — all remembering
   the page so you can jump back to the source. Choosing "Note" persists the highlight *and*
   scrolls the rail to a freshly-opened composer for it, so the passage stays marked while
   you write. Annotate freely (notes, questions, corrections, ideas), quick-create concepts
   and misconceptions without leaving the paper, and OCR an equation screenshot to
   copy-ready KaTeX.
4. **View & synthesise**: `/papers/[slug]` is the clean, read-only record of everything
   accumulated; `/synthesis` drafts a weekly/monthly synthesis from your actual recorded
   activity for you to edit and approve.
5. **Discover** (`/radar`): recommendation-first Research Radar infers what to read next
   from your library itself (reading depth, topics, concepts, recent questions, past
   decisions) — metadata and abstracts only, with an explanation of why each candidate
   appeared.

## Features

**Reading the PDF**

- **Three-pane reader** (`react-resizable-panels`): structured notes · PDF · assistant rail.
  Panels collapse and resize; page, zoom, and layout persist per paper. Below a desktop
  width the panes become tabs.
- **Real pdf.js viewer** with a selectable text layer, lazy per-page rendering, and
  imperative navigation — passage cards, Q&A citations, and "return to source" all jump to
  the right page without remounting the document.
- **Persistent highlights.** Select text → **Highlight** to pin a mark that survives zoom and
  re-render (rects are stored as page fractions, not fragile character offsets), or **Note**
  to highlight *and* drop a linked note — the rail scrolls to an auto-opened composer for it.
  Deleting the note leaves the highlight; the two are independent actions that compose.
- **Formula OCR.** Paste or upload an equation screenshot, drag-crop it, and get structured,
  copy-ready KaTeX / `$$…$$` Markdown (one OpenAI vision call; the image is never stored).

**Capturing your thinking**

- **Annotations** with provenance: notes, questions, corrections, ideas — each remembering
  the page and exact passage it came from. Questions carry a resolve toggle.
- **Grounded Q&A** on any question, answered only from the paper's own extracted text, with
  cited pages, a coverage verdict (grounded / partial / insufficient), and a clear split
  between paper claims and interpretation. Threads of follow-ups hang under the question.
- **Quick-create** concepts and misconceptions from inside the paper, pre-linked, no
  navigation away.
- **Reading sessions**: start/resume an explicit session, then end it with a takeaway and a
  "continue next time" note; the dashboard surfaces an open session to resume.

**AI assistance (all provenance-labelled, never overwrites you)**

- **Smart add** a paper from an arXiv link, DOI, title, or URL, or a PDF upload; metadata
  resolves automatically.
- **Staged, resumable ingestion**: extract text → passage breakdown → structured-note drafts
  (empty sections only) → topic/concept/priority/relevance **suggestions** you accept or
  reject. Every run is audited.
- **Weekly/monthly synthesis** drafted from your *actual* recorded activity, for you to edit
  and approve — the original AI draft is preserved alongside your edits.

**Organising & finding**

- **Library** with search and filters, and a recoverable **trash** (soft delete → restore or
  permanently delete).
- **Topics landscape**, a **Concepts glossary**, and **misconception** records — a connected
  knowledge base, not just a pile of PDFs.
- **Research Radar**: recommendation-first discovery inferred from your library, each
  candidate shown with *why* it appeared (metadata and abstracts only).
- **Dashboard** with real hierarchy, a stat strip, and a 14-day activity view.
- **Global full-text search** across papers, notes, questions, and concepts (`Ctrl+K`
  command palette), powered by Postgres FTS.
- **Honest statuses** everywhere: reading depth and verification are separate and never
  auto-upgraded; "studied through a guide" is never silently promoted to "verified from the
  primary paper".

## Project status & direction

Functional and in active development as a personal tool. This stage delivered a real pdf.js
reading foundation and selection-driven, provenance-tracked Q&A and notes, plus separated
ingestion/Q&A rate budgets. The intended next stage is **hybrid retrieval** — adding
semantic (vector) search alongside the current lexical retrieval so questions phrased in
your own words retrieve the right passages. The selection and Q&A code is structured so that
retriever can slot in behind the existing interface without reworking the interactions. See
[docs/architecture.md](docs/architecture.md) (decision log) for the reasoning.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui ·
Supabase (Postgres, Auth, RLS, Storage) · OpenAI (server-side only) · Zod ·
react-pdf / pdf.js · react-markdown + KaTeX + highlight.js · Vitest · Playwright.
Package manager: **npm**.

## Local development

Prerequisites: Node 20+, npm, **Docker Desktop** (local Supabase), and optionally an OpenAI
API key for the AI features.

```bash
npm install                 # also vendors the pdf.js worker into public/ (postinstall)

# 1. Start the local Supabase stack (first run downloads images)
npx supabase start

# 2. Configure the app: copy .env.example → .env.local and fill in the values
#    `supabase start` printed, plus OPENAI_API_KEY if you want AI features.

# 3. Create the schema (applies supabase/migrations/)
npx supabase db reset

# 4. Seed the starter library (papers, topics, concepts)
npm run seed

# 5. Run the app
npm run dev
```

Sign in at http://localhost:3000/login with the seed account (`SEED_EMAIL` /
`SEED_PASSWORD` from `.env.local`). Missing Supabase env vars → a setup screen; missing
OpenAI key → the app still works with AI features disabled.

The PDF viewer loads its pdf.js worker from `public/pdf.worker.min.mjs`, which
`scripts/setup-pdf-worker.mjs` copies out of `node_modules` on `postinstall` / `predev` /
`prebuild` (the copy is git-ignored, always matching the installed `pdfjs-dist`). No CDN.

### Everyday commands

| Command                                 | What it does                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                           | Dev server                                                                                                                     |
| `npm run seed`                          | Idempotent, non-destructive seed (metadata + notes; **no** LLM calls)                                                          |
| `npm run backfill`                      | Run un-processed papers through the real AI pipeline (needs a real `OPENAI_API_KEY`; set `BACKFILL_EMAIL` on shared DBs)        |
| `npm run db:reset`                      | Recreate the DB from migrations (wipes data)                                                                                   |
| `npm run test`                          | Unit tests (no Supabase/OpenAI needed)                                                                                         |
| `npm run test:integration`              | CRUD/RLS/search/pipeline tests (local Supabase + built-in OpenAI mock)                                                         |
| `npm run test:e2e`                      | Playwright flows (local Supabase + built-in OpenAI mock — no API cost)                                                         |
| `npm run lint` / `typecheck` / `format` | Hygiene                                                                                                                        |

After changing migrations: `npx supabase db reset && npm run seed`, then regenerate types
with `npx supabase gen types typescript --local > lib/supabase/database.gen.ts`.

Seeding is metadata + hand-authored notes only (deterministic, no LLM calls). To also
populate AI passage summaries, extracted page text, AI note drafts, and suggestions for the
seeded papers, run **`npm run backfill`** once with a real `OPENAI_API_KEY` set — it processes
un-processed papers through the same pipeline as the "Process" button. It targets whatever
`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` point at (local by default; set the
cloud values to backfill a deployed database) and skips papers already processed. On shared
databases, scope it to one account first:

```powershell
$env:BACKFILL_EMAIL="gohkhjustin@gmail.com"
npm.cmd run backfill
```

## AI processing details

- Staged, resumable ingestion pipeline (`lib/ai/pipeline.ts`): extract text → passage
  breakdown → structured-note drafts → suggestions. Progress persists per stage; a failure
  resumes where it stopped. Every run is audited in `processing_runs`.
- **Grounded Q&A** (`lib/ai/qa.ts`) answers from the paper's persisted page text
  (`paper_pages`), lexically retrieving the most relevant pages; a selected passage is added
  as primary context. Answers carry model, coverage, cited pages, and token usage on the
  `paper_qa` row. Q&A is a lightweight interactive workload with its **own** hourly budget
  (`QA_MAX_PER_HOUR`), separate from ingestion (`AI_MAX_RUNS_PER_HOUR`), so asking questions
  never blocks processing a new paper.
- Extracted document text is untrusted input (prompt-injection guidance in every prompt).
  Outbound fetches of user URLs go through an SSRF-hardened fetcher (`lib/ai/safe-fetch.ts`):
  https-only, private/metadata hosts blocked with DNS re-checking, redirect/size/time/
  content-type caps.
- Tests run against a deterministic local mock (`tests/mocks/openai-server.mjs`, plus a mock
  arXiv feed) wired via `OPENAI_BASE_URL` / `ARXIV_BASE_URL` — CI never spends API credit.

## Production deployment

Full step-by-step: **[docs/deployment.md](docs/deployment.md)** (private single-user deploy —
fresh cloud Supabase project + Vercel, sign-ups closed). In short:

1. Create a hosted Supabase project; `npx supabase link --project-ref <ref>` then
   `npx supabase db push`.
2. **Keep sign-ups closed** (the default): leave `ALLOW_SIGNUP` unset so only accounts you
   create can log in — the sign-up UI and action are disabled. Also disable sign-ups in the
   Supabase dashboard (defence in depth). Create your account via the dashboard or `seed`.
3. Deploy to a Node host (e.g. Vercel): set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `OPENAI_API_KEY` (server env only). Do **not**
   deploy the service-role key with the app.
4. Paper processing can run for a few minutes on long PDFs (`maxDuration = 300` on the
   processing route); on serverless plans with shorter limits the run fails mid-way and the
   Retry button resumes from the last completed stage.

## Docs

- [docs/deployment.md](docs/deployment.md) — private single-user deploy runbook
- [docs/architecture.md](docs/architecture.md) — decision log (ADs)
- [docs/data-model.md](docs/data-model.md) — schema reference
- [docs/research-radar-roadmap.md](docs/research-radar-roadmap.md) — future automated discovery
- [docs/privacy-and-safe-note-taking.md](docs/privacy-and-safe-note-taking.md)
- [CLAUDE.md](CLAUDE.md) — conventions for AI-assisted development

`docs/source/` is git-ignored local-only source material (purged from git history).

## License

**All rights reserved.** Copyright © 2026 Justin Goh Kian Hwee. See [`LICENSE`](LICENSE).

The source is published for viewing and reference only. No license is granted: you may not
use, copy, modify, redistribute, host, or build on any part of it without prior written
permission from the copyright holder.
