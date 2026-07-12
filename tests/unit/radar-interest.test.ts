import { describe, expect, it } from "vitest";
import {
  buildInterestProfile,
  diversityFilter,
  paperSignalWeight,
  relatedLibraryPapers,
  scoreCandidateAgainstProfile,
  titleSimilarity,
} from "@/lib/radar/interest";

const NOW = Date.parse("2026-07-12T00:00:00Z");

describe("paperSignalWeight", () => {
  it("weights deep reads above surface reads above unread", () => {
    const base = { relevance: 0, updatedAt: "2026-01-01T00:00:00Z", now: NOW };
    const deep = paperSignalWeight({ ...base, readingStatus: "deep_read" });
    const surface = paperSignalWeight({ ...base, readingStatus: "studied_through_guide" });
    const unread = paperSignalWeight({ ...base, readingStatus: "to_read" });
    expect(deep).toBeGreaterThan(surface);
    expect(surface).toBeGreaterThan(unread);
  });

  it("boosts recently-touched and personally-relevant papers", () => {
    const old = paperSignalWeight({
      readingStatus: "deep_read",
      relevance: 0,
      updatedAt: "2026-01-01T00:00:00Z",
      now: NOW,
    });
    const recent = paperSignalWeight({
      readingStatus: "deep_read",
      relevance: 5,
      updatedAt: "2026-07-10T00:00:00Z",
      now: NOW,
    });
    expect(recent).toBeGreaterThan(old);
  });
});

describe("interest profile scoring", () => {
  const profile = buildInterestProfile(
    [
      { text: "sequential recommendation with transformers", weight: 3 },
      { text: "user behaviour modelling transformers", weight: 2 },
    ],
    [{ text: "protein folding", weight: 1.5 }]
  );

  it("scores an on-profile candidate above an off-profile one", () => {
    const onProfile = scoreCandidateAgainstProfile(
      {
        title: "Transformers for sequential recommendation",
        abstract: "We model user behaviour with transformers.",
        publishedOn: "2026-07-01",
      },
      profile,
      NOW
    );
    const offProfile = scoreCandidateAgainstProfile(
      {
        title: "Deep learning for protein folding",
        abstract: "A study of protein structures.",
        publishedOn: "2026-07-01",
      },
      profile,
      NOW
    );
    expect(onProfile.score).toBeGreaterThan(offProfile.score);
    expect(onProfile.matchedTerms).toContain("transformers");
  });

  it("penalises terms from dismissed candidates", () => {
    const neutralProfile = buildInterestProfile([
      { text: "sequential recommendation transformers", weight: 3 },
    ]);
    const withPenalty = buildInterestProfile(
      [{ text: "sequential recommendation transformers", weight: 3 }],
      [{ text: "sequential recommendation surveys", weight: 2 }]
    );
    const candidate = {
      title: "A survey of sequential recommendation surveys",
      abstract: "surveys of surveys",
      publishedOn: "2026-07-01",
    };
    const neutral = scoreCandidateAgainstProfile(candidate, neutralProfile, NOW);
    const penalised = scoreCandidateAgainstProfile(candidate, withPenalty, NOW);
    expect(penalised.score).toBeLessThan(neutral.score);
  });

  it("gives newer papers a recency edge, all else equal", () => {
    const candidate = { title: "transformers recommendation", abstract: "" };
    const fresh = scoreCandidateAgainstProfile(
      { ...candidate, publishedOn: "2026-07-10" },
      profile,
      NOW
    );
    const stale = scoreCandidateAgainstProfile(
      { ...candidate, publishedOn: "2024-01-01" },
      profile,
      NOW
    );
    expect(fresh.score).toBeGreaterThanOrEqual(stale.score);
    expect(fresh.breakdown.recency).toBeGreaterThan(stale.breakdown.recency);
  });
});

describe("titleSimilarity + diversityFilter", () => {
  it("detects near-identical titles", () => {
    expect(
      titleSimilarity(
        "Mock Advances in Attention at Scale",
        "Mock Advances in Attention at Scale v2 Duplicate"
      )
    ).toBeGreaterThan(0.6);
    expect(titleSimilarity("Attention is all you need", "Graph neural networks")).toBeLessThan(0.2);
  });

  it("drops the lower-scoring near-duplicate and keeps distinct candidates", () => {
    const filtered = diversityFilter([
      { title: "Mock Advances in Attention at Scale", score: 80 },
      { title: "Mock Advances in Attention at Scale v2 Duplicate", score: 70 },
      { title: "A completely different graph paper", score: 50 },
    ]);
    expect(filtered.map((c) => c.score)).toEqual([80, 50]);
  });
});

describe("relatedLibraryPapers", () => {
  it("finds library papers sharing at least two content terms", () => {
    const related = relatedLibraryPapers(
      { title: "Scaling sequential recommendation transformers", abstract: "" },
      [
        { title: "Sequential recommendation with self-attention", slug: "sasrec" },
        { title: "Protein folding at scale", slug: "fold" },
      ]
    );
    expect(related.map((p) => p.slug)).toEqual(["sasrec"]);
  });
});
