/**
 * PDF text extraction (unpdf) and chunking for LLM processing.
 * `chunkPages` is pure and unit-tested.
 */
import { extractText, getDocumentProxy } from "unpdf";
import { safeFetch } from "@/lib/ai/safe-fetch";

export interface ExtractedDocument {
  pages: string[]; // 1-based order; pages[0] = page 1
  totalPages: number;
}

const MAX_PAGES = 200;

export async function extractPdfFromUrl(url: string): Promise<ExtractedDocument> {
  const response = await safeFetch(url, {
    accept: "application/pdf",
    allowedContentTypes: ["application/pdf", "application/octet-stream", "binary/octet-stream"],
  });
  return extractPdfFromBuffer(new Uint8Array(await response.arrayBuffer()));
}

export async function extractPdfFromBuffer(buffer: Uint8Array): Promise<ExtractedDocument> {
  const pdf = await getDocumentProxy(buffer);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = (text as string[]).slice(0, MAX_PAGES).map(normalisePageText);
  return { pages, totalPages };
}

function normalisePageText(page: string): string {
  return page
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface DocumentChunk {
  index: number;
  pageStart: number; // 1-based inclusive
  pageEnd: number; // 1-based inclusive
  text: string;
}

/**
 * Groups pages into chunks bounded by a character budget (a proxy for
 * tokens; ~4 chars/token). Pages are never split, so page-range anchors in
 * the output always map cleanly back to the PDF for the split viewer.
 */
export function chunkPages(pages: string[], maxChars = 24_000): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let currentText: string[] = [];
  let currentStart = 1;
  let currentLength = 0;

  const flush = (endPage: number) => {
    if (currentText.length === 0) return;
    chunks.push({
      index: chunks.length,
      pageStart: currentStart,
      pageEnd: endPage,
      text: currentText.join("\n\n"),
    });
    currentText = [];
    currentLength = 0;
  };

  pages.forEach((page, i) => {
    const pageNumber = i + 1;
    // A single oversized page still becomes its own (truncated) chunk.
    const pageText = page.length > maxChars ? page.slice(0, maxChars) : page;
    if (currentLength > 0 && currentLength + pageText.length > maxChars) {
      flush(pageNumber - 1);
      currentStart = pageNumber;
    }
    if (currentText.length === 0) currentStart = pageNumber;
    currentText.push(`[page ${pageNumber}]\n${pageText}`);
    currentLength += pageText.length;
  });
  flush(pages.length);

  return chunks;
}

/** Rough character budget check used to decide map-reduce vs single pass. */
export function totalChars(pages: string[]): number {
  return pages.reduce((sum, p) => sum + p.length, 0);
}
