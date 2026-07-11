import { describe, expect, it } from "vitest";
import { excerptParts, searchResultHref } from "@/lib/search";

describe("excerptParts", () => {
  it("splits ts_headline output into bold and plain parts", () => {
    expect(excerptParts("uses a <b>memory</b> bank for <b>long</b> history")).toEqual([
      { text: "uses a ", bold: false },
      { text: "memory", bold: true },
      { text: " bank for ", bold: false },
      { text: "long", bold: true },
      { text: " history", bold: false },
    ]);
  });

  it("treats other markup as plain text (no HTML injection)", () => {
    const parts = excerptParts('<script>alert("x")</script> <b>match</b>');
    expect(parts[0].bold).toBe(false);
    expect(parts[0].text).toContain("<script>");
    expect(parts[1]).toEqual({ text: "match", bold: true });
  });

  it("handles excerpts without matches", () => {
    expect(excerptParts("plain text")).toEqual([{ text: "plain text", bold: false }]);
  });
});

describe("searchResultHref", () => {
  it("routes each result kind correctly", () => {
    expect(searchResultHref({ kind: "paper", slug: "longer", id: "1" })).toBe("/papers/longer");
    expect(searchResultHref({ kind: "paper_note", slug: "longer", id: "1" })).toBe(
      "/papers/longer"
    );
    expect(searchResultHref({ kind: "concept", slug: "memory-banks", id: "1" })).toBe(
      "/concepts/memory-banks"
    );
    expect(searchResultHref({ kind: "experiment", slug: "exp-1", id: "1" })).toBe(
      "/experiments/exp-1"
    );
    expect(searchResultHref({ kind: "misconception", slug: "x", id: "abc" })).toBe(
      "/misconceptions#abc"
    );
    expect(searchResultHref({ kind: "synthesis", slug: "x", id: "abc" })).toBe("/synthesis/abc");
  });
});
