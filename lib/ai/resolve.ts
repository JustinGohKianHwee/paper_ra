/**
 * Smart-input resolution: classify what the user pasted and fetch public
 * bibliographic metadata (arXiv Atom API, Crossref). No LLM involved.
 * `parsePaperInput` is pure and unit-tested.
 */
import { XMLParser } from "fast-xml-parser";
import { safeFetch } from "@/lib/ai/safe-fetch";

export type PaperInput =
  | { kind: "arxiv"; arxivId: string }
  | { kind: "doi"; doi: string }
  | { kind: "pdf_url"; url: string }
  | { kind: "url"; url: string }
  | { kind: "title"; title: string };

const ARXIV_ID = /(\d{4}\.\d{4,5})(v\d+)?/;

export function parsePaperInput(raw: string): PaperInput {
  const input = raw.trim();

  // arXiv forms: bare id, arXiv:id, abs/pdf/html URLs
  const arxivUrl = input.match(
    /^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5})(v\d+)?(?:\.pdf)?/i
  );
  if (arxivUrl) return { kind: "arxiv", arxivId: arxivUrl[1] };
  const arxivBare = input.match(/^(?:arxiv:)?(\d{4}\.\d{4,5})(v\d+)?$/i);
  if (arxivBare) return { kind: "arxiv", arxivId: arxivBare[1] };

  // DOI forms: bare 10.x/…, doi:, doi.org URLs
  const doiUrl = input.match(/^https?:\/\/(?:dx\.)?doi\.org\/(10\.\S+)$/i);
  if (doiUrl) return { kind: "doi", doi: decodeURIComponent(doiUrl[1]) };
  const doiBare = input.match(/^(?:doi:)?(10\.\d{4,9}\/\S+)$/i);
  if (doiBare) return { kind: "doi", doi: doiBare[1] };

  // Generic URLs
  if (/^https?:\/\//i.test(input)) {
    return /\.pdf(\?.*)?$/i.test(input)
      ? { kind: "pdf_url", url: input }
      : { kind: "url", url: input };
  }

  return { kind: "title", title: input };
}

export interface ResolvedMetadata {
  title: string;
  authors: string[];
  abstract: string | null;
  year: number | null;
  venue: string | null;
  arxivId: string | null;
  doi: string | null;
  canonicalUrl: string | null;
  pdfUrl: string | null;
}

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
  "arxiv:journal_ref"?: { "#text"?: string };
}

function entryToMetadata(entry: ArxivEntry): ResolvedMetadata {
  const idUrl: string = entry.id ?? "";
  const arxivId = idUrl.match(ARXIV_ID)?.[1] ?? null;
  const published = entry.published ? new Date(entry.published) : null;
  return {
    title: (entry.title ?? "").replace(/\s+/g, " ").trim(),
    authors: asArray(entry.author)
      .map((a) => a.name?.trim() ?? "")
      .filter(Boolean),
    abstract: (entry.summary ?? "").replace(/\s+/g, " ").trim() || null,
    year: published && !Number.isNaN(published.getTime()) ? published.getUTCFullYear() : null,
    venue: entry["arxiv:journal_ref"]?.["#text"]?.trim() || "arXiv",
    arxivId,
    doi: entry["arxiv:doi"]?.["#text"]?.trim() || null,
    canonicalUrl: arxivId ? `https://arxiv.org/abs/${arxivId}` : null,
    pdfUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}` : null,
  };
}

export async function fetchArxivById(arxivId: string): Promise<ResolvedMetadata | null> {
  const response = await safeFetch(
    `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`,
    { accept: "application/atom+xml, application/xml, text/xml" }
  );
  const doc = xml.parse(await response.text());
  const entry = asArray(doc?.feed?.entry as ArxivEntry | ArxivEntry[] | undefined)[0];
  if (!entry?.title) return null;
  return entryToMetadata(entry);
}

export async function searchArxivByTitle(title: string): Promise<ResolvedMetadata | null> {
  const query = `ti:"${title.replace(/"/g, "")}"`;
  const response = await safeFetch(
    `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&max_results=1`,
    { accept: "application/atom+xml, application/xml, text/xml" }
  );
  const doc = xml.parse(await response.text());
  const entry = asArray(doc?.feed?.entry as ArxivEntry | ArxivEntry[] | undefined)[0];
  if (!entry?.title) return null;
  return entryToMetadata(entry);
}

interface CrossrefWork {
  title?: string[];
  author?: { given?: string; family?: string }[];
  abstract?: string;
  issued?: { "date-parts"?: number[][] };
  "container-title"?: string[];
  DOI?: string;
  URL?: string;
  link?: { URL?: string; "content-type"?: string }[];
}

function crossrefToMetadata(work: CrossrefWork): ResolvedMetadata | null {
  const title = work.title?.[0]?.replace(/\s+/g, " ").trim();
  if (!title) return null;
  const pdfLink = work.link?.find((l) => l["content-type"] === "application/pdf")?.URL ?? null;
  return {
    title,
    authors: (work.author ?? [])
      .map((a) => [a.given, a.family].filter(Boolean).join(" "))
      .filter(Boolean),
    abstract:
      work.abstract
        ?.replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim() || null,
    year: work.issued?.["date-parts"]?.[0]?.[0] ?? null,
    venue: work["container-title"]?.[0] ?? null,
    arxivId: null,
    doi: work.DOI ?? null,
    canonicalUrl: work.URL ?? (work.DOI ? `https://doi.org/${work.DOI}` : null),
    pdfUrl: pdfLink,
  };
}

export async function fetchCrossrefByDoi(doi: string): Promise<ResolvedMetadata | null> {
  const response = await safeFetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    accept: "application/json",
  });
  const doc = (await response.json()) as { message?: CrossrefWork };
  return doc.message ? crossrefToMetadata(doc.message) : null;
}

export async function searchCrossrefByTitle(title: string): Promise<ResolvedMetadata | null> {
  const response = await safeFetch(
    `https://api.crossref.org/works?query.title=${encodeURIComponent(title)}&rows=1`,
    { accept: "application/json" }
  );
  const doc = (await response.json()) as { message?: { items?: CrossrefWork[] } };
  const work = doc.message?.items?.[0];
  return work ? crossrefToMetadata(work) : null;
}

/** Resolve any smart input to metadata; null when nothing could be found. */
export async function resolveMetadata(input: PaperInput): Promise<ResolvedMetadata | null> {
  switch (input.kind) {
    case "arxiv":
      return fetchArxivById(input.arxivId);
    case "doi":
      return fetchCrossrefByDoi(input.doi);
    case "title": {
      const fromArxiv = await searchArxivByTitle(input.title).catch(() => null);
      if (fromArxiv) return fromArxiv;
      return searchCrossrefByTitle(input.title).catch(() => null);
    }
    case "pdf_url":
      // No metadata source — the pipeline extracts from the PDF itself.
      return null;
    case "url": {
      // Recognise arXiv-adjacent URLs that slipped past parsing; otherwise none.
      const arxivId = input.url.match(ARXIV_ID)?.[1];
      return arxivId ? fetchArxivById(arxivId) : null;
    }
  }
}
