/**
 * Seed topics. Overviews are short, generic domain descriptions (editable in
 * the app); synthesis and knowledge-gap fields are intentionally left for the
 * user to fill in.
 */
export interface TopicSeed {
  name: string;
  slug: string;
  overview_md: string;
}

export const TOPIC_SEEDS: TopicSeed[] = [
  {
    name: "Sequential Recommendation",
    slug: "sequential-recommendation",
    overview_md:
      "Modelling ordered user behaviour (clicks, watches, purchases) to predict the next relevant item. Foundation models here: SASRec, BERT4Rec, BST.",
  },
  {
    name: "Long User History",
    slug: "long-user-history",
    overview_md:
      "Making thousands of historical events usable: compression, token merging, hybrid attention, and length curricula — without destroying latency or sparse-user quality.",
  },
  {
    name: "User Memory",
    slug: "user-memory",
    overview_md:
      "Persistent or external memory of durable user preference that outlives the model's input window (memory banks, compressed memory blocks).",
  },
  {
    name: "Generative Retrieval",
    slug: "generative-retrieval",
    overview_md:
      "Generating item identifiers or slates autoregressively instead of retrieve-then-rank, usually on top of semantic IDs.",
  },
  {
    name: "Semantic IDs",
    slug: "semantic-ids",
    overview_md:
      "Representing items as structured token sequences that encode taxonomy/semantics, so generation is tractable and long-tail items share signal.",
  },
  {
    name: "LLM-Enhanced Recommendation",
    slug: "llm-enhanced-recommendation",
    overview_md:
      "Using LLMs for semantics around the recommender — intent mining, item understanding, data refinement, judging — rather than as the online ranker.",
  },
  {
    name: "Intent Modelling",
    slug: "intent-modelling",
    overview_md:
      "Bridging the semantic gap between observed behaviour (content consumption, searches) and underlying user intent — the core content-to-commerce problem shape.",
  },
  {
    name: "Multimodal Recommendation",
    slug: "multimodal-recommendation",
    overview_md:
      "Using images, video, text, and audio as recommendation signal, ideally trained end-to-end against the recommendation objective rather than frozen.",
  },
  {
    name: "Cold Start",
    slug: "cold-start",
    overview_md:
      "New items, sellers, creators, and users with sparse interactions: content/semantic signals, item graphs, and synthetic data.",
  },
  {
    name: "Ranking Architecture",
    slug: "ranking-architecture",
    overview_md:
      "Feature-interaction model design under latency and GPU-utilisation constraints (token mixing, MoE rankers, hardware-aware scaling).",
  },
  {
    name: "Calibration",
    slug: "calibration",
    overview_md:
      "Keeping pCTR/pCVR numerically trustworthy — ranking gains that break probability quality break downstream GMV arithmetic.",
  },
  {
    name: "Reward Optimisation",
    slug: "reward-optimisation",
    overview_md:
      "Preference optimisation and RL-style post-training (RLHF, DPO, RLVR): reward design determines behaviour; loopholes and calibration damage are the classic failure modes.",
  },
  {
    name: "Data Quality and Pretraining",
    slug: "data-quality-pretraining",
    overview_md:
      "Filtering, deduplication, mixture design, and leakage control as first-class scaling levers — for LLMs and equally for recommendation training data.",
  },
  {
    name: "GPU Efficiency",
    slug: "gpu-efficiency",
    overview_md:
      "MFU, memory bandwidth, kernels, and sparse capacity: making model capacity actually run on hardware.",
  },
  {
    name: "Serving and Caching",
    slug: "serving-and-caching",
    overview_md:
      "KV caches, paged allocation, continuous batching, and user-side compute reuse — the systems half of every production model win.",
  },
  {
    name: "Evaluation and Experimentation",
    slug: "evaluation-and-experimentation",
    overview_md:
      "Offline metrics as proxies, segment stability, offline-to-online transfer, and debugging failed forks/backtests.",
  },
];
