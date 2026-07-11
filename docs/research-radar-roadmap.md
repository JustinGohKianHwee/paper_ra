# Research Radar — roadmap

Automated paper discovery is **not implemented in the MVP**. What exists today:

- `radar_candidates` table (with `radar_status`: fetched → scored → in_review →
  accepted / dismissed, and `accepted_paper_id` linking into the library);
- typed provider interfaces in `lib/radar/types.ts`;
- the relevance rubric (`lib/radar/scoring.ts`) and deduplication
  (`lib/radar/dedupe.ts`), implemented as pure functions and unit-tested;
- a disabled `/radar` page explaining the plan.

## Hard rules (apply to any future implementation)

1. A fetched candidate is **never automatically marked as read**.
2. Generated summaries/notes **never enter the canonical knowledge base without
   explicit approval** — candidates live in `radar_candidates` until accepted, at which
   point an ordinary (mostly empty) `papers` row is created with
   `verification_status = metadata_only`.
3. Scores must stay auditable: the rubric breakdown is stored in `score_breakdown`
   and shown in the review UI.

## Workflow

```
fetched candidate → relevance scoring → personal review queue → accept or dismiss
   → reading queue → structured notes → experiment → synthesis
```

## Provider interface (lib/radar/types.ts)

```ts
interface RadarProvider {
  readonly name: string;
  searchRecentPapers(options: { since: string; topics: string[] }): Promise<RawProviderPaper[]>;
  normalisePaperMetadata(raw: RawProviderPaper): NormalisedCandidate;
}
// plus pure functions used across providers:
deduplicateCandidates(candidates, existingLibraryKeys); // arXiv id → DOI → normalised title
scoreCandidate(candidate, signals); // rubric below
explainRecommendation(candidate, signals, score); // honest one-liner, no invented claims
```

Planned providers: arXiv, Semantic Scholar, Crossref, OpenReview, conference
proceedings, and official research blogs (ByteDance, Kuaishou, Alibaba, Pinterest,
Meta, Netflix, Amazon, Google, NVIDIA).

## Relevance rubric (implemented, weights in `scoring.ts`)

| Signal                                                                                                                    | Weight        |
| ------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Personal relevance (0–5)                                                                                                  | 0.20          |
| Domain relevance (0–5)                                                                                                    | 0.15          |
| Online A/B-test evidence                                                                                                  | 0.13          |
| Production evidence                                                                                                       | 0.12          |
| Mechanism transferability (0–5)                                                                                           | 0.15          |
| Touches production levers (CTR, CVR, GMV, retention, trust, cold start, calibration, latency, GPU cost, label efficiency) | 0.10          |
| Expected practical value (0–5)                                                                                            | 0.10          |
| Novelty vs stored library (0–5)                                                                                           | 0.05          |
| Reading cost (0–5)                                                                                                        | −0.08 penalty |

Score = clamp(weighted sum) × 100. This mirrors the deep-research report's rule of
thumb: _deep-read if it moves a production lever, has online evidence, or exposes a
transferable mechanism — at least two of three._

## Implementation phases

1. **Manual candidates + review queue UI** — add candidates by arXiv ID/URL; dedupe
   against the library; score with manually entered signals; accept → creates a
   `papers` row (metadata_only) + reading-queue entry.
2. **arXiv provider** — scheduled fetch (categories cs.IR/cs.LG + tracked topic
   queries), normalisation, automatic dedupe; signals still human-entered or heuristic
   (regex for "A/B", "deployed", venue lists).
3. **More providers + heuristic signal extraction** — Semantic Scholar/Crossref
   enrichment (citations, DOIs), company-blog RSS, abstract-based topic classification.
4. **Optional LLM assistance (offline, batch)** — signal extraction and
   `why_it_matters` drafting run as a local script, always into the review queue,
   never directly into the library (mirrors the offline-LLM-intent-mining pattern the
   library itself documents).
