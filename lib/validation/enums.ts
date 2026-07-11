import { z } from "zod";

/** Zod mirrors of the Postgres enums. Keep in sync with the migrations. */

export const readingStatusValues = [
  "to_read",
  "queued",
  "skimmed",
  "studied_through_guide",
  "deep_read",
  "implemented",
  "revisit",
] as const;
export const readingStatusSchema = z.enum(readingStatusValues);
export type ReadingStatus = z.infer<typeof readingStatusSchema>;

export const verificationStatusValues = [
  "metadata_only",
  "secondary_summary_only",
  "primary_opened",
  "primary_claims_verified",
] as const;
export const verificationStatusSchema = z.enum(verificationStatusValues);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const visibilityValues = ["private", "publishable"] as const;
export const visibilitySchema = z.enum(visibilityValues);
export type Visibility = z.infer<typeof visibilitySchema>;

export const experimentStatusValues = [
  "proposed",
  "implementing",
  "running",
  "analysing",
  "completed",
  "abandoned",
] as const;
export const experimentStatusSchema = z.enum(experimentStatusValues);
export type ExperimentStatus = z.infer<typeof experimentStatusSchema>;

export const synthesisKindValues = ["weekly", "monthly"] as const;
export const synthesisKindSchema = z.enum(synthesisKindValues);
export type SynthesisKind = z.infer<typeof synthesisKindSchema>;

export const relationKindValues = [
  "builds_on",
  "contrasts_with",
  "same_family",
  "cites",
  "supersedes",
] as const;
export const relationKindSchema = z.enum(relationKindValues);
export type RelationKind = z.infer<typeof relationKindSchema>;

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  to_read: "To read",
  queued: "Queued",
  skimmed: "Skimmed",
  studied_through_guide: "Studied through guide",
  deep_read: "Deep read",
  implemented: "Implemented",
  revisit: "Revisit",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  metadata_only: "Metadata only",
  secondary_summary_only: "Secondary summary only",
  primary_opened: "Primary paper opened",
  primary_claims_verified: "Primary claims verified",
};

export const EXPERIMENT_STATUS_LABELS: Record<ExperimentStatus, string> = {
  proposed: "Proposed",
  implementing: "Implementing",
  running: "Running",
  analysing: "Analysing",
  completed: "Completed",
  abandoned: "Abandoned",
};

export const RELATION_KIND_LABELS: Record<RelationKind, string> = {
  builds_on: "Builds on",
  contrasts_with: "Contrasts with",
  same_family: "Same family",
  cites: "Cites",
  supersedes: "Supersedes",
};
