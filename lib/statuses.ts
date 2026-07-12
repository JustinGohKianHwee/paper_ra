import {
  EXPERIMENT_STATUS_LABELS,
  READING_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  readingStatusValues,
  verificationStatusValues,
  type ExperimentStatus,
  type ReadingStatus,
  type VerificationStatus,
} from "@/lib/validation/enums";

/**
 * Single source of truth for what each status *means*. Badges, tooltips,
 * filter options, form selects, and the docs table all read from here so the
 * definitions cannot drift apart. Labels live in `lib/validation/enums.ts`
 * (next to the zod enums); explanations live here.
 *
 * Honesty invariant: reading depth and verification are independent axes.
 * "Studied through a guide" is a reading status; it never implies any claim
 * was verified against the primary paper.
 */

export interface StatusInfo<V extends string = string> {
  value: V;
  label: string;
  description: string;
}

const readingDescriptions: Record<ReadingStatus, string> = {
  to_read: "In your library, not started. No claims about it live in your head yet — ideally.",
  queued: "Deliberately next in line: you have decided to read this soon, ahead of the rest.",
  skimmed:
    "You looked at the abstract, figures, or conclusions only. Enough to know what it is, not enough to trust your recall of it.",
  studied_through_guide:
    "Studied via a secondary source — a guide, survey, blog post, or video — not the paper itself. Your notes may be detailed, but they inherit the secondary source's errors.",
  deep_read:
    "You read the primary paper itself, carefully, section by section. Says nothing about whether you checked its claims — that is the verification status.",
  implemented:
    "You implemented or reproduced part of the paper. Reserved for papers with a corresponding experiment record — never set this on faith.",
  revisit:
    "Read before and flagged to come back: something is unresolved, unclear, or worth re-reading with fresh context.",
};

const verificationDescriptions: Record<VerificationStatus, string> = {
  metadata_only:
    "Only bibliographic metadata (title, authors, abstract) is recorded. Nothing in your notes has been checked against any source.",
  secondary_summary_only:
    "Your notes come from secondary sources (guides, surveys, AI summaries). No claim has been checked against the primary paper — treat every specific number as unverified.",
  primary_opened:
    "You have opened the primary paper, but have not systematically checked the claims in your notes against it.",
  primary_claims_verified:
    "The key claims in your notes were checked against the primary paper itself. The strongest status — set it manually, never automatically.",
};

export const READING_STATUS_INFO: Record<
  ReadingStatus,
  StatusInfo<ReadingStatus>
> = Object.fromEntries(
  readingStatusValues.map((value) => [
    value,
    { value, label: READING_STATUS_LABELS[value], description: readingDescriptions[value] },
  ])
) as Record<ReadingStatus, StatusInfo<ReadingStatus>>;

export const VERIFICATION_STATUS_INFO: Record<
  VerificationStatus,
  StatusInfo<VerificationStatus>
> = Object.fromEntries(
  verificationStatusValues.map((value) => [
    value,
    {
      value,
      label: VERIFICATION_STATUS_LABELS[value],
      description: verificationDescriptions[value],
    },
  ])
) as Record<VerificationStatus, StatusInfo<VerificationStatus>>;

/** Ordered option lists for selects and filters. */
export const READING_STATUS_OPTIONS: StatusInfo<ReadingStatus>[] = readingStatusValues.map(
  (v) => READING_STATUS_INFO[v]
);
export const VERIFICATION_STATUS_OPTIONS: StatusInfo<VerificationStatus>[] =
  verificationStatusValues.map((v) => VERIFICATION_STATUS_INFO[v]);

/** Dormant feature — kept for existing records. */
export function experimentStatusLabel(status: ExperimentStatus): string {
  return EXPERIMENT_STATUS_LABELS[status];
}
