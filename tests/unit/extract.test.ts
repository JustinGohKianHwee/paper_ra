import { describe, expect, it } from "vitest";
import { chunkPages, totalChars } from "@/lib/ai/extract";

describe("chunkPages", () => {
  it("returns nothing for no pages", () => {
    expect(chunkPages([])).toEqual([]);
  });

  it("keeps a short document in one chunk with correct page range", () => {
    const chunks = chunkPages(["page one text", "page two text"], 1000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].pageStart).toBe(1);
    expect(chunks[0].pageEnd).toBe(2);
    expect(chunks[0].text).toContain("[page 1]");
    expect(chunks[0].text).toContain("[page 2]");
  });

  it("splits on the character budget without splitting pages", () => {
    const pages = ["a".repeat(600), "b".repeat(600), "c".repeat(600)];
    const chunks = chunkPages(pages, 1000);
    expect(chunks).toHaveLength(3);
    expect(chunks.map((c) => [c.pageStart, c.pageEnd])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
    expect(chunks[1].text).toContain("[page 2]");
  });

  it("groups pages while they fit", () => {
    const pages = ["a".repeat(400), "b".repeat(400), "c".repeat(400)];
    const chunks = chunkPages(pages, 1000);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].pageEnd).toBe(2);
    expect(chunks[1].pageStart).toBe(3);
  });

  it("truncates a single oversized page instead of failing", () => {
    const chunks = chunkPages(["x".repeat(5000)], 1000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text.length).toBeLessThan(1100);
  });

  it("assigns sequential indices", () => {
    const chunks = chunkPages(["a".repeat(600), "b".repeat(600)], 700);
    expect(chunks.map((c) => c.index)).toEqual([0, 1]);
  });
});

describe("totalChars", () => {
  it("sums page lengths", () => {
    expect(totalChars(["abc", "de"])).toBe(5);
  });
});
