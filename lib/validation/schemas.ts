import { z } from "zod";
import {
  experimentStatusSchema,
  readingStatusSchema,
  relationKindSchema,
  synthesisKindSchema,
  verificationStatusSchema,
  visibilitySchema,
} from "@/lib/validation/enums";

const trimmed = z.string().trim();
const optionalText = trimmed.max(20000).optional().nullable();
const rating = z.coerce.number().int().min(0).max(5);

export const paperCreateSchema = z.object({
  title: trimmed.min(1, "Title is required").max(300),
  subtitle: trimmed.max(300).optional().nullable(),
  authors: z.array(trimmed.min(1).max(200)).default([]),
  organisation: trimmed.max(200).optional().nullable(),
  year: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  venue: trimmed.max(200).optional().nullable(),
  arxiv_id: trimmed.max(50).optional().nullable(),
  doi: trimmed.max(100).optional().nullable(),
  canonical_url: trimmed
    .url()
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  pdf_url: trimmed
    .url()
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  abstract: optionalText,
  reading_status: readingStatusSchema.default("to_read"),
  verification_status: verificationStatusSchema.default("metadata_only"),
  priority: z.coerce.number().int().min(1).max(5).default(3),
  visibility: visibilitySchema.default("private"),
  relevance: rating.default(0),
  relevance_note: optionalText,
  production_relevance: rating.default(0),
  production_evidence: optionalText,
  needs_revisit: z.coerce.boolean().default(false),
  note_source: trimmed.max(500).optional().nullable(),
  topic_ids: z.array(z.string().uuid()).default([]),
  concept_ids: z.array(z.string().uuid()).default([]),
});
export type PaperCreateInput = z.infer<typeof paperCreateSchema>;

export const paperUpdateSchema = paperCreateSchema
  .omit({ topic_ids: true, concept_ids: true })
  .partial()
  .extend({
    id: z.string().uuid(),
    primary_source_verified: z.coerce.boolean().optional(),
    last_read_at: z.string().datetime({ offset: true }).optional().nullable(),
  });
export type PaperUpdateInput = z.infer<typeof paperUpdateSchema>;

export const noteSectionUpsertSchema = z.object({
  paper_id: z.string().uuid(),
  section_type: z.string().min(1),
  body_md: z.string().max(100000),
});
export type NoteSectionUpsertInput = z.infer<typeof noteSectionUpsertSchema>;

export const topicUpdateSchema = z.object({
  id: z.string().uuid(),
  overview_md: optionalText,
  synthesis_md: optionalText,
  knowledge_gaps_md: optionalText,
});

export const conceptCreateSchema = z.object({
  name: trimmed.min(1).max(200),
  plain_definition_md: optionalText,
  technical_definition_md: optionalText,
  equation_md: optionalText,
  why_it_helps_md: optionalText,
  failure_modes_md: optionalText,
  my_implementations_md: optionalText,
  misconceptions_md: optionalText,
});
export type ConceptCreateInput = z.infer<typeof conceptCreateSchema>;

export const conceptUpdateSchema = conceptCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const experimentCreateSchema = z.object({
  title: trimmed.min(1).max(300),
  repo_name: trimmed.max(200).optional().nullable(),
  branch_ref: trimmed.max(200).optional().nullable(),
  research_question: optionalText,
  hypothesis: optionalText,
  baseline: optionalText,
  treatment: optionalText,
  dataset: optionalText,
  parameters_md: optionalText,
  metrics_md: optionalText,
  results_md: optionalText,
  segment_results_md: optionalText,
  latency_memory_md: optionalText,
  interpretation_md: optionalText,
  failure_cases_md: optionalText,
  next_experiment_md: optionalText,
  metrics_json: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v, ctx) => {
      if (!v) return null;
      try {
        return JSON.parse(v) as unknown;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Metrics must be valid JSON" });
        return z.NEVER;
      }
    }),
  status: experimentStatusSchema.default("proposed"),
  happened_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .nullable(),
  paper_ids: z.array(z.string().uuid()).default([]),
  concept_ids: z.array(z.string().uuid()).default([]),
});
export type ExperimentCreateInput = z.infer<typeof experimentCreateSchema>;

export const experimentUpdateSchema = experimentCreateSchema
  .omit({ paper_ids: true, concept_ids: true })
  .partial()
  .extend({ id: z.string().uuid() });

export const misconceptionCreateSchema = z.object({
  initial_belief_md: trimmed.min(1, "Initial belief is required").max(20000),
  why_i_believed_md: optionalText,
  corrected_understanding_md: trimmed.min(1, "Correction is required").max(20000),
  evidence_md: optionalText,
  paper_id: z.string().uuid().optional().nullable(),
  concept_id: z.string().uuid().optional().nullable(),
  corrected_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
  confidence: z.coerce.number().int().min(1).max(5).default(3),
  can_explain_without_notes: z.coerce.boolean().default(false),
});
export type MisconceptionCreateInput = z.infer<typeof misconceptionCreateSchema>;

export const misconceptionUpdateSchema = misconceptionCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const synthesisCreateSchema = z.object({
  kind: synthesisKindSchema,
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  title: trimmed.min(1).max(300),
  body_md: z.string().max(200000).default(""),
});
export type SynthesisCreateInput = z.infer<typeof synthesisCreateSchema>;

export const synthesisUpdateSchema = z.object({
  id: z.string().uuid(),
  title: trimmed.min(1).max(300).optional(),
  body_md: z.string().max(200000).optional(),
});

export const paperRelationCreateSchema = z.object({
  from_paper_id: z.string().uuid(),
  to_paper_id: z.string().uuid(),
  relation_kind: relationKindSchema.default("builds_on"),
  note: trimmed.max(1000).optional().nullable(),
});

export const readingSessionCreateSchema = z.object({
  paper_id: z.string().uuid(),
  occurred_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  minutes: z.coerce
    .number()
    .int()
    .positive()
    .max(24 * 60)
    .optional()
    .nullable(),
  note: trimmed.max(2000).optional().nullable(),
});

export const sourceCreateSchema = z.object({
  paper_id: z.string().uuid(),
  source_name: trimmed.min(1).max(300),
  locator: trimmed.max(200).optional().nullable(),
  url: trimmed
    .url()
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  quote_or_claim: optionalText,
  needs_verification: z.coerce.boolean().default(false),
});
