-- Research Atlas — initial schema.
-- Conventions (see CLAUDE.md / docs/architecture.md):
--   * every content table has user_id + owner-only RLS + visibility ('private' default)
--   * structured paper content = one row per section in paper_notes
--   * verification_status is never upgraded automatically

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- array_to_string is only STABLE, so generated tsvector columns need an
-- IMMUTABLE wrapper for text[] inputs.
create or replace function public.immutable_array_to_text(arr text[])
returns text
language sql
immutable
as $$
  select coalesce(array_to_string(arr, ' '), '')
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.reading_status as enum (
  'to_read', 'queued', 'skimmed', 'studied_through_guide',
  'deep_read', 'implemented', 'revisit'
);

create type public.verification_status as enum (
  'metadata_only', 'secondary_summary_only', 'primary_opened', 'primary_claims_verified'
);

create type public.visibility as enum ('private', 'publishable');

create type public.experiment_status as enum (
  'proposed', 'implementing', 'running', 'analysing', 'completed', 'abandoned'
);

create type public.paper_section_type as enum (
  'summary',
  'thesis',
  'problem',
  'insufficiency',
  'architecture',
  'mechanism',
  'equations',
  'intuition',
  'why_it_works',
  'training_setup',
  'evaluation',
  'results',
  'production_evidence',
  'serving',
  'failure_modes',
  'segment_risks',
  'tiktok_relevance',
  'implementation_mapping',
  'experiment_proposal',
  'misconceptions',
  'open_questions',
  'related_papers',
  'boss_explanation',
  'sources_to_verify'
);

create type public.synthesis_kind as enum ('weekly', 'monthly');

create type public.relation_kind as enum (
  'builds_on', 'contrasts_with', 'same_family', 'cites', 'supersedes'
);

create type public.radar_status as enum (
  'fetched', 'scored', 'in_review', 'accepted', 'dismissed'
);

-- ---------------------------------------------------------------------------
-- papers
-- ---------------------------------------------------------------------------

create table public.papers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  slug text not null,
  subtitle text,
  authors text[] not null default '{}',
  organisation text,
  year int,
  venue text,
  arxiv_id text,
  doi text,
  canonical_url text,
  pdf_url text,
  abstract text,
  reading_status public.reading_status not null default 'to_read',
  verification_status public.verification_status not null default 'metadata_only',
  priority int not null default 3 check (priority between 1 and 5),
  visibility public.visibility not null default 'private',
  tiktok_shop_relevance int not null default 0 check (tiktok_shop_relevance between 0 and 5),
  team_relevance int not null default 0 check (team_relevance between 0 and 5),
  production_relevance int not null default 0 check (production_relevance between 0 and 5),
  production_evidence text,
  primary_source_verified boolean not null default false,
  needs_revisit boolean not null default false,
  note_source text,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(subtitle, '') || ' ' ||
      public.immutable_array_to_text(authors) || ' ' ||
      coalesce(organisation, '') || ' ' ||
      coalesce(venue, '') || ' ' ||
      coalesce(arxiv_id, '') || ' ' ||
      coalesce(abstract, '')
    )
  ) stored,
  unique (user_id, slug)
);

create index papers_fts_idx on public.papers using gin (fts);
create index papers_user_reading_idx on public.papers (user_id, reading_status);
create index papers_user_verification_idx on public.papers (user_id, verification_status);
create index papers_user_priority_idx on public.papers (user_id, priority desc);
create index papers_user_year_idx on public.papers (user_id, year desc);
create index papers_user_updated_idx on public.papers (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- topics
-- ---------------------------------------------------------------------------

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  overview_md text,
  synthesis_md text,
  knowledge_gaps_md text,
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.paper_topics (
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  primary key (paper_id, topic_id)
);

create index paper_topics_topic_idx on public.paper_topics (topic_id);

-- ---------------------------------------------------------------------------
-- concepts
-- ---------------------------------------------------------------------------

create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  plain_definition_md text,
  technical_definition_md text,
  equation_md text,
  why_it_helps_md text,
  failure_modes_md text,
  my_implementations_md text,
  misconceptions_md text,
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(plain_definition_md, '') || ' ' ||
      coalesce(technical_definition_md, '') || ' ' ||
      coalesce(why_it_helps_md, '') || ' ' ||
      coalesce(failure_modes_md, '') || ' ' ||
      coalesce(misconceptions_md, '')
    )
  ) stored,
  unique (user_id, slug)
);

create index concepts_fts_idx on public.concepts using gin (fts);

create table public.paper_concepts (
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  primary key (paper_id, concept_id)
);

create index paper_concepts_concept_idx on public.paper_concepts (concept_id);

-- ---------------------------------------------------------------------------
-- paper_notes — one row per structured section (never one giant text column)
-- ---------------------------------------------------------------------------

create table public.paper_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id) on delete cascade,
  section_type public.paper_section_type not null,
  body_md text not null default '',
  position int not null default 0,
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (to_tsvector('english', coalesce(body_md, ''))) stored,
  unique (paper_id, section_type)
);

create index paper_notes_fts_idx on public.paper_notes using gin (fts);
create index paper_notes_paper_idx on public.paper_notes (paper_id, position);
create index paper_notes_user_updated_idx on public.paper_notes (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- experiments
-- ---------------------------------------------------------------------------

create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  slug text not null,
  repo_name text,
  branch_ref text,
  research_question text,
  hypothesis text,
  baseline text,
  treatment text,
  dataset text,
  parameters_md text,
  metrics_md text,
  results_md text,
  segment_results_md text,
  latency_memory_md text,
  interpretation_md text,
  failure_cases_md text,
  next_experiment_md text,
  metrics_json jsonb,
  status public.experiment_status not null default 'proposed',
  happened_on date,
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(research_question, '') || ' ' ||
      coalesce(hypothesis, '') || ' ' ||
      coalesce(results_md, '') || ' ' ||
      coalesce(interpretation_md, '') || ' ' ||
      coalesce(failure_cases_md, '')
    )
  ) stored,
  unique (user_id, slug)
);

create index experiments_fts_idx on public.experiments using gin (fts);
create index experiments_user_status_idx on public.experiments (user_id, status);
create index experiments_user_updated_idx on public.experiments (user_id, updated_at desc);

create table public.experiment_papers (
  user_id uuid not null references auth.users (id) on delete cascade,
  experiment_id uuid not null references public.experiments (id) on delete cascade,
  paper_id uuid not null references public.papers (id) on delete cascade,
  primary key (experiment_id, paper_id)
);

create index experiment_papers_paper_idx on public.experiment_papers (paper_id);

create table public.experiment_concepts (
  user_id uuid not null references auth.users (id) on delete cascade,
  experiment_id uuid not null references public.experiments (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  primary key (experiment_id, concept_id)
);

create index experiment_concepts_concept_idx on public.experiment_concepts (concept_id);

-- ---------------------------------------------------------------------------
-- misconception_corrections — first-class record of belief → correction
-- ---------------------------------------------------------------------------

create table public.misconception_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  initial_belief_md text not null,
  why_i_believed_md text,
  corrected_understanding_md text not null,
  evidence_md text,
  paper_id uuid references public.papers (id) on delete set null,
  concept_id uuid references public.concepts (id) on delete set null,
  corrected_on date not null default current_date,
  confidence int not null default 3 check (confidence between 1 and 5),
  can_explain_without_notes boolean not null default false,
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('english',
      coalesce(initial_belief_md, '') || ' ' ||
      coalesce(why_i_believed_md, '') || ' ' ||
      coalesce(corrected_understanding_md, '') || ' ' ||
      coalesce(evidence_md, '')
    )
  ) stored
);

create index misconceptions_fts_idx on public.misconception_corrections using gin (fts);
create index misconceptions_user_date_idx
  on public.misconception_corrections (user_id, corrected_on desc);
create index misconceptions_paper_idx on public.misconception_corrections (paper_id);
create index misconceptions_concept_idx on public.misconception_corrections (concept_id);

-- ---------------------------------------------------------------------------
-- paper_relations
-- ---------------------------------------------------------------------------

create table public.paper_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  from_paper_id uuid not null references public.papers (id) on delete cascade,
  to_paper_id uuid not null references public.papers (id) on delete cascade,
  relation_kind public.relation_kind not null default 'builds_on',
  note text,
  created_at timestamptz not null default now(),
  check (from_paper_id <> to_paper_id),
  unique (from_paper_id, to_paper_id, relation_kind)
);

create index paper_relations_from_idx on public.paper_relations (from_paper_id);
create index paper_relations_to_idx on public.paper_relations (to_paper_id);

-- ---------------------------------------------------------------------------
-- reading_sessions — feeds "continue reading" and the weekly reading target
-- ---------------------------------------------------------------------------

create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id) on delete cascade,
  occurred_on date not null default current_date,
  minutes int check (minutes is null or minutes > 0),
  note text,
  created_at timestamptz not null default now()
);

create index reading_sessions_user_date_idx on public.reading_sessions (user_id, occurred_on desc);
create index reading_sessions_paper_idx on public.reading_sessions (paper_id);

-- ---------------------------------------------------------------------------
-- synthesis_notes
-- ---------------------------------------------------------------------------

create table public.synthesis_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.synthesis_kind not null,
  period_start date not null,
  title text not null,
  body_md text not null default '',
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body_md, ''))
  ) stored,
  unique (user_id, kind, period_start)
);

create index synthesis_fts_idx on public.synthesis_notes using gin (fts);
create index synthesis_user_period_idx on public.synthesis_notes (user_id, period_start desc);

-- ---------------------------------------------------------------------------
-- sources — citations, page references, and claims needing verification
-- ---------------------------------------------------------------------------

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id) on delete cascade,
  source_name text not null,
  locator text,
  url text,
  quote_or_claim text,
  needs_verification boolean not null default false,
  created_at timestamptz not null default now()
);

create index sources_paper_idx on public.sources (paper_id);
create index sources_user_needs_verification_idx
  on public.sources (user_id, needs_verification);

-- ---------------------------------------------------------------------------
-- radar_candidates — future Research Radar review queue (no providers in MVP)
-- ---------------------------------------------------------------------------

create table public.radar_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  normalised_title text not null,
  arxiv_id text,
  doi text,
  url text,
  abstract text,
  provider text not null,
  published_on date,
  topics text[] not null default '{}',
  score numeric,
  score_breakdown jsonb,
  why_it_matters text,
  status public.radar_status not null default 'fetched',
  accepted_paper_id uuid references public.papers (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index radar_user_status_idx on public.radar_candidates (user_id, status);
create index radar_normalised_title_idx on public.radar_candidates (user_id, normalised_title);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'papers', 'topics', 'concepts', 'paper_notes', 'experiments',
    'misconception_corrections', 'synthesis_notes', 'radar_candidates'
  ] loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security: owner-only on every content table
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'papers', 'topics', 'paper_topics', 'concepts', 'paper_concepts', 'paper_notes',
    'experiments', 'experiment_papers', 'experiment_concepts',
    'misconception_corrections', 'paper_relations', 'reading_sessions',
    'synthesis_notes', 'sources', 'radar_candidates'
  ] loop
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
-- Full-text search across all note-bearing entities.
-- SECURITY INVOKER (default): RLS applies, so results are always owner-scoped.
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

-- ---------------------------------------------------------------------------
-- Storage: private bucket for optional paper attachments
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('paper-attachments', 'paper-attachments', false)
on conflict (id) do nothing;

create policy "paper_attachments_owner_all"
on storage.objects for all to authenticated
using (bucket_id = 'paper-attachments' and owner = (select auth.uid()))
with check (bucket_id = 'paper-attachments' and owner = (select auth.uid()));
