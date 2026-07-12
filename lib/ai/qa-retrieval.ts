/**
 * Lexical retrieval for grounded Q&A. Pure functions (unit-tested): given the
 * paper's extracted pages and a question, pick the most relevant pages within
 * a character budget instead of resending the whole paper per question.
 *
 * Deliberately simple — a personal library never needs vector infrastructure
 * for a single paper: term overlap with rarity weighting works well when the
 * corpus is one document.
 */

export interface RetrievalPage {
  pageNo: number;
  content: string;
}

export interface ScoredPage extends RetrievalPage {
  score: number;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "can",
  "did",
  "do",
  "does",
  "for",
  "from",
  "had",
  "has",
  "have",
  "how",
  "i",
  "if",
  "in",
  "is",
  "it",
  "its",
  "not",
  "of",
  "on",
  "or",
  "our",
  "so",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
  "paper",
  "authors",
  "does",
  "mean",
]);

/** Lowercased content terms, stop words removed. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#-]+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

/**
 * Scores every page against the question. Term weight is dampened by how many
 * pages contain it (a term on every page tells you nothing); per-page term
 * frequency is capped so one repeated word can't dominate.
 */
export function scorePages(pages: RetrievalPage[], question: string): ScoredPage[] {
  const terms = [...new Set(tokenize(question))];
  if (terms.length === 0) return pages.map((p) => ({ ...p, score: 0 }));

  const lowered = pages.map((p) => p.content.toLowerCase());
  const pageFrequency = new Map<string, number>();
  for (const term of terms) {
    pageFrequency.set(term, lowered.filter((c) => c.includes(term)).length);
  }

  return pages.map((page, i) => {
    let score = 0;
    for (const term of terms) {
      const df = pageFrequency.get(term) ?? 0;
      if (df === 0) continue;
      const occurrences = Math.min(countOccurrences(lowered[i], term), 5);
      if (occurrences === 0) continue;
      const rarity = 1 / (1 + Math.log(df));
      score += occurrences * rarity;
    }
    return { ...page, score };
  });
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count++;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

export interface SelectContextOptions {
  /** Total character budget across selected pages. */
  maxChars?: number;
  maxPages?: number;
}

/**
 * Picks the top-scoring pages within the budget and returns them in document
 * order (so the model reads them coherently). Pages that match nothing are
 * never included, even under budget.
 */
export function selectContext(
  pages: RetrievalPage[],
  question: string,
  { maxChars = 24000, maxPages = 6 }: SelectContextOptions = {}
): ScoredPage[] {
  const scored = scorePages(pages, question)
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected: ScoredPage[] = [];
  let used = 0;
  for (const page of scored) {
    if (selected.length >= maxPages) break;
    const cost = Math.min(page.content.length, maxChars);
    if (used + cost > maxChars && selected.length > 0) continue;
    selected.push(
      page.content.length > maxChars ? { ...page, content: page.content.slice(0, maxChars) } : page
    );
    used += cost;
  }

  return selected.sort((a, b) => a.pageNo - b.pageNo);
}
