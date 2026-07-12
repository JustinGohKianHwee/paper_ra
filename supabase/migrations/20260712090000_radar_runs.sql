-- Radar v1: audit trail for user-triggered recommendation refreshes.
-- processing_runs requires a paper_id, so Radar (library-level) gets its own
-- small run table: what was fetched, what survived dedupe, LLM usage, errors.

create table public.radar_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- set when the refresh was a one-off topic search rather than profile-based
  query_context text,
  queries text[] not null default '{}',
  candidates_fetched int not null default 0,
  candidates_added int not null default 0,
  model text,
  prompt_version text,
  usage jsonb,
  status text not null default 'running', -- running | done | failed
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index radar_runs_user_idx on public.radar_runs (user_id, created_at desc);

alter table public.radar_runs enable row level security;
create policy radar_runs_select_own on public.radar_runs
  for select using (user_id = (select auth.uid()));
create policy radar_runs_insert_own on public.radar_runs
  for insert with check (user_id = (select auth.uid()));
create policy radar_runs_update_own on public.radar_runs
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy radar_runs_delete_own on public.radar_runs
  for delete using (user_id = (select auth.uid()));
