/**
 * Typed access to the Postgres schema. `database.gen.ts` is generated:
 *   npx supabase gen types typescript --local > lib/supabase/database.gen.ts
 * Regenerate after every migration. This file adds stable, app-facing aliases
 * so feature code never imports the generated file directly.
 */
import type { Database as GeneratedDatabase } from "@/lib/supabase/database.gen";

export type Database = GeneratedDatabase;
export type { Json } from "@/lib/supabase/database.gen";

type PublicSchema = GeneratedDatabase["public"];
type Tables = PublicSchema["Tables"];
type Enums = PublicSchema["Enums"];

export type PaperRow = Tables["papers"]["Row"];
export type PaperPassageRow = Tables["paper_passages"]["Row"];
export type PaperAnnotationRow = Tables["paper_annotations"]["Row"];
export type ProcessingRunRow = Tables["processing_runs"]["Row"];
export type PaperSuggestionRow = Tables["paper_suggestions"]["Row"];
export type TopicRow = Tables["topics"]["Row"];
export type ConceptRow = Tables["concepts"]["Row"];
export type PaperNoteRow = Tables["paper_notes"]["Row"];
export type ExperimentRow = Tables["experiments"]["Row"];
export type MisconceptionRow = Tables["misconception_corrections"]["Row"];
export type PaperRelationRow = Tables["paper_relations"]["Row"];
export type ReadingSessionRow = Tables["reading_sessions"]["Row"];
export type SynthesisNoteRow = Tables["synthesis_notes"]["Row"];
export type SourceRow = Tables["sources"]["Row"];
export type RadarCandidateRow = Tables["radar_candidates"]["Row"];

export type ReadingStatus = Enums["reading_status"];
export type VerificationStatus = Enums["verification_status"];
export type Visibility = Enums["visibility"];
export type ExperimentStatus = Enums["experiment_status"];
export type PaperSectionTypeDb = Enums["paper_section_type"];
export type SynthesisKind = Enums["synthesis_kind"];
export type RelationKind = Enums["relation_kind"];
export type RadarStatus = Enums["radar_status"];
export type ProcessingStatus = Enums["processing_status"];
export type NoteAuthorship = Enums["note_authorship"];
export type AnnotationKind = Enums["annotation_kind"];
export type RunStatus = Enums["run_status"];
export type SuggestionKind = Enums["suggestion_kind"];
export type SuggestionStatus = Enums["suggestion_status"];

export type SearchAllResult = PublicSchema["Functions"]["search_all"]["Returns"][number];
