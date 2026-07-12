import { describe, expect, it } from "vitest";
import { scorePages, selectContext, tokenize } from "@/lib/ai/qa-retrieval";

const pages = [
  { pageNo: 1, content: "Introduction. We study recommendation systems and user modelling." },
  {
    pageNo: 2,
    content:
      "Method: multi-head attention over user history. The attention mechanism uses queries, keys, and values. Attention attention attention attention attention attention.",
  },
  { pageNo: 3, content: "Experiments on public datasets. Ablations of the attention heads." },
  { pageNo: 4, content: "Related work and references." },
];

describe("tokenize", () => {
  it("lowercases, splits, and removes stop words and short tokens", () => {
    expect(tokenize("How does the Attention mechanism work?")).toEqual([
      "attention",
      "mechanism",
      "work",
    ]);
  });
});

describe("scorePages", () => {
  it("ranks the page with the queried mechanism highest", () => {
    const scored = scorePages(pages, "how does the attention mechanism work?");
    const best = [...scored].sort((a, b) => b.score - a.score)[0];
    expect(best.pageNo).toBe(2);
  });

  it("caps repeated terms so one spammy page cannot dominate rare-term matches", () => {
    const scored = scorePages(pages, "attention ablations");
    const p2 = scored.find((p) => p.pageNo === 2)!;
    const p3 = scored.find((p) => p.pageNo === 3)!;
    // Page 2 repeats "attention" many times but occurrences are capped at 5;
    // page 3 matches both terms including the rarer "ablations".
    expect(p3.score).toBeGreaterThan(0);
    expect(p2.score).toBeLessThan(p3.score + 6);
  });

  it("gives zero to pages with no term overlap", () => {
    const scored = scorePages(pages, "quantum chromodynamics");
    expect(scored.every((p) => p.score === 0)).toBe(true);
  });
});

describe("selectContext", () => {
  it("returns matching pages in document order", () => {
    const context = selectContext(pages, "attention ablations experiments");
    expect(context.map((p) => p.pageNo)).toEqual(
      [...context.map((p) => p.pageNo)].sort((a, b) => a - b)
    );
    expect(context.some((p) => p.pageNo === 2)).toBe(true);
    expect(context.some((p) => p.pageNo === 3)).toBe(true);
  });

  it("never includes non-matching pages even under budget", () => {
    const context = selectContext(pages, "attention");
    expect(context.some((p) => p.pageNo === 4)).toBe(false);
  });

  it("respects the page cap and the character budget", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      pageNo: i + 1,
      content: `attention page ${i + 1} ` + "x".repeat(5000),
    }));
    const context = selectContext(many, "attention", { maxChars: 12000, maxPages: 6 });
    expect(context.length).toBeLessThanOrEqual(6);
    expect(context.reduce((a, p) => a + p.content.length, 0)).toBeLessThanOrEqual(12000);
  });

  it("returns empty for a question with no overlap", () => {
    expect(selectContext(pages, "zzz unrelated")).toEqual([]);
  });
});
