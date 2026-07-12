import { tokenize } from "@/lib/ai/qa-retrieval";
import { normaliseTitle } from "@/lib/radar/dedupe";

/**
 * Library-inferred interest model for Radar v1. Pure functions, unit-tested.
 *
 * There is deliberately no stored "interest profile": every refresh derives
 * one from what the library already records — papers weighted by reading
 * depth and recency, topics, concepts, recent annotations, and past Radar
 * accept/dismiss decisions. Scoring is deterministic and cheap; the LLM is
 * only used later to explain a handful of top candidates.
 */

export interface WeightedText {
  text: string;
  weight: number;
}

export interface InterestProfile {
  termWeights: Map<string, number>;
  maxWeight: number;
}

/** Depth factor: how strongly a paper's terms represent your interests. */
export function paperSignalWeight(options: {
  readingStatus: string;
  relevance: number;
  updatedAt: string;
  now?: number;
}): number {
  const depth =
    options.readingStatus === "deep_read" || options.readingStatus === "implemented"
      ? 3
      : options.readingStatus === "to_read" || options.readingStatus === "queued"
        ? 1
        : 2;
  const relevanceBoost = 1 + options.relevance / 10; // 0–5 → ×1.0–1.5
  const ageDays =
    ((options.now ?? Date.parse("2100-01-01")) - Date.parse(options.updatedAt)) / 86_400_000;
  const recency = ageDays >= 0 && ageDays <= 30 ? 1.5 : 1;
  return depth * relevanceBoost * recency;
}

export function buildInterestProfile(
  positives: WeightedText[],
  penalties: WeightedText[] = []
): InterestProfile {
  const termWeights = new Map<string, number>();
  for (const doc of positives) {
    // Unique terms per doc so one repetitive abstract doesn't dominate.
    for (const term of new Set(tokenize(doc.text))) {
      termWeights.set(term, (termWeights.get(term) ?? 0) + doc.weight);
    }
  }
  for (const doc of penalties) {
    for (const term of new Set(tokenize(doc.text))) {
      termWeights.set(term, (termWeights.get(term) ?? 0) - doc.weight);
    }
  }
  let maxWeight = 0;
  for (const w of termWeights.values()) maxWeight = Math.max(maxWeight, w);
  return { termWeights, maxWeight };
}

export interface ProfileScore {
  /** 0–100. */
  score: number;
  matchedTerms: string[];
  breakdown: Record<string, number>;
}

/**
 * Deterministic relevance of one candidate against the profile: normalised
 * term-overlap plus a small recency bonus. Nothing here calls a model.
 */
export function scoreCandidateAgainstProfile(
  candidate: { title: string; abstract?: string | null; publishedOn?: string | null },
  profile: InterestProfile,
  now: number
): ProfileScore {
  const terms = new Set(tokenize(`${candidate.title} ${candidate.abstract ?? ""}`));
  const matched: { term: string; weight: number }[] = [];
  let overlap = 0;
  for (const term of terms) {
    const weight = profile.termWeights.get(term) ?? 0;
    if (weight > 0) {
      overlap += weight;
      matched.push({ term, weight });
    } else if (weight < 0) {
      overlap += weight; // dismissed-signal penalty
    }
  }

  // Normalise: perfect score would need many strong-term matches.
  const scale = Math.max(profile.maxWeight, 1) * 8;
  const overlapScore = Math.max(0, Math.min(1, overlap / scale));

  let recencyBonus = 0;
  if (candidate.publishedOn) {
    const ageDays = (now - Date.parse(candidate.publishedOn)) / 86_400_000;
    if (Number.isFinite(ageDays) && ageDays >= 0) {
      recencyBonus = Math.max(0, 0.15 * (1 - ageDays / 180));
    }
  }

  const total = Math.min(1, overlapScore * 0.9 + recencyBonus);
  return {
    score: Math.round(total * 100),
    matchedTerms: matched
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8)
      .map((m) => m.term),
    breakdown: {
      termOverlap: Math.round(overlapScore * 90),
      recency: Math.round(recencyBonus * 100),
    },
  };
}

/** Token-set Jaccard similarity between two normalised titles. */
export function titleSimilarity(a: string, b: string): number {
  const ta = new Set(normaliseTitle(a).split(" ").filter(Boolean));
  const tb = new Set(normaliseTitle(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

/**
 * Keeps the queue varied: walking candidates best-first, drops any whose
 * title is nearly identical to an already-kept candidate.
 */
export function diversityFilter<T extends { title: string; score: number }>(
  candidates: T[],
  maxSimilarity = 0.6
): T[] {
  const kept: T[] = [];
  for (const candidate of [...candidates].sort((a, b) => b.score - a.score)) {
    if (kept.some((k) => titleSimilarity(k.title, candidate.title) >= maxSimilarity)) continue;
    kept.push(candidate);
  }
  return kept;
}

/** Library papers most lexically related to a candidate (for "why"). */
export function relatedLibraryPapers(
  candidate: { title: string; abstract?: string | null },
  library: { title: string; slug: string }[],
  max = 2
): { title: string; slug: string }[] {
  const candidateTerms = new Set(tokenize(`${candidate.title} ${candidate.abstract ?? ""}`));
  return library
    .map((paper) => {
      let overlap = 0;
      for (const term of new Set(tokenize(paper.title))) {
        if (candidateTerms.has(term)) overlap++;
      }
      return { paper, overlap };
    })
    .filter((r) => r.overlap >= 2)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, max)
    .map((r) => r.paper);
}
