import type { PaperSectionType } from "@/lib/templates/paper";
import type { ReadingStatus, RelationKind, VerificationStatus } from "@/lib/validation/enums";

export interface SourceSeed {
  source_name: string;
  locator?: string;
  url?: string;
  quote_or_claim?: string;
  needs_verification: boolean;
}

export interface PaperSeed {
  title: string;
  slug: string;
  subtitle?: string;
  organisation?: string;
  year?: number;
  venue?: string;
  arxiv_id?: string;
  reading_status: ReadingStatus;
  verification_status: VerificationStatus;
  priority: number; // 1–5
  relevance: number; // 0–5 personal/role/project relevance
  relevance_note?: string;
  production_relevance: number; // 0–5
  production_evidence?: string;
  needs_revisit?: boolean;
  note_source?: string;
  topics: string[]; // topic slugs
  concepts: string[]; // concept slugs
  sections: Partial<Record<PaperSectionType, string>>;
  sources: SourceSeed[];
}

export interface RelationSeed {
  from: string; // paper slug
  to: string; // paper slug
  kind: RelationKind;
  note?: string;
}
