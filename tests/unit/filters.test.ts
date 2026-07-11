import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  facetValues,
  filterPapers,
  parsePaperFilters,
  sortPapers,
  type PaperLibraryItem,
} from "@/lib/papers/filters";

let counter = 0;
function paper(overrides: Partial<PaperLibraryItem>): PaperLibraryItem {
  counter++;
  return {
    id: `id-${counter}`,
    user_id: "u",
    title: `Paper ${counter}`,
    slug: `paper-${counter}`,
    subtitle: null,
    authors: [],
    organisation: null,
    year: null,
    venue: null,
    arxiv_id: null,
    doi: null,
    canonical_url: null,
    pdf_url: null,
    abstract: null,
    reading_status: "to_read",
    verification_status: "metadata_only",
    priority: 3,
    visibility: "private",
    relevance: 0,
    relevance_note: null,
    source_input: null,
    processing_status: "none",
    processing_error: null,
    processed_at: null,
    production_relevance: 0,
    production_evidence: null,
    primary_source_verified: false,
    needs_revisit: false,
    note_source: null,
    last_read_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    fts: null,
    topics: [],
    has_open_questions: false,
    experiment_count: 0,
    ...overrides,
  };
}

describe("parsePaperFilters", () => {
  it("returns defaults for empty params", () => {
    expect(parsePaperFilters({})).toEqual(DEFAULT_FILTERS);
  });

  it("parses statuses, ratings, and flags", () => {
    const filters = parsePaperFilters({
      q: " longer ",
      topic: "long-user-history",
      reading: "queued,deep_read",
      verification: "secondary_summary_only",
      min_priority: "4",
      production: "1",
      implemented: "no",
      open_questions: "1",
      sort: "year",
      view: "compact",
    });
    expect(filters.q).toBe("longer");
    expect(filters.topic).toBe("long-user-history");
    expect(filters.reading).toEqual(["queued", "deep_read"]);
    expect(filters.verification).toEqual(["secondary_summary_only"]);
    expect(filters.minPriority).toBe(4);
    expect(filters.hasProductionEvidence).toBe(true);
    expect(filters.implemented).toBe("no");
    expect(filters.hasOpenQuestions).toBe(true);
    expect(filters.sort).toBe("year");
    expect(filters.view).toBe("compact");
  });

  it("ignores invalid enum values and garbage numbers", () => {
    const filters = parsePaperFilters({
      reading: "not_a_status",
      sort: "bogus",
      year: "abc",
      min_priority: "",
    });
    expect(filters.reading).toEqual([]);
    expect(filters.sort).toBe(DEFAULT_FILTERS.sort);
    expect(filters.year).toBeNull();
    expect(filters.minPriority).toBeNull();
  });
});

describe("filterPapers", () => {
  const longerPaper = paper({
    title: "LONGER",
    organisation: "ByteDance",
    year: 2025,
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 5,
    relevance: 5,
    production_evidence: "Deployed in 10+ scenarios",
    topics: [{ name: "Long User History", slug: "long-user-history" }],
    has_open_questions: true,
  });
  const dpoPaper = paper({
    title: "Direct Preference Optimization",
    organisation: "Stanford",
    year: 2023,
    reading_status: "implemented",
    priority: 3,
    experiment_count: 2,
  });
  const library = [longerPaper, dpoPaper];

  it("matches free text against title, org, and topics", () => {
    expect(filterPapers(library, { ...DEFAULT_FILTERS, q: "bytedance" })).toEqual([longerPaper]);
    expect(filterPapers(library, { ...DEFAULT_FILTERS, q: "user history" })).toEqual([longerPaper]);
    expect(filterPapers(library, { ...DEFAULT_FILTERS, q: "zzz" })).toEqual([]);
  });

  it("filters by topic slug, year, and organisation", () => {
    expect(filterPapers(library, { ...DEFAULT_FILTERS, topic: "long-user-history" })).toEqual([
      longerPaper,
    ]);
    expect(filterPapers(library, { ...DEFAULT_FILTERS, year: 2023 })).toEqual([dpoPaper]);
    expect(filterPapers(library, { ...DEFAULT_FILTERS, organisation: "stanford" })).toEqual([
      dpoPaper,
    ]);
  });

  it("filters by statuses and thresholds", () => {
    expect(filterPapers(library, { ...DEFAULT_FILTERS, reading: ["queued"] })).toEqual([
      longerPaper,
    ]);
    expect(
      filterPapers(library, { ...DEFAULT_FILTERS, verification: ["secondary_summary_only"] })
    ).toEqual([longerPaper]);
    expect(filterPapers(library, { ...DEFAULT_FILTERS, minPriority: 4 })).toEqual([longerPaper]);
    expect(filterPapers(library, { ...DEFAULT_FILTERS, minRelevance: 4 })).toEqual([longerPaper]);
  });

  it("filters by implemented / production / open questions / experiments", () => {
    expect(filterPapers(library, { ...DEFAULT_FILTERS, implemented: "yes" })).toEqual([dpoPaper]);
    expect(filterPapers(library, { ...DEFAULT_FILTERS, implemented: "no" })).toEqual([longerPaper]);
    expect(filterPapers(library, { ...DEFAULT_FILTERS, hasProductionEvidence: true })).toEqual([
      longerPaper,
    ]);
    expect(filterPapers(library, { ...DEFAULT_FILTERS, hasOpenQuestions: true })).toEqual([
      longerPaper,
    ]);
    expect(filterPapers(library, { ...DEFAULT_FILTERS, hasExperiments: true })).toEqual([dpoPaper]);
  });
});

describe("sortPapers", () => {
  const older = paper({ title: "B", priority: 5, year: 2020, updated_at: "2026-01-01T00:00:00Z" });
  const newer = paper({ title: "A", priority: 2, year: 2026, updated_at: "2026-06-01T00:00:00Z" });

  it("sorts by priority with recency tiebreak", () => {
    expect(sortPapers([newer, older], "priority").map((p) => p.title)).toEqual(["B", "A"]);
  });

  it("sorts by updated, year, and title", () => {
    expect(sortPapers([older, newer], "updated")[0].title).toBe("A");
    expect(sortPapers([older, newer], "year")[0].title).toBe("A");
    expect(sortPapers([older, newer], "title")[0].title).toBe("A");
  });

  it("does not mutate the input", () => {
    const input = [older, newer];
    sortPapers(input, "title");
    expect(input[0].title).toBe("B");
  });
});

describe("facetValues", () => {
  it("returns distinct sorted organisations and years", () => {
    const { organisations, years } = facetValues([
      paper({ organisation: "ByteDance", year: 2025 }),
      paper({ organisation: "ByteDance", year: 2023 }),
      paper({ organisation: "Meta", year: null }),
    ]);
    expect(organisations).toEqual(["ByteDance", "Meta"]);
    expect(years).toEqual([2025, 2023]);
  });
});
