/**
 * Canonical structured-note template for a paper. The order here is the
 * display order on the paper page; `section_type` values must match the
 * `paper_section_type` Postgres enum.
 */

export type PaperSectionType =
  | "summary"
  | "thesis"
  | "problem"
  | "insufficiency"
  | "architecture"
  | "mechanism"
  | "equations"
  | "intuition"
  | "why_it_works"
  | "training_setup"
  | "evaluation"
  | "results"
  | "production_evidence"
  | "serving"
  | "failure_modes"
  | "segment_risks"
  | "tiktok_relevance"
  | "implementation_mapping"
  | "experiment_proposal"
  | "misconceptions"
  | "open_questions"
  | "related_papers"
  | "boss_explanation"
  | "sources_to_verify";

export interface PaperSectionDef {
  type: PaperSectionType;
  heading: string;
  hint: string;
  /** Markdown scaffold inserted when a new paper is created. */
  scaffold?: string;
}

export const PAPER_SECTIONS: readonly PaperSectionDef[] = [
  {
    type: "summary",
    heading: "Paper summary",
    hint: "A few sentences: what the paper does and why it matters.",
  },
  {
    type: "thesis",
    heading: "One-sentence thesis",
    hint: "The single sentence you would say if you had five seconds.",
  },
  {
    type: "problem",
    heading: "Problem being solved",
    hint: "What breaks or underperforms without this work?",
  },
  {
    type: "insufficiency",
    heading: "Why existing approaches are insufficient",
    hint: "What did prior methods get wrong or fail to scale to?",
  },
  {
    type: "architecture",
    heading: "Core architecture",
    hint: "Components and how data flows through them.",
  },
  {
    type: "mechanism",
    heading: "Core mechanism",
    hint: "The specific trick that does the work — not the whole system.",
  },
  {
    type: "equations",
    heading: "Important equations",
    hint: "Key equations in KaTeX ($$ … $$) with variable definitions.",
  },
  {
    type: "intuition",
    heading: "Intuition",
    hint: "Explain it to yourself without maths.",
  },
  {
    type: "why_it_works",
    heading: "Why it should work",
    hint: "The causal story: which property of the data/problem does it exploit?",
  },
  {
    type: "training_setup",
    heading: "Training data and objective",
    hint: "Data, losses, labels, sampling; anything unusual about training.",
  },
  {
    type: "evaluation",
    heading: "Evaluation setup",
    hint: "Datasets, baselines, metrics, and protocol.",
  },
  {
    type: "results",
    heading: "Main results",
    hint: "Reported numbers. Flag anything not verified against the primary paper.",
  },
  {
    type: "production_evidence",
    heading: "Production evidence",
    hint: "Deployment scale, A/B results, online metrics — or explicitly none.",
  },
  {
    type: "serving",
    heading: "Latency, memory, and serving considerations",
    hint: "What it costs to run: latency, memory, throughput, GPU cost.",
  },
  {
    type: "failure_modes",
    heading: "Failure modes",
    hint: "Where the method breaks, per the paper or your own analysis.",
  },
  {
    type: "segment_risks",
    heading: "Segment-specific risks",
    hint: "Sparse users, new items, fast-changing sessions — who could regress?",
  },
  {
    type: "tiktok_relevance",
    heading: "TikTok Shop relevance",
    hint: "Public-information reasoning only. No internal metrics or systems.",
  },
  {
    type: "implementation_mapping",
    heading: "Implementation mapping",
    hint: "Which of your (personal) repos/modules this maps to.",
  },
  {
    type: "experiment_proposal",
    heading: "Experiment proposal",
    hint: "A concrete toy experiment you could run.",
    scaffold:
      "## Hypothesis\n\n## Baseline\n\n## Treatment\n\n## Metrics\n\n## Ablations\n\n## Failure cases to inspect\n",
  },
  {
    type: "misconceptions",
    heading: "Misconceptions and corrections",
    hint: "What you initially got wrong and how you corrected it. Also record big ones as first-class Misconception entries.",
  },
  {
    type: "open_questions",
    heading: "Open questions",
    hint: "What you still do not understand. The dashboard surfaces these.",
  },
  {
    type: "related_papers",
    heading: "Related papers",
    hint: "How this relates to other papers; also add structured relations.",
  },
  {
    type: "boss_explanation",
    heading: "Boss-facing explanation",
    hint: "Two or three plain sentences you could say in a hallway.",
  },
  {
    type: "sources_to_verify",
    heading: "Sources requiring verification",
    hint: "Claims taken from secondary sources that still need the primary paper.",
  },
] as const;

export const SECTION_BY_TYPE: ReadonlyMap<PaperSectionType, PaperSectionDef> = new Map(
  PAPER_SECTIONS.map((s) => [s.type, s])
);

export function sectionHeading(type: PaperSectionType): string {
  return SECTION_BY_TYPE.get(type)?.heading ?? type.replace(/_/g, " ");
}

/** Rows to insert when a paper is created manually. */
export function newPaperSectionRows(): {
  section_type: PaperSectionType;
  body_md: string;
  position: number;
}[] {
  return PAPER_SECTIONS.map((s, i) => ({
    section_type: s.type,
    body_md: s.scaffold ?? "",
    position: i,
  }));
}

export function sectionPosition(type: PaperSectionType): number {
  const i = PAPER_SECTIONS.findIndex((s) => s.type === type);
  return i === -1 ? PAPER_SECTIONS.length : i;
}
