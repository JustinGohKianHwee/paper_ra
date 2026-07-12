import "server-only";
import { XMLParser } from "fast-xml-parser";
import { normaliseTitle } from "@/lib/radar/dedupe";
import type { NormalisedCandidate, RawProviderPaper } from "@/lib/radar/types";

/**
 * arXiv metadata provider for Radar v1. Metadata + abstracts only — Radar
 * never downloads candidate PDFs. The base URL is configurable so tests can
 * point at the local mock (this is trusted app config, not user input).
 */

const ARXIV_BASE = () => process.env.ARXIV_BASE_URL ?? "https://export.arxiv.org";
const ARXIV_ID = /(\d{4}\.\d{4,5})/;

const xml = new XMLParser({ ignoreAttributes: false });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

interface ArxivEntry {
  id?: string;
  title?: string;
  summary?: string;
  published?: string;
  author?: { name?: string } | { name?: string }[];
  "arxiv:doi"?: { "#text"?: string };
}

export async function searchArxiv(options: {
  query: string;
  maxResults?: number;
}): Promise<RawProviderPaper[]> {
  const params = new URLSearchParams({
    search_query: options.query,
    sortBy: "submittedDate",
    sortOrder: "descending",
    max_results: String(options.maxResults ?? 15),
  });
  const response = await fetch(`${ARXIV_BASE()}/api/query?${params}`, {
    headers: { accept: "application/atom+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`arXiv search failed (${response.status})`);

  const doc = xml.parse(await response.text());
  const entries = asArray(doc?.feed?.entry as ArxivEntry | ArxivEntry[] | undefined);
  return entries
    .filter((e) => e.title && e.id)
    .map((e) => {
      const arxivId = (e.id ?? "").match(ARXIV_ID)?.[1];
      return {
        externalId: arxivId ?? (e.id as string),
        title: (e.title ?? "").replace(/\s+/g, " ").trim(),
        abstract: (e.summary ?? "").replace(/\s+/g, " ").trim() || undefined,
        authors: asArray(e.author)
          .map((a) => a.name?.trim() ?? "")
          .filter(Boolean),
        url: arxivId ? `https://arxiv.org/abs/${arxivId}` : (e.id as string),
        arxivId,
        doi: e["arxiv:doi"]?.["#text"]?.trim(),
        publishedOn: e.published ? e.published.slice(0, 10) : undefined,
        venue: "arXiv",
      } satisfies RawProviderPaper;
    });
}

export function normaliseArxivPaper(raw: RawProviderPaper): NormalisedCandidate {
  return {
    title: raw.title,
    normalisedTitle: normaliseTitle(raw.title),
    arxivId: raw.arxivId,
    doi: raw.doi,
    url: raw.url,
    abstract: raw.abstract,
    provider: "arxiv",
    publishedOn: raw.publishedOn,
    topics: [],
  };
}
