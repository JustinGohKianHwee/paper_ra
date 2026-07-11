import type { ExistingPaperKey, NormalisedCandidate } from "@/lib/radar/types";

/**
 * Title normalisation used for dedup across providers: lowercase, strip
 * accents/punctuation, collapse whitespace. Deliberately aggressive — a false
 * merge is cheaper than a duplicate in the review queue.
 */
export function normaliseTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** arXiv ids may arrive as "arXiv:2505.04421v2" / URLs — reduce to "2505.04421". */
export function normaliseArxivId(id: string | null | undefined): string | null {
  if (!id) return null;
  const match = id.toLowerCase().match(/(\d{4}\.\d{4,5})/);
  return match ? match[1] : id.trim().toLowerCase() || null;
}

export function normaliseDoi(doi: string | null | undefined): string | null {
  if (!doi) return null;
  return (
    doi
      .toLowerCase()
      .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
      .trim() || null
  );
}

function keysOf(c: {
  arxivId?: string | null;
  doi?: string | null;
  normalisedTitle: string;
}): string[] {
  const keys: string[] = [];
  const arxiv = normaliseArxivId(c.arxivId);
  const doi = normaliseDoi(c.doi);
  if (arxiv) keys.push(`arxiv:${arxiv}`);
  if (doi) keys.push(`doi:${doi}`);
  if (c.normalisedTitle) keys.push(`title:${c.normalisedTitle}`);
  return keys;
}

/**
 * Removes candidates that duplicate the existing library or each other.
 * Match priority: arXiv id, then DOI, then normalised title.
 */
export function deduplicateCandidates(
  candidates: NormalisedCandidate[],
  existing: ExistingPaperKey[]
): NormalisedCandidate[] {
  const seen = new Set<string>(existing.flatMap((e) => keysOf(e)));
  const result: NormalisedCandidate[] = [];

  for (const candidate of candidates) {
    const keys = keysOf(candidate);
    if (keys.some((k) => seen.has(k))) continue;
    for (const k of keys) seen.add(k);
    result.push(candidate);
  }
  return result;
}
