/**
 * Seed misconception-correction records. These are the user's own examples
 * (stated in the project brief) — seeded as worked examples of the format.
 */
export interface MisconceptionSeed {
  initial_belief_md: string;
  why_i_believed_md?: string;
  corrected_understanding_md: string;
  evidence_md?: string;
  paper_slug?: string;
  concept_slug?: string;
  confidence: number;
  can_explain_without_notes: boolean;
}

export const MISCONCEPTION_SEEDS: MisconceptionSeed[] = [
  {
    initial_belief_md: "I initially thought LMN and LONGER were interchangeable.",
    why_i_believed_md:
      "Both are ByteDance papers about making long user history usable, and both talk about compressing behaviour.",
    corrected_understanding_md:
      "LONGER mainly changes how long histories are compressed and processed *inside* the model (token merging, hybrid attention, global tokens), while LMN introduces a more persistent or external memory mechanism that outlives the input window.",
    evidence_md:
      "Deep study guide, ch. 9 'How it differs from LONGER' (p. 19): LONGER focuses on long-sequence modelling inside a transformer-like architecture; LMN emphasises external/compressed memory scaled for e-commerce search.",
    paper_slug: "large-memory-network",
    concept_slug: "memory-banks",
    confidence: 4,
    can_explain_without_notes: true,
  },
  {
    initial_belief_md: "I initially thought a summary token was just another normal event token.",
    why_i_believed_md:
      "It enters the same transformer pipeline as event tokens, so it looked like one more token in the sequence.",
    corrected_understanding_md:
      "It has the same embedding dimensionality so it can enter the same transformer pipeline, but its semantic role and construction are different: it acts as a shared summary/anchor channel for long-range attention rather than representing an observed event.",
    evidence_md:
      "Deep study guide, ch. 6 (LONGER global token mechanism, p. 13) and ch. 18 glossary 'Global tokens' (p. 34).",
    paper_slug: "longer",
    concept_slug: "global-summary-tokens",
    confidence: 4,
    can_explain_without_notes: true,
  },
  {
    initial_belief_md:
      "I assumed a paper's reported average gain means the method helps across the board.",
    why_i_believed_md:
      "Headline metrics (average AUC/uAUC lift) are what papers lead with, and it is easy to read them as uniform improvements.",
    corrected_understanding_md:
      "A reported average gain may hide regressions for sparse users, new items, or rapidly changing sessions. Segment-level evaluation (by history length, item age, session dynamics) is required before believing a method transfers.",
    evidence_md:
      "Deep study guide ch. 16 debugging table (p. 32): 'average metrics hide segment-specific behaviour' (LONGER/LEMUR/LMN row); LONGER caveats on heavy-vs-sparse users (p. 13).",
    concept_slug: "data-mixture-design",
    confidence: 5,
    can_explain_without_notes: true,
  },
];
