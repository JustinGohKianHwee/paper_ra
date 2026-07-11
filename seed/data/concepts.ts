/**
 * Seed concepts. Definitions, "why it helps", and failure modes are derived
 * from the technique glossary of the deep study guide
 * (llm_recsys_tiktok_shop_deep_study_guide.pdf, ch. 18, p. 34) and the
 * relevant chapters; where the guides give no material, fields carry a TODO
 * instead of invented content.
 */
export interface ConceptSeed {
  name: string;
  slug: string;
  plain_definition_md?: string;
  technical_definition_md?: string;
  equation_md?: string;
  why_it_helps_md?: string;
  failure_modes_md?: string;
}

const GLOSSARY = "Source: deep study guide, ch. 18 glossary (p. 34).";
const TODO_PRIMARY =
  "TODO: fill in from the primary paper — not covered in enough detail by the study guides.";

export const CONCEPT_SEEDS: ConceptSeed[] = [
  {
    name: "Mixture of Experts",
    slug: "mixture-of-experts",
    plain_definition_md:
      "Routes each token/request to a small subset of expert networks instead of all parameters, so total capacity can be huge while active compute stays controlled.\n\n" +
      GLOSSARY,
    why_it_helps_md:
      "Increases total capacity without proportional active compute; lets experts specialise by latent subproblem (in recsys: categories, markets, price bands, user lifecycles).",
    failure_modes_md:
      "Expert collapse, routing bias, undertrained experts, communication overhead, higher operational complexity. Sparse models may improve averages while hurting small segments.",
    technical_definition_md: TODO_PRIMARY,
  },
  {
    name: "Multi-head Latent Attention",
    slug: "multi-head-latent-attention",
    plain_definition_md:
      "Compresses attention key/value state into a latent representation to reduce attention memory and improve inference efficiency relative to naive KV storage (introduced at scale in DeepSeek-V3).\n\nSource: deep study guide, ch. 2 (p. 5).",
    why_it_helps_md:
      "Attention/KV compression matters because long-sequence modelling and autoregressive serving are memory-bound; savings unlock longer contexts or larger batches.",
    failure_modes_md: "Compression may lose details needed for rare intent or exact matching.",
    technical_definition_md: TODO_PRIMARY,
    equation_md: TODO_PRIMARY,
  },
  {
    name: "KV-cache compression",
    slug: "kv-cache-compression",
    plain_definition_md:
      "Reducing the memory footprint of attention key/value caches (compression, eviction, quantisation) so long-context inference stays affordable.\n\n" +
      GLOSSARY,
    why_it_helps_md:
      "KV cache grows with batch × sequence length × layers × heads × head_dim; long context and high concurrency make memory the bottleneck.",
    failure_modes_md:
      "Compression may lose details needed for rare intent or exact matching; gains are workload-specific.",
  },
  {
    name: "Token merging",
    slug: "token-merging",
    plain_definition_md:
      "Compresses multiple old or low-importance tokens into fewer summary tokens (e.g. LONGER's token-merge module with lightweight InnerTransformers).\n\n" +
      GLOSSARY,
    why_it_helps_md:
      "Reduces quadratic attention cost while retaining long-history signal — recent events stay high-resolution, older history becomes lower-resolution memory.",
    failure_modes_md:
      "Can erase rare but important long-tail preference (e.g. expensive one-off purchases, gift shopping).",
  },
  {
    name: "Global summary tokens",
    slug: "global-summary-tokens",
    plain_definition_md:
      "Special tokens that act as shared summary/anchor channels across a long sequence, entering the same transformer pipeline as event tokens (same embedding dimensionality) but with a different semantic role and construction.\n\n" +
      GLOSSARY,
    why_it_helps_md:
      "Improves long-range information flow and stabilises attention over thousands of events — long-range interaction needs shared summary channels.",
    failure_modes_md: "Global tokens can become noisy bottlenecks or overfit to popularity.",
  },
  {
    name: "Candidate-conditioned attention",
    slug: "candidate-conditioned-attention",
    plain_definition_md:
      "Attention over user history that is conditioned on the candidate item being scored, so the model reads history differently per candidate.\n\nTODO: verify the precise mechanism and canonical reference from primary papers — not covered by the study guides.",
    why_it_helps_md: TODO_PRIMARY,
    failure_modes_md: TODO_PRIMARY,
  },
  {
    name: "Memory banks",
    slug: "memory-banks",
    plain_definition_md:
      "Stores reusable user/item/multimodal representations outside the model's immediate input window (LMN's scalable memory block; LEMUR's multimodal memory bank).\n\n" +
      GLOSSARY,
    why_it_helps_md:
      "Preserves long-term preference beyond fixed windows and amortises expensive sequence/multimodal encoding; similar-user memory can help sparse users.",
    failure_modes_md:
      "Stale memory (especially after an intent is satisfied), privacy/storage cost, train/serve mismatch, over-amplifying dominant categories.",
  },
  {
    name: "Semantic IDs",
    slug: "semantic-ids-concept",
    plain_definition_md:
      "Represents items as token sequences that encode taxonomy/semantics instead of opaque item IDs, making generation tractable over huge catalogs.\n\n" +
      GLOSSARY,
    why_it_helps_md:
      "Makes generative retrieval feasible; long-tail and unseen items can share tokens with related items and borrow their signal.",
    failure_modes_md:
      "Invalid ID generation, semantic collapse (diversity loss), slow generation, hard catalog updates.",
  },
  {
    name: "Outcome conditioning",
    slug: "outcome-conditioning",
    plain_definition_md:
      "Conditions retrieval/generation on a target outcome (click, save, purchase, GMV, diversity) so one model can be steered across business objectives (as in PinRec).\n\n" +
      GLOSSARY,
    why_it_helps_md:
      "Gives a knob to balance multiple metrics rather than training one fixed retriever.",
    failure_modes_md:
      "May shift bias toward easier objectives or over-optimise high-price/popular items.",
  },
  {
    name: "Offline LLM intent mining",
    slug: "offline-llm-intent-mining",
    plain_definition_md:
      "Runs LLMs offline to convert noisy behaviour into compact intents/tags/features that are retrieved and composed online (AIR, RecGPT family).\n\n" +
      GLOSSARY,
    why_it_helps_md:
      "Keeps LLM semantics while avoiding online LLM latency: precompute, cache, retrieve, compose. Atomic intents reduce noise by decomposing broad behaviour into reusable units.",
    failure_modes_md:
      "Intent labels can be stale, generic, wrong, culturally biased, or hard to calibrate; freshness management is required because a mission can change in minutes.",
  },
  {
    name: "UG-Separation",
    slug: "ug-separation-concept",
    plain_definition_md:
      "Separates reusable user-side computation from per-item scoring: compute the user representation once, cache it, reuse it across many candidates.\n\n" +
      GLOSSARY,
    why_it_helps_md:
      "Amortises expensive sequence/user encoding across hundreds of candidates; the quality-cost trade-off improves when shared compute is reused.",
    failure_modes_md:
      "Stale caches in fast-changing sessions; lost fine-grained user-item interaction if too much moves out of the candidate-specific path; train/serve mismatch.",
  },
  {
    name: "PagedAttention",
    slug: "pagedattention",
    plain_definition_md:
      "Allocates KV cache in fixed-size blocks/pages (like OS virtual memory) rather than contiguous chunks, enabling continuous batching and prefix sharing.\n\n" +
      GLOSSARY,
    why_it_helps_md:
      "Reduces fragmentation and duplicated cache storage, increasing effective batch size and throughput per GPU.",
    failure_modes_md:
      "Kernel complexity; gains are workload-specific (request-length distribution matters).",
  },
  {
    name: "Data-mixture design",
    slug: "data-mixture-design",
    plain_definition_md:
      "Controls the proportions of data sources/actions/languages/domains during training — treated as an architecture-level decision, not a preprocessing detail.\n\n" +
      GLOSSARY,
    why_it_helps_md:
      "Shapes what the model learns and which segments improve; in recsys, search data teaches explicit intent, feed data implicit taste, purchase data high-intent conversion, refund data quality risk.",
    failure_modes_md:
      "Average metric wins can hide segment/calibration regressions; filter models encode their own biases and can remove rare but valuable data.",
  },
  {
    name: "Direct Preference Optimization",
    slug: "dpo",
    plain_definition_md:
      "Optimises chosen responses/items over rejected ones with a reference-policy term — preference alignment without a separate reward model or full RL loop.\n\n" +
      GLOSSARY,
    why_it_helps_md:
      "Simpler and more stable than full RLHF; maps naturally to pairwise preference data, which recsys has implicitly (clicked > skipped, purchased > clicked-only).",
    failure_modes_md:
      "Preference pairs are biased by exposure and position; may optimise proxy preference instead of real long-term value.",
    equation_md: TODO_PRIMARY,
  },
  {
    name: "RLVR",
    slug: "rlvr",
    plain_definition_md:
      "Reinforcement learning with verifiable rewards: reinforce behaviour on tasks where correctness can be objectively checked.\n\n" +
      GLOSSARY,
    why_it_helps_md:
      "Improves tasks with checkable outcomes; the recsys analogues are verifiable but delayed/biased rewards such as purchase, refund outcome, or policy compliance.",
    failure_modes_md: "Overconfidence, reward hacking, and poor calibration (see DCPO).",
  },
  {
    name: "Calibration",
    slug: "calibration-concept",
    plain_definition_md:
      "Keeping predicted probabilities numerically faithful to observed frequencies (ECE, predicted-vs-observed bins) — pCTR/pCVR feed downstream arithmetic, so ranking-only gains can still be net losses.\n\nSource: deep study guide, ch. 3 (pp. 7–8).",
    why_it_helps_md:
      "If optimisation makes predictions overconfident, GMV estimates go wrong even when ranking AUC improves.",
    failure_modes_md:
      "Reward/accuracy optimisation degrading confidence quality; calibration modules that improve ECE while hurting ranking.",
  },
  {
    name: "Long-context curriculum",
    slug: "long-context-curriculum",
    plain_definition_md:
      "Extending usable context via continued pretraining with progressive lengths (e.g. 128K → 1M → 4M), balanced length distributions, and retrieval-heavy data — rather than one-shot max-length jumps.\n\nSource: deep study guide, ch. 14 (pp. 29–30).",
    why_it_helps_md:
      "Long-context ability is a retrieval problem (find the relevant old evidence among distractors); balanced lengths preserve short-context/sparse-user quality.",
    failure_modes_md:
      "Attending to distractors; degraded short-context performance; cost — compression and caching usually still required.",
  },
];
