import { describe, expect, it } from "vitest";
import { normaliseTitle } from "@/lib/radar/dedupe";
import { RUBRIC_WEIGHTS, explainRecommendation, scoreCandidate } from "@/lib/radar/scoring";
import type { NormalisedCandidate } from "@/lib/radar/types";

function candidate(title = "Test Paper"): NormalisedCandidate {
  return {
    title,
    normalisedTitle: normaliseTitle(title),
    provider: "test",
    topics: [],
  };
}

describe("scoreCandidate", () => {
  it("scores zero-signal candidates at 0", () => {
    const scored = scoreCandidate(candidate(), {});
    expect(scored.score).toBe(0);
  });

  it("scores a maximal candidate at (or near) 100 minus nothing", () => {
    const scored = scoreCandidate(candidate(), {
      personalRelevance: 5,
      domainRelevance: 5,
      hasProductionEvidence: true,
      hasOnlineAbEvidence: true,
      mechanismTransferability: 5,
      touchesProductionLevers: true,
      noveltyVsLibrary: 5,
      expectedPracticalValue: 5,
      readingCost: 0,
    });
    expect(scored.score).toBe(100);
  });

  it("penalises reading cost", () => {
    const base = { personalRelevance: 5, domainRelevance: 5 };
    const cheap = scoreCandidate(candidate(), { ...base, readingCost: 0 });
    const dear = scoreCandidate(candidate(), { ...base, readingCost: 5 });
    expect(dear.score).toBeLessThan(cheap.score);
  });

  it("weights online A/B evidence above production evidence alone", () => {
    const production = scoreCandidate(candidate(), { hasProductionEvidence: true });
    const online = scoreCandidate(candidate(), { hasOnlineAbEvidence: true });
    expect(online.score).toBeGreaterThan(production.score);
  });

  it("clamps out-of-range signals instead of exploding", () => {
    const scored = scoreCandidate(candidate(), {
      personalRelevance: 99,
      domainRelevance: -7,
    });
    expect(scored.score).toBeGreaterThanOrEqual(0);
    expect(scored.score).toBeLessThanOrEqual(100);
    expect(scored.scoreBreakdown.personalRelevance).toBeCloseTo(RUBRIC_WEIGHTS.personalRelevance);
    expect(scored.scoreBreakdown.domainRelevance).toBe(0);
  });

  it("returns an auditable breakdown that sums to the score", () => {
    const scored = scoreCandidate(candidate(), {
      personalRelevance: 4,
      hasOnlineAbEvidence: true,
      readingCost: 2,
    });
    const sum = Object.values(scored.scoreBreakdown).reduce((a, b) => a + b, 0);
    expect(Math.round(Math.max(0, Math.min(1, sum)) * 100)).toBe(scored.score);
  });
});

describe("explainRecommendation", () => {
  it("mentions the strongest signals without inventing claims", () => {
    const text = explainRecommendation(
      candidate("LONGER"),
      { personalRelevance: 5, hasOnlineAbEvidence: true, touchesProductionLevers: true },
      80
    );
    expect(text).toContain("LONGER");
    expect(text).toContain("online A/B");
    expect(text).toContain("production levers");
  });

  it("is honest when there is no signal", () => {
    const text = explainRecommendation(candidate(), {}, 0);
    expect(text).toContain("no strong relevance signals");
  });
});
