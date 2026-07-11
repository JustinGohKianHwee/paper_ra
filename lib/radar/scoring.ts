import type { CandidateSignals, NormalisedCandidate, ScoredCandidate } from "@/lib/radar/types";

/**
 * Relevance rubric (docs/research-radar-roadmap.md). Deterministic and
 * unit-tested; a future radar UI shows the breakdown so scores are auditable.
 *
 * Weights sum to 1.0 for the positive signals; reading cost is a penalty.
 * Output is clamped to [0, 100].
 */
export const RUBRIC_WEIGHTS = {
  personalRelevance: 0.2,
  domainRelevance: 0.15,
  productionEvidence: 0.12,
  onlineAbEvidence: 0.13,
  mechanismTransferability: 0.15,
  productionLevers: 0.1,
  noveltyVsLibrary: 0.05,
  expectedPracticalValue: 0.1,
} as const;

export const READING_COST_PENALTY = 0.08;

const clamp05 = (n: number | undefined) => Math.max(0, Math.min(5, n ?? 0));

export function scoreCandidate(
  candidate: NormalisedCandidate,
  signals: CandidateSignals
): ScoredCandidate {
  const parts: Record<string, number> = {
    personalRelevance: (clamp05(signals.personalRelevance) / 5) * RUBRIC_WEIGHTS.personalRelevance,
    domainRelevance: (clamp05(signals.domainRelevance) / 5) * RUBRIC_WEIGHTS.domainRelevance,
    productionEvidence: signals.hasProductionEvidence ? RUBRIC_WEIGHTS.productionEvidence : 0,
    onlineAbEvidence: signals.hasOnlineAbEvidence ? RUBRIC_WEIGHTS.onlineAbEvidence : 0,
    mechanismTransferability:
      (clamp05(signals.mechanismTransferability) / 5) * RUBRIC_WEIGHTS.mechanismTransferability,
    productionLevers: signals.touchesProductionLevers ? RUBRIC_WEIGHTS.productionLevers : 0,
    noveltyVsLibrary: (clamp05(signals.noveltyVsLibrary) / 5) * RUBRIC_WEIGHTS.noveltyVsLibrary,
    expectedPracticalValue:
      (clamp05(signals.expectedPracticalValue) / 5) * RUBRIC_WEIGHTS.expectedPracticalValue,
    readingCostPenalty: -(clamp05(signals.readingCost) / 5) * READING_COST_PENALTY,
  };

  const raw = Object.values(parts).reduce((a, b) => a + b, 0);
  const score = Math.round(Math.max(0, Math.min(1, raw)) * 100);

  return {
    ...candidate,
    score,
    scoreBreakdown: parts,
    whyItMatters: explainRecommendation(candidate, signals, score),
  };
}

/** Human-readable one-liner for the review queue. Never fabricates claims. */
export function explainRecommendation(
  candidate: NormalisedCandidate,
  signals: CandidateSignals,
  score: number
): string {
  const reasons: string[] = [];
  if (clamp05(signals.personalRelevance) >= 4)
    reasons.push("directly relevant to your focus areas");
  else if (clamp05(signals.domainRelevance) >= 4) reasons.push("strong domain relevance");
  if (signals.hasOnlineAbEvidence) reasons.push("reports online A/B evidence");
  else if (signals.hasProductionEvidence) reasons.push("reports production deployment");
  if (clamp05(signals.mechanismTransferability) >= 4) reasons.push("transferable mechanism");
  if (signals.touchesProductionLevers) reasons.push("touches production levers");
  if (clamp05(signals.readingCost) >= 4) reasons.push("high reading cost");

  const summary = reasons.length > 0 ? reasons.join("; ") : "no strong relevance signals detected";
  return `${candidate.title} (score ${score}/100): ${summary}.`;
}
