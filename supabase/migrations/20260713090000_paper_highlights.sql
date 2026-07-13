-- Persistent PDF highlights. A highlight marks selected text on a page and can
-- exist on its own ("just highlight") or carry a note (annotation_id set). Rects
-- are stored normalised to the page (0..1 fractions of width/height) so they
-- survive zoom and re-render. Notes remain ordinary paper_annotations; the link
-- is nulled if the note is deleted (the highlight stays).

create table public.paper_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id) on delete cascade,
  page_number int not null check (page_number >= 1),
  selected_text text not null,
  -- [{ x, y, w, h }] as fractions of the page (0..1)
  rects jsonb not null default '[]',
  color text not null default 'amber',
  annotation_id uuid references public.paper_annotations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index paper_highlights_paper_idx on public.paper_highlights (paper_id, page_number);
create index paper_highlights_annotation_idx on public.paper_highlights (annotation_id);

create trigger paper_highlights_set_updated_at
  before update on public.paper_highlights
  for each row execute function public.set_updated_at();

-- Explicit Data-API grants (default privileges don't always carry to tables
-- added incrementally); RLS below is the real access control. anon gets nothing.
grant select, insert, update, delete on public.paper_highlights to authenticated, service_role;

alter table public.paper_highlights enable row level security;
create policy paper_highlights_select_own on public.paper_highlights
  for select using (user_id = (select auth.uid()));
create policy paper_highlights_insert_own on public.paper_highlights
  for insert with check (user_id = (select auth.uid()));
create policy paper_highlights_update_own on public.paper_highlights
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy paper_highlights_delete_own on public.paper_highlights
  for delete using (user_id = (select auth.uid()));

-- Ensure the Data API picks up the new table immediately (PostgREST schema reload).
notify pgrst, 'reload schema';
