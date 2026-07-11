-- Research Atlas v2 — general-purpose redesign.
--  * employer-specific relevance columns → single editable `relevance` + note
--  * AI ingestion: processing state on papers, auditable processing_runs,
--    reviewable paper_suggestions, AI passage breakdown (paper_passages)
--  * reading flow: paper_annotations, explicit reading sessions
--  * AI-assisted synthesis: draft + approval columns

-- ---------------------------------------------------------------------------
-- papers: generalised relevance + processing state
-- ---------------------------------------------------------------------------

alter table public.papers
  add column relevance int not null default 0 check (relevance between 0 and 5),
  add column relevance_note text,
  add column source_input text,
  add column processing_error text,
  add column processed_at timestamptz;

update public.papers
   set relevance = greatest(tiktok_shop_relevance, team_relevance);

alter table public.papers
  drop column tiktok_shop_relevance,
  drop column team_relevance;

create type public.processing_status as enum (
  'none', 'queued', 'fetching', 'extracting', 'summarising', 'suggesting', 'done', 'failed'
);

alter table public.papers
  add column processing_status public.processing_status not null default 'none';

-- Section rename: employer-specific → personal framing.
alter type public.paper_section_type rename value 'tiktok_relevance' to 'relevance_to_me';

-- ---------------------------------------------------------------------------
-- paper_notes: AI provenance
-- ---------------------------------------------------------------------------

create type public.note_authorship as enum ('human', 'ai', 'ai_edited');

alter table public.paper_notes
  add column authorship public.note_authorship not null default 'human';

-- ---------------------------------------------------------------------------
-- paper_passages — AI breakdown of the paper (section / major idea)
-- ---------------------------------------------------------------------------

create table public.paper_passages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id) on delete cascade,
  position int not null,
  title text not null,
  anchor text,            -- human-readable locator, e.g. "§3 Method"
  page_start int,         -- 1-based PDF page for the split viewer
  page_end int,
  ai_summary_md text not null default '',
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (paper_id, position)
);

create index paper_passages_paper_idx on public.paper_passages (paper_id, position);

-- ---------------------------------------------------------------------------
-- paper_annotations — user notes captured while reading
-- ---------------------------------------------------------------------------

create type public.annotation_kind as enum ('note', 'question', 'correction', 'idea');

create table public.paper_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id) on delete cascade,
  -- keep user content if the AI breakdown is regenerated
  passage_id uuid references public.paper_passages (id) on delete set null,
  kind public.annotation_kind not null default 'note',
  body_md text not null,
  resolved boolean not null default false,
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (to_tsvector('english', coalesce(body_md, ''))) stored
);

create index paper_annotations_fts_idx on public.paper_annotations using gin (fts);
create index paper_annotations_paper_idx on public.paper_annotations (paper_id, created_at);
create index paper_annotations_user_open_questions_idx
  on public.paper_annotations (user_id, kind, resolved);

-- ---------------------------------------------------------------------------
-- processing_runs — auditable, resumable AI ingestion runs
-- ---------------------------------------------------------------------------

create type public.run_status as enum ('queued', 'running', 'done', 'failed');

create table public.processing_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id) on delete cascade,
  status public.run_status not null default 'queued',
  stage text,                                   -- stage currently running / last reached
  stages_completed text[] not null default '{}',
  model text,
  prompt_version text,
  attempt int not null default 1,
  error text,
  usage jsonb,                                  -- accumulated token usage
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index processing_runs_paper_idx on public.processing_runs (paper_id, created_at desc);
create index processing_runs_user_recent_idx on public.processing_runs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- paper_suggestions — AI proposals with explicit accept/reject audit trail
-- ---------------------------------------------------------------------------

create type public.suggestion_kind as enum ('topic', 'concept', 'priority', 'relevance');
create type public.suggestion_status as enum ('proposed', 'accepted', 'rejected');

create table public.paper_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id) on delete cascade,
  run_id uuid references public.processing_runs (id) on delete set null,
  kind public.suggestion_kind not null,
  payload jsonb not null,                       -- e.g. {"name":"Cold Start","rationale":"…"}
  status public.suggestion_status not null default 'proposed',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index paper_suggestions_paper_status_idx
  on public.paper_suggestions (paper_id, status);

-- ---------------------------------------------------------------------------
-- reading_sessions — explicit start/end workflow
-- ---------------------------------------------------------------------------

alter table public.reading_sessions
  add column started_at timestamptz,
  add column ended_at timestamptz,
  add column takeaway_md text,
  add column continue_md text;

update public.reading_sessions
   set started_at = created_at,
       ended_at = created_at
 where started_at is null;

-- one active (un-ended) session per user
create unique index reading_sessions_one_active_idx
  on public.reading_sessions (user_id)
  where ended_at is null;

-- ---------------------------------------------------------------------------
-- synthesis_notes — AI draft + approval
-- ---------------------------------------------------------------------------

alter table public.synthesis_notes
  add column ai_draft_md text,
  add column approved_at timestamptz;

-- ---------------------------------------------------------------------------
-- triggers + RLS for new tables
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'paper_passages', 'paper_annotations', 'processing_runs', 'paper_suggestions'
  ] loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t || '_owner_only', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- search_all: include reading annotations
-- ---------------------------------------------------------------------------

create or replace function public.search_all(query text)
returns table (
  kind text,
  id uuid,
  title text,
  slug text,
  excerpt text,
  reading_status text,
  topic_names text[],
  updated_at timestamptz,
  rank real
)
language sql
stable
as $$
  with q as (select websearch_to_tsquery('english', query) as tsq)

  select
    'paper'::text as kind,
    p.id,
    p.title,
    p.slug,
    ts_headline('english',
      coalesce(p.abstract, p.subtitle, p.title),
      q.tsq, 'MaxWords=30, MinWords=10') as excerpt,
    p.reading_status::text,
    coalesce(
      (select array_agg(t.name order by t.name)
         from public.paper_topics pt
         join public.topics t on t.id = pt.topic_id
        where pt.paper_id = p.id),
      '{}'
    ) as topic_names,
    p.updated_at,
    ts_rank(p.fts, q.tsq) as rank
  from public.papers p, q
  where p.fts @@ q.tsq

  union all

  select
    'paper_note',
    n.paper_id,
    p.title || ' — ' || replace(n.section_type::text, '_', ' '),
    p.slug,
    ts_headline('english', n.body_md, q.tsq, 'MaxWords=30, MinWords=10'),
    p.reading_status::text,
    coalesce(
      (select array_agg(t.name order by t.name)
         from public.paper_topics pt
         join public.topics t on t.id = pt.topic_id
        where pt.paper_id = p.id),
      '{}'
    ),
    n.updated_at,
    ts_rank(n.fts, q.tsq)
  from public.paper_notes n
  join public.papers p on p.id = n.paper_id, q
  where n.fts @@ q.tsq

  union all

  select
    'annotation',
    a.paper_id,
    p.title || ' — ' || a.kind::text,
    p.slug,
    ts_headline('english', a.body_md, q.tsq, 'MaxWords=30, MinWords=10'),
    p.reading_status::text,
    '{}',
    a.updated_at,
    ts_rank(a.fts, q.tsq)
  from public.paper_annotations a
  join public.papers p on p.id = a.paper_id, q
  where a.fts @@ q.tsq

  union all

  select
    'concept', c.id, c.name, c.slug,
    ts_headline('english',
      coalesce(c.plain_definition_md, c.technical_definition_md, c.name),
      q.tsq, 'MaxWords=30, MinWords=10'),
    null, '{}', c.updated_at, ts_rank(c.fts, q.tsq)
  from public.concepts c, q
  where c.fts @@ q.tsq

  union all

  select
    'experiment', e.id, e.title, e.slug,
    ts_headline('english',
      coalesce(e.interpretation_md, e.research_question, e.title),
      q.tsq, 'MaxWords=30, MinWords=10'),
    e.status::text, '{}', e.updated_at, ts_rank(e.fts, q.tsq)
  from public.experiments e, q
  where e.fts @@ q.tsq

  union all

  select
    'misconception', m.id,
    left(regexp_replace(m.initial_belief_md, E'[\\n\\r#*>`]+', ' ', 'g'), 80),
    m.id::text,
    ts_headline('english',
      m.initial_belief_md || ' ' || m.corrected_understanding_md,
      q.tsq, 'MaxWords=30, MinWords=10'),
    null, '{}', m.updated_at, ts_rank(m.fts, q.tsq)
  from public.misconception_corrections m, q
  where m.fts @@ q.tsq

  union all

  select
    'synthesis', s.id, s.title, s.id::text,
    ts_headline('english', s.body_md, q.tsq, 'MaxWords=30, MinWords=10'),
    s.kind::text, '{}', s.updated_at, ts_rank(s.fts, q.tsq)
  from public.synthesis_notes s, q
  where s.fts @@ q.tsq

  order by rank desc, updated_at desc
  limit 50
$$;
