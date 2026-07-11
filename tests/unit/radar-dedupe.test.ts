import { describe, expect, it } from "vitest";
import {
  deduplicateCandidates,
  normaliseArxivId,
  normaliseDoi,
  normaliseTitle,
} from "@/lib/radar/dedupe";
import type { NormalisedCandidate } from "@/lib/radar/types";

function candidate(
  overrides: Partial<NormalisedCandidate> & { title: string }
): NormalisedCandidate {
  return {
    normalisedTitle: normaliseTitle(overrides.title),
    provider: "test",
    topics: [],
    ...overrides,
  };
}

describe("normaliseTitle", () => {
  it("ignores case, punctuation, and spacing", () => {
    expect(normaliseTitle("LONGER: Long-Sequence  Transformers!")).toBe(
      normaliseTitle("longer long sequence transformers")
    );
  });
});

describe("normaliseArxivId", () => {
  it("extracts the bare id from urls and versioned forms", () => {
    expect(normaliseArxivId("arXiv:2505.04421v2")).toBe("2505.04421");
    expect(normaliseArxivId("https://arxiv.org/abs/2505.04421")).toBe("2505.04421");
    expect(normaliseArxivId(null)).toBeNull();
  });
});

describe("normaliseDoi", () => {
  it("strips the resolver prefix and lowercases", () => {
    expect(normaliseDoi("https://doi.org/10.1145/3580305")).toBe("10.1145/3580305");
    expect(normaliseDoi("10.1145/3580305")).toBe("10.1145/3580305");
  });
});

describe("deduplicateCandidates", () => {
  it("drops candidates that match the existing library by arXiv id", () => {
    const result = deduplicateCandidates(
      [candidate({ title: "Some Fresh Title", arxivId: "2505.04421v3" })],
      [{ arxivId: "2505.04421", normalisedTitle: "longer" }]
    );
    expect(result).toHaveLength(0);
  });

  it("drops candidates that match by DOI", () => {
    const result = deduplicateCandidates(
      [candidate({ title: "Different Title", doi: "https://doi.org/10.1/X" })],
      [{ doi: "10.1/x", normalisedTitle: "other" }]
    );
    expect(result).toHaveLength(0);
  });

  it("drops candidates that match by normalised title", () => {
    const result = deduplicateCandidates(
      [candidate({ title: "LONGER: Long Sequence Transformers" })],
      [{ normalisedTitle: normaliseTitle("longer long sequence transformers") }]
    );
    expect(result).toHaveLength(0);
  });

  it("dedupes within the batch itself, keeping the first occurrence", () => {
    const a = candidate({ title: "Paper A", arxivId: "2501.00001" });
    const b = candidate({ title: "Paper A (v2)", arxivId: "2501.00001" });
    const c = candidate({ title: "Paper C" });
    const result = deduplicateCandidates([a, b, c], []);
    expect(result.map((r) => r.title)).toEqual(["Paper A", "Paper C"]);
  });

  it("keeps genuinely new candidates", () => {
    const result = deduplicateCandidates(
      [candidate({ title: "Entirely New Work", arxivId: "2606.99999" })],
      [{ arxivId: "2505.04421", normalisedTitle: "longer" }]
    );
    expect(result).toHaveLength(1);
  });
});
