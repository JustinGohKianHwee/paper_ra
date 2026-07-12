-- v3 redesign:
--  * papers gain a recoverable trash (deleted_at)
--  * extracted page text is persisted (paper_pages) so grounded Q&A and
--    reprocessing never re-download the PDF
--  * paper_qa: grounded question answering threaded on question annotations
--  * radar_candidates upgraded for the recommendation-first Radar v1
--  * search_all excludes trashed papers and the dormant experiments feature

-- ---------------------------------------------------------------------------
-- papers: soft delete
-- ---------------------------------------------------------------------------

alter table public.papers add column deleted_at timestamptz;

create index papers_trash_idx on public.papers (user_id, deleted_at)
  where deleted_at is not null;

-- ---------------------------------------------------------------------------
-- paper_pages — extracted primary-source text, one row per PDF page.
-- Written by the pipeline's extract stage; read by grounded Q&A retrieval.
-- Replaced wholesale when a paper is reprocessed.
-- ---------------------------------------------------------------------------

create table public.paper_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id) on delete cascade,
  page_no int not null check (page_no >= 1),
  content text not null,
  char_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (paper_id, page_no)
);

create index paper_pages_paper_idx on public.paper_pages (paper_id, page_no);

-- ---------------------------------------------------------------------------
-- paper_qa — grounded Q&A exchanges. Each row is one question -> one answer,
-- threaded under the originating question annotation (position 1 = the
-- annotation's own question, 2+ = follow-ups). Answers are AI-generated and
-- provenance-labelled; editing flips authorship to ai_edited.
-- ---------------------------------------------------------------------------

create type public.qa_status as enum ('pending', 'answered', 'failed');
create type public.qa_coverage as enum ('grounded', 'partial', 'insufficient');

create table public.paper_qa (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id) on delete cascade,
  annotation_id uuid not null references public.paper_annotations (id) on delete cascade,
  position int not null default 1 check (position >= 1),
  question_md text not null,
  answer_md text,
  answer_authorship public.note_authorship not null default 'ai',
  -- how well the paper covered the question, as judged by the model
  coverage public.qa_coverage,
  -- pages/passages the answer drew on: { pages: int[], passage_ids: uuid[] }
  grounding jsonb,
  status public.qa_status not null default 'pending',
  error text,
  model text,
  prompt_version text,
  usage jsonb,
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (annotation_id, position)
);

create index paper_qa_paper_idx on public.paper_qa (paper_id, created_at);
create index paper_qa_annotation_idx on public.paper_qa (annotation_id, position);

-- ---------------------------------------------------------------------------
-- radar_candidates: recommendation-first Radar v1
-- ---------------------------------------------------------------------------

-- 'deferred' = user chose "later"; kept out of the active queue but re-rankable.
alter type public.radar_status add value if not exists 'deferred';

alter table public.radar_candidates
  -- why this was recommended: matched topics/concepts/papers + signal breakdown
  add column related_json jsonb,
  -- set when the candidate came from a one-off topic search rather than the
  -- library-inferred profile (temporary interest, never persisted as profile)
  add column query_context text,
  add column decided_at timestamptz,
  add column authors text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- updated_at trigger + RLS for new tables
-- ---------------------------------------------------------------------------

create trigger paper_qa_set_updated_at
  before update on public.paper_qa
  for each row execute function public.set_updated_at();

do $$
declare
  t text;
begin
  foreach t in array array['paper_pages', 'paper_qa'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select using (user_id = (select auth.uid()))',
      t || '_select_own', t
    );
    execute format(
      'create policy %I on public.%I for insert with check (user_id = (select auth.uid()))',
      t || '_insert_own', t
    );
    execute format(
      'create policy %I on public.%I for update using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t || '_update_own', t
    );
    execute format(
      'create policy %I on public.%I for delete using (user_id = (select auth.uid()))',
      t || '_delete_own', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- search_all v3: trashed papers (and their notes/annotations) disappear from
-- search; the dormant experiments feature is no longer searched (data kept —
-- restore the union branch when the feature returns).
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
    and p.deleted_at is null

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
    and p.deleted_at is null

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
    and p.deleted_at is null

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
