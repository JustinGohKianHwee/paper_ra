-- Selection-driven research interactions: when a note or question is created
-- from text selected in the PDF, record where it came from. Provenance lives on
-- paper_annotations because both selection-notes and selection-questions are
-- annotations (a question threads its Q&A under it).
--
--   page_number   1-based PDF page the selection was on (drives "return to source")
--   selected_text the exact selected passage — used as PRIMARY grounding context
--                 for selection Q&A, never re-derived by lexical retrieval
--   anchor        extensible anchor metadata: { page, quote: { exact, prefix, suffix } }
--                 stored now so future robust text-range highlighting can be added
--                 without another migration or data loss

alter table public.paper_annotations
  add column page_number int check (page_number is null or page_number >= 1),
  add column selected_text text,
  add column anchor jsonb;
