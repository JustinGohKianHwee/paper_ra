import type { PaperRow } from "@/lib/supabase/database.types";
import {
  readingStatusValues,
  verificationStatusValues,
  type ReadingStatus,
  type VerificationStatus,
} from "@/lib/validation/enums";

/**
 * Library filtering/sorting as pure functions. The library is fetched once
 * per request and filtered in memory: a personal library is small (hundreds
 * of rows), which keeps this logic simple and unit-testable. Full-text search
 * across note bodies lives in /search (Postgres FTS), not here.
 */

export interface PaperLibraryItem extends PaperRow {
  topics: { name: string; slug: string }[];
  has_open_questions: boolean;
  experiment_count: number;
}

export const PAPER_SORTS = ["updated", "priority", "year", "title", "relevance"] as const;
export type PaperSort = (typeof PAPER_SORTS)[number];

export interface PaperFilters {
  q: string;
  topic: string | null; // topic slug
  organisation: string | null;
  year: number | null;
  reading: ReadingStatus[];
  verification: VerificationStatus[];
  minPriority: number | null;
  minRelevance: number | null;
  hasProductionEvidence: boolean;
  implemented: "yes" | "no" | null;
  hasOpenQuestions: boolean;
  hasExperiments: boolean;
  needsRevisit: boolean;
  sort: PaperSort;
  view: "compact" | "detailed";
}

export const DEFAULT_FILTERS: PaperFilters = {
  q: "",
  topic: null,
  organisation: null,
  year: null,
  reading: [],
  verification: [],
  minPriority: null,
  minRelevance: null,
  hasProductionEvidence: false,
  implemented: null,
  hasOpenQuestions: false,
  hasExperiments: false,
  needsRevisit: false,
  sort: "priority",
  view: "detailed",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function list(v: string | string[] | undefined): string[] {
  const s = first(v);
  return s ? s.split(",").filter(Boolean) : [];
}

export function parsePaperFilters(params: SearchParams): PaperFilters {
  const yearRaw = Number.parseInt(first(params.year) ?? "", 10);
  const minPriorityRaw = Number.parseInt(first(params.min_priority) ?? "", 10);
  const minRelevanceRaw = Number.parseInt(first(params.min_relevance) ?? "", 10);
  const sortRaw = first(params.sort);
  const implementedRaw = first(params.implemented);

  return {
    q: first(params.q)?.trim() ?? "",
    topic: first(params.topic) || null,
    organisation: first(params.org) || null,
    year: Number.isFinite(yearRaw) ? yearRaw : null,
    reading: list(params.reading).filter((s): s is ReadingStatus =>
      (readingStatusValues as readonly string[]).includes(s)
    ),
    verification: list(params.verification).filter((s): s is VerificationStatus =>
      (verificationStatusValues as readonly string[]).includes(s)
    ),
    minPriority: Number.isFinite(minPriorityRaw) ? minPriorityRaw : null,
    minRelevance: Number.isFinite(minRelevanceRaw) ? minRelevanceRaw : null,
    hasProductionEvidence: first(params.production) === "1",
    implemented: implementedRaw === "yes" || implementedRaw === "no" ? implementedRaw : null,
    hasOpenQuestions: first(params.open_questions) === "1",
    hasExperiments: first(params.experiments) === "1",
    needsRevisit: first(params.revisit) === "1",
    sort: (PAPER_SORTS as readonly string[]).includes(sortRaw ?? "")
      ? (sortRaw as PaperSort)
      : DEFAULT_FILTERS.sort,
    view: first(params.view) === "compact" ? "compact" : "detailed",
  };
}

function matchesQuery(paper: PaperLibraryItem, q: string): boolean {
  const needle = q.toLowerCase();
  const haystack = [
    paper.title,
    paper.subtitle ?? "",
    paper.organisation ?? "",
    paper.venue ?? "",
    paper.arxiv_id ?? "",
    ...paper.authors,
    ...paper.topics.map((t) => t.name),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function filterPapers(
  papers: PaperLibraryItem[],
  filters: PaperFilters
): PaperLibraryItem[] {
  return papers.filter((p) => {
    if (filters.q && !matchesQuery(p, filters.q)) return false;
    if (filters.topic && !p.topics.some((t) => t.slug === filters.topic)) return false;
    if (
      filters.organisation &&
      (p.organisation ?? "").toLowerCase() !== filters.organisation.toLowerCase()
    )
      return false;
    if (filters.year !== null && p.year !== filters.year) return false;
    if (filters.reading.length > 0 && !filters.reading.includes(p.reading_status)) return false;
    if (filters.verification.length > 0 && !filters.verification.includes(p.verification_status))
      return false;
    if (filters.minPriority !== null && p.priority < filters.minPriority) return false;
    if (filters.minRelevance !== null && p.relevance < filters.minRelevance) return false;
    if (filters.hasProductionEvidence && !(p.production_evidence ?? "").trim()) return false;
    if (filters.implemented === "yes" && p.reading_status !== "implemented") return false;
    if (filters.implemented === "no" && p.reading_status === "implemented") return false;
    if (filters.hasOpenQuestions && !p.has_open_questions) return false;
    if (filters.hasExperiments && p.experiment_count === 0) return false;
    if (filters.needsRevisit && !p.needs_revisit) return false;
    return true;
  });
}

export function sortPapers(papers: PaperLibraryItem[], sort: PaperSort): PaperLibraryItem[] {
  const byUpdatedDesc = (a: PaperLibraryItem, b: PaperLibraryItem) =>
    b.updated_at.localeCompare(a.updated_at);

  const sorted = [...papers];
  switch (sort) {
    case "updated":
      sorted.sort(byUpdatedDesc);
      break;
    case "priority":
      sorted.sort((a, b) => b.priority - a.priority || byUpdatedDesc(a, b));
      break;
    case "year":
      sorted.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || byUpdatedDesc(a, b));
      break;
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "relevance":
      sorted.sort(
        (a, b) => b.relevance - a.relevance || b.priority - a.priority || byUpdatedDesc(a, b)
      );
      break;
  }
  return sorted;
}

/** Distinct organisations/years for filter dropdowns. */
export function facetValues(papers: PaperLibraryItem[]): {
  organisations: string[];
  years: number[];
} {
  const organisations = [
    ...new Set(papers.map((p) => p.organisation).filter((o): o is string => !!o)),
  ].sort();
  const years = [...new Set(papers.map((p) => p.year).filter((y): y is number => y !== null))].sort(
    (a, b) => b - a
  );
  return { organisations, years };
}
