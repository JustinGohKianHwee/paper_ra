/**
 * Research Radar — provider interfaces (future feature; see
 * docs/research-radar-roadmap.md).
 *
 * In the MVP no provider is implemented and nothing is fetched. The scoring
 * rubric (`scoring.ts`) and deduplication (`dedupe.ts`) are pure functions,
 * implemented and unit-tested now, so a future provider only has to supply
 * fetching + normalisation.
 *
 * Hard rules for any future implementation:
 *  - a candidate is never automatically marked as read
 *  - generated notes never enter the canonical knowledge base without
 *    explicit user approval (candidates live in `radar_candidates` until
 *    accepted into `papers`)
 */

export interface RawProviderPaper {
  /** Provider-native identifier (e.g. arXiv id, Semantic Scholar id). */
  externalId: string;
  title: string;
  abstract?: string;
  authors?: string[];
  url?: string;
  arxivId?: string;
  doi?: string;
  publishedOn?: string; // YYYY-MM-DD
  venue?: string;
  organisation?: string;
}

export interface NormalisedCandidate {
  title: string;
  /** Lowercased, punctuation-stripped title used for dedup. */
  normalisedTitle: string;
  arxivId?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  provider: string;
  publishedOn?: string;
  topics: string[];
}

/** Signals the scoring rubric consumes. All optional; unknown = 0. */
export interface CandidateSignals {
  /** 0–5: direct TikTok Shop / e-commerce relevance. */
  tiktokShopRelevance?: number;
  /** 0–5: recommender-system relevance. */
  recsysRelevance?: number;
  /** Paper reports production deployment. */
  hasProductionEvidence?: boolean;
  /** Paper reports online A/B-test evidence. */
  hasOnlineAbEvidence?: boolean;
  /** 0–5: how transferable the mechanism is outside its original system. */
  mechanismTransferability?: number;
  /** Touches CTR, CVR, GMV, retention, trust, cold start, calibration,
   *  latency, GPU cost, or label efficiency. */
  touchesProductionLevers?: boolean;
  /** 0–5: novelty relative to papers already stored. */
  noveltyVsLibrary?: number;
  /** 0–5: reading cost (length/density). Higher = more expensive to read. */
  readingCost?: number;
  /** 0–5: expected practical value if the ideas pan out. */
  expectedPracticalValue?: number;
}

export interface ScoredCandidate extends NormalisedCandidate {
  score: number;
  scoreBreakdown: Record<string, number>;
  whyItMatters: string;
}

/**
 * The interface every future radar provider (arXiv, Semantic Scholar,
 * Crossref, OpenReview, company blogs, …) must implement.
 */
export interface RadarProvider {
  readonly name: string;
  /** Fetch recent candidate papers (e.g. last N days for tracked topics). */
  searchRecentPapers(options: { since: string; topics: string[] }): Promise<RawProviderPaper[]>;
  /** Map provider-native metadata to the common candidate shape. */
  normalisePaperMetadata(raw: RawProviderPaper): NormalisedCandidate;
}

export interface ExistingPaperKey {
  arxivId?: string | null;
  doi?: string | null;
  normalisedTitle: string;
}
