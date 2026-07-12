/** Shared shape of `search_all` results + client-side helpers. */

export interface SearchResult {
  // "experiment" stays for the dormant feature's old links; search_all no
  // longer returns it.
  kind:
    | "paper"
    | "paper_note"
    | "annotation"
    | "concept"
    | "experiment"
    | "misconception"
    | "synthesis";
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  reading_status: string | null;
  topic_names: string[];
  updated_at: string;
  rank: number;
}

export const SEARCH_KIND_LABELS: Record<SearchResult["kind"], string> = {
  paper: "Paper",
  paper_note: "Paper note",
  annotation: "Reading note",
  concept: "Concept",
  experiment: "Experiment",
  misconception: "Misconception",
  synthesis: "Synthesis",
};

/**
 * ts_headline wraps matches in <b>…</b> but does not escape the rest of the
 * source text. Split into typed parts so callers can render safely as React
 * text nodes (auto-escaped) instead of dangerouslySetInnerHTML.
 */
export function excerptParts(excerpt: string): { text: string; bold: boolean }[] {
  const parts: { text: string; bold: boolean }[] = [];
  const regex = /<b>([\s\S]*?)<\/b>/g;
  let last = 0;
  for (const match of excerpt.matchAll(regex)) {
    if (match.index > last) parts.push({ text: excerpt.slice(last, match.index), bold: false });
    parts.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < excerpt.length) parts.push({ text: excerpt.slice(last), bold: false });
  return parts;
}

export function searchResultHref(r: Pick<SearchResult, "kind" | "slug" | "id">): string {
  switch (r.kind) {
    case "paper":
    case "paper_note":
    case "annotation":
      return `/papers/${r.slug}`;
    case "concept":
      return `/concepts/${r.slug}`;
    case "experiment":
      return `/experiments/${r.slug}`;
    case "misconception":
      return `/misconceptions#${r.id}`;
    case "synthesis":
      return `/synthesis/${r.id}`;
  }
}
