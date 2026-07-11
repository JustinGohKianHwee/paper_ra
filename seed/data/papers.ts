import type { PaperSeed, RelationSeed } from "@/seed/data/types";

/**
 * Seed paper library.
 *
 * Provenance rules (see CLAUDE.md):
 *  - All note content is derived from the two source guides in docs/source/,
 *    with chapter/page recorded in `note_source` and per-claim `sources` rows.
 *  - Nothing here is verified against the primary papers; verification status
 *    is `secondary_summary_only` (or `metadata_only` where the guides carry
 *    no substance) and exact numbers carry needs_verification sources.
 *  - arXiv IDs come from the study guide's source index (ch. 21, p. 37) or,
 *    for the three classics, their universally known IDs.
 *  - Reading statuses are honest: owning a study guide is not reading.
 */

const GUIDE = "llm_recsys_tiktok_shop_deep_study_guide.pdf";
const REPORT = "Latest LLM Research for a content-commerce platform Recommendation Engineering.pdf";

// ---------------------------------------------------------------------------
// Foundational sequential recommendation (metadata only — read the originals)
// ---------------------------------------------------------------------------

const foundational: PaperSeed[] = [
  {
    title: "SASRec: Self-Attentive Sequential Recommendation",
    slug: "sasrec",
    organisation: "UC San Diego",
    year: 2018,
    venue: "ICDM 2018",
    arxiv_id: "1808.09781",
    reading_status: "to_read",
    verification_status: "metadata_only",
    priority: 3,
    relevance: 3,
    production_relevance: 2,
    note_source: `${REPORT} (named as living foundation); metadata from public record`,
    topics: ["sequential-recommendation"],
    concepts: [],
    sections: {
      summary:
        "Foundational self-attention model for next-item prediction. The study guides treat it as the baseline that long-history papers (LONGER, HSTU) extend.\n\nTODO: write a real summary after reading the paper.",
      relevance_to_me:
        "Baseline architecture for any sequential-recommendation experiment; the guide's LONGER toy experiment explicitly extends a SASRec/BST repo.",
    },
    sources: [
      {
        source_name: "arXiv listing",
        locator: "arXiv:1808.09781",
        url: "https://arxiv.org/abs/1808.09781",
        needs_verification: false,
      },
    ],
  },
  {
    title:
      "BERT4Rec: Sequential Recommendation with Bidirectional Encoder Representations from Transformer",
    slug: "bert4rec",
    organisation: "Alibaba",
    year: 2019,
    venue: "CIKM 2019",
    arxiv_id: "1904.06690",
    reading_status: "to_read",
    verification_status: "metadata_only",
    priority: 3,
    relevance: 3,
    production_relevance: 2,
    note_source: `${REPORT}, pretraining trends section (p. 7): "BERT4Rec remains the masked-item baseline"`,
    topics: ["sequential-recommendation", "data-quality-pretraining"],
    concepts: [],
    sections: {
      summary:
        "Masked-item (cloze-style) sequential recommendation baseline. Per the report, sequence pretraining now spans three families — sequence masking (BERT4Rec), generative sequential modelling (HSTU/OneRec), and semantic-ID spaces.\n\nTODO: write a real summary after reading the paper.",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "p. 7, recommendation-specific pretraining",
        quote_or_claim: "BERT4Rec remains the masked-item baseline.",
        needs_verification: false,
      },
    ],
  },
  {
    title: "Behavior Sequence Transformer (BST)",
    slug: "behavior-sequence-transformer",
    organisation: "Alibaba",
    year: 2019,
    venue: "DLP-KDD 2019",
    arxiv_id: "1905.06874",
    reading_status: "to_read",
    verification_status: "metadata_only",
    priority: 3,
    relevance: 3,
    production_relevance: 3,
    note_source: "Metadata from public record",
    topics: ["sequential-recommendation", "ranking-architecture"],
    concepts: [],
    sections: {
      summary:
        "Transformer over user behaviour sequences for CTR ranking in Taobao.\n\nTODO: write a real summary after reading the paper.",
    },
    sources: [
      {
        source_name: "arXiv listing",
        locator: "arXiv:1905.06874",
        url: "https://arxiv.org/abs/1905.06874",
        needs_verification: false,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// OneTrans — highest personal relevance; strong EMPTY template (fill manually)
// ---------------------------------------------------------------------------

const TODO_ONETRANS =
  "TODO: complete from your own prior work with this paper and from the primary source. The seed guides contain no OneTrans material, so nothing has been pre-filled — do not trust any generated content here.";

const oneTrans: PaperSeed = {
  title: "OneTrans",
  slug: "onetrans",
  subtitle: "Unified transformer for industrial recommendation (complete metadata manually)",
  organisation: undefined,
  year: undefined,
  reading_status: "revisit",
  verification_status: "metadata_only",
  priority: 5,
  relevance: 5,
  production_relevance: 4,
  needs_revisit: true,
  note_source:
    "No source-guide coverage. You have prior hands-on experience with this work — write these notes yourself.",
  topics: ["sequential-recommendation", "ranking-architecture", "long-user-history"],
  concepts: [],
  sections: {
    summary: TODO_ONETRANS,
    thesis: TODO_ONETRANS,
    problem: TODO_ONETRANS,
    architecture: TODO_ONETRANS,
    mechanism: TODO_ONETRANS,
    equations: TODO_ONETRANS,
    why_it_works: TODO_ONETRANS,
    evaluation: TODO_ONETRANS,
    results: TODO_ONETRANS,
    production_evidence: TODO_ONETRANS,
    serving: TODO_ONETRANS,
    failure_modes: TODO_ONETRANS,
    relevance_to_me:
      "Highest personal relevance in this library — you have previously researched and adapted OneTrans.\n\n" +
      "Reminder: record only public-paper information and your own personal-repo work here. No internal metrics, code, or architecture details.",
    implementation_mapping: TODO_ONETRANS,
    misconceptions: TODO_ONETRANS,
    open_questions:
      "- TODO: what did I never fully verify about OneTrans while adapting it?\n- TODO: which design choices differ between the public paper and what I remember?",
    boss_explanation: TODO_ONETRANS,
    sources_to_verify:
      "- TODO: add the arXiv ID / canonical URL for OneTrans (not present in the seed source index; verify from the primary source before citing).",
  },
  sources: [
    {
      source_name: "TODO: primary paper",
      quote_or_claim: "arXiv ID and all technical details must be added from the primary source.",
      needs_verification: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Long-user-history modelling and memory
// ---------------------------------------------------------------------------

const longHistory: PaperSeed[] = [
  {
    title: "LONGER: Long-sequence transformer for industrial recommendation",
    slug: "longer",
    organisation: "ByteDance",
    year: 2025,
    arxiv_id: "2505.04421",
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 5,
    relevance: 5,
    production_relevance: 5,
    production_evidence:
      "Guide/report: consistent offline and online gains in ByteDance advertising and e-commerce; full deployment in 10+ scenarios at billion-user scale (needs primary verification).",
    note_source: `${GUIDE}, ch. 6 (pp. 13–14); ${REPORT} (pp. 3, 8)`,
    topics: [
      "long-user-history",
      "sequential-recommendation",
      "gpu-efficiency",
      "serving-and-caching",
    ],
    concepts: ["token-merging", "global-summary-tokens", "kv-cache-compression"],
    sections: {
      summary:
        "ByteDance industrial paper on ultra-long user behaviour sequences. Core lesson per the guide: long history helps only when attention pattern, token compression, training memory, and serving are co-designed.",
      thesis:
        "Long user history is a quality lever only when compression, attention pattern, mixed precision, activation memory, and serving latency are solved together.",
      problem:
        "Recommenders need short-term intent *and* long-term preference, but naive transformers over thousands of events are too expensive: attention is quadratic and activations dominate memory.",
      mechanism:
        "- Global token mechanism: special tokens summarise/stabilise long-context attention as anchor points.\n" +
        "- Token-merge module with lightweight InnerTransformers: older/less critical behaviour compressed into fewer tokens.\n" +
        "- Hybrid attention: not every token attends to every other token at full quadratic cost.\n" +
        "- Engineering: mixed precision, activation recomputation, KV-cache serving, unified GPU training/serving framework.",
      intuition:
        "Recent events are high-resolution; older history is lower-resolution memory. Don't throw old history away — compress it so durable interests survive without blowing up memory and latency.",
      why_it_works:
        "- Long-term history captures stable taste (categories, price sensitivity, brands, repeat-purchase cycles); short-term history captures the current shopping mission.\n" +
        "- Compression works if it preserves sufficient statistics ('likes affordable Korean skincare' matters more than each old impression).\n" +
        "- Global tokens give long-range interaction shared summary channels; otherwise attention gets noisy over thousands of events.\n" +
        "- Training and serving must match — an unservable long-history model is not an improvement.",
      results:
        "Reported (per guide; needs primary verification): consistent offline and online gains in advertising and e-commerce services; deployed in more than 10 scenarios serving billion-user scale.",
      production_evidence:
        "Stronger than academic long-context work because it ties architecture to online A/B evidence — but the public paper abstracts internal stack details; treat it as a mechanism guide, not a reproduction recipe.",
      failure_modes:
        "- Longer history can add noise: stale, seasonal, or already-satisfied interests.\n" +
        "- Compression can erase rare but important intent (expensive one-off purchases, gifts).\n" +
        "- Sloppy sequence construction can leak future behaviour through time splits.",
      segment_risks:
        "Online benefit can vary by segment: heavy users may benefit far more than sparse users. Report sparse/medium/heavy buckets, not averages.",
      relevance_to_me:
        "Long histories on a content-commerce platform span watch behaviour, product clicks, searches, carts, purchases, refunds, comments, live-room interactions, follows. Model durable preference separately from the short-term purchase mission. When a fork loses uAUC, inspect long-history representation, recency bias, padding/masking, truncation.",
      experiment_proposal:
        "## Hypothesis\nCompressed older history + full-attention recent window beats recent-only and naive full attention on quality-per-cost.\n\n## Baseline\nRecent-only SASRec; full-history SASRec truncated to max_len.\n\n## Treatment\nCompressed-history SASRec: recent window full attention + older history pooled/merged tokens + global summary token.\n\n## Metrics\nAUC/uAUC, NDCG@K, Recall@K, GPU memory, tokens/sec, p95 latency; segments by sequence length.\n\n## Ablations\nWindow sizes 50 / 200 / 1000 events; quality-vs-memory curves.\n\n## Failure cases to inspect\nGains only for heavy users; older history improving purchases but hurting current-session intent; padding/causal-mask bugs faking long-history gains.",
      misconceptions:
        "Watch for: treating LONGER and LMN as interchangeable (LONGER changes how long histories are compressed/processed *inside* the model; LMN adds a more persistent external memory), and treating a summary token as just another event token (same embedding dimensionality so it enters the same pipeline, but different semantic role and construction).",
      open_questions:
        "- How exactly is the token-merge module trained — jointly end-to-end or with auxiliary objectives?\n- What sequence lengths actually saturate in their ablations?\n- How is the KV cache used at serving time for recommendation (vs LLM-style decoding)?",
      boss_explanation:
        "LONGER shows long user history pays off when history compression, attention pattern, and serving cost are engineered together — not by naively increasing max sequence length.",
      sources_to_verify:
        "- 'Deployed in 10+ scenarios, billion-user scale' — verify against the primary paper.\n- Exact offline/online gain numbers — the guide does not state them; extract from the paper before citing.",
    },
    sources: [
      {
        source_name: GUIDE,
        locator: "ch. 6, pp. 13–14",
        quote_or_claim:
          "Consistent offline and online gains in advertising and e-commerce services at ByteDance; full deployment in more than 10 scenarios serving billion-user scale.",
        needs_verification: true,
      },
      {
        source_name: REPORT,
        locator: "p. 3",
        quote_or_claim:
          "Public arXiv date 2025-05-07; token merge + hybrid attention + training-serving optimisations.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "Large Memory Network for Recommendation",
    slug: "large-memory-network",
    organisation: "ByteDance",
    year: 2025,
    arxiv_id: "2502.05558",
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 4,
    relevance: 5,
    production_relevance: 5,
    production_evidence:
      "Guide/report: offline + online superiority; fully deployed in Douyin E-Commerce Search serving millions of users daily (needs primary verification).",
    note_source: `${GUIDE}, ch. 9 (pp. 19–20); ${REPORT} (pp. 4, 8)`,
    topics: ["user-memory", "long-user-history", "cold-start"],
    concepts: ["memory-banks"],
    sections: {
      summary:
        "Reframes long history as a scalable memory problem: compress and store user behaviour in a large memory block so the model does not forget long-term interests outside its input window.",
      thesis:
        "A recommender should not rely only on the latest fixed window; scalable compressed memory preserves durable shopping preference.",
      problem:
        "Sequential recommenders have fixed input windows, causing forgetting: preferences outside max_seq_len are unusable. LMN targets both long-term personal history and similar-user (spatial) memory.",
      mechanism:
        "- Compress user history into memory blocks instead of feeding every raw behaviour each time.\n" +
        "- Scale the memory block to industrial size with an online deployment strategy.\n" +
        "- Use memory for generalised intent understanding and long-term preference recall.",
      why_it_works:
        "- Memory preserves long-term preferences that fixed windows drop.\n- Compressed memory is cheaper than attention over all history.\n- Similar-user memory generalises sparse behaviour via neighbourhoods/shared intent.",
      results:
        "Reported (per guide; needs primary verification): offline comparison wins, memory scaling experiments, and online A/B gains on Douyin E-Commerce Search; deployed serving millions of users daily.",
      failure_modes:
        "- Stale memory, especially after a purchase satisfies an intent.\n- Retrieval can reinforce popularity or cluster users too coarsely.\n- Privacy, storage, and freshness constraints in production.",
      segment_risks:
        "Memory should help sparse users (fills weak current-session signal) and heavy users differently — segment by history length; watch for reduced discovery from over-amplified dominant categories.",
      relevance_to_me:
        "Persistent memory of brands, sizes, categories, budget, purchase cycles, seller preferences maps directly to e-commerce search/feed surfaces. When uAUC drops after a change, check whether memory features or sequence windows changed.",
      experiment_proposal:
        "## Hypothesis\nA persistent interest memory helps sparse users and repeat-purchase categories most.\n\n## Baseline\nSequence ranker without memory features.\n\n## Treatment\nuser_memory table of EMA embeddings by category/brand/price/action, fed as features.\n\n## Metrics\nAUC/uAUC by user-history-length segment; repeat-purchase categories.\n\n## Ablations\nMemory aging (decay of old purchases; refund-driven trust decay).\n\n## Failure cases to inspect\nRecommending an already-bought category; memory reducing discovery.",
      misconceptions:
        "LMN is not 'LONGER with a bigger window': LONGER compresses history *inside* the model's sequence processing; LMN introduces a persistent/external memory mechanism that outlives the window.",
      boss_explanation:
        "LMN shows e-commerce search benefits from a scalable compressed memory of durable user preference, deployed at Douyin scale.",
      sources_to_verify:
        "- 'Fully deployed in Douyin E-Commerce Search / millions of users daily' — verify.\n- Exact offline/online numbers not in the guides — extract from the paper.",
    },
    sources: [
      {
        source_name: GUIDE,
        locator: "ch. 9, pp. 19–20",
        quote_or_claim:
          "Offline comparison experiments, memory scaling experiments, and online A/B testing on Douyin E-Commerce Search, with deployment serving millions of users daily.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "From 128K to 4M: Efficient training of ultra-long-context LLMs",
    slug: "from-128k-to-4m",
    organisation: "NVIDIA / academic collaborators",
    year: 2025,
    venue: "Findings of ACL 2026 (per report)",
    arxiv_id: "2504.06214",
    reading_status: "to_read",
    verification_status: "secondary_summary_only",
    priority: 4,
    relevance: 3,
    production_relevance: 2,
    note_source: `${GUIDE}, ch. 14 (pp. 29–30); ${REPORT} (p. 5)`,
    topics: ["long-user-history", "data-quality-pretraining"],
    concepts: ["long-context-curriculum"],
    sections: {
      summary:
        "Recipe paper for extending LLM context via continued pretraining. Recsys translation: a model trained on short sequences won't automatically use 1000 events well — you need curriculum, sampling, compression, and retrieval-proving metrics.",
      thesis:
        "Long context requires a training recipe and evaluation — not just a larger max length.",
      mechanism:
        "- Efficient continued pretraining from an aligned/instruct model to longer contexts.\n- Progressive extension (128K → 1M → 2M → 4M) rather than one-shot jumps.\n- Instruction tuning to retain reasoning after adaptation.\n- Ablations on which long-context data actually teaches retrieval.",
      why_it_works:
        "- Long-context ability is a retrieval problem: find relevant old evidence among distractors.\n- Balanced sequence-length distributions protect shorter cases (sparse users, in the recsys analogy).\n- Continued pretraining adapts position/attention behaviour without full retraining.",
      results:
        "Reported (per guide; needs primary verification): extends context windows while maintaining competitive standard-benchmark performance.",
      failure_modes:
        "- Longer context hurts if the model attends to distractors.\n- Must test position sensitivity (use a relevant event at position 900, not just recent ones).\n- Cost: compression/caching usually still necessary.",
      relevance_to_me:
        "Directly informs sequence-length curriculum for user histories: variable-length training, retrieval stress tests, recency-vs-durability ablations; long-history models must not degrade sparse/new users.",
      experiment_proposal:
        "## Hypothesis\nProgressive length curriculum beats fixed short or fixed max-length training for long-history recommendation.\n\n## Baseline\nFixed short context; random crop.\n\n## Treatment\nProgressive longer context; compressed memory variant.\n\n## Metrics\nNeedle-in-user-history retrieval accuracy by position; uAUC by sequence length; NDCG@K; memory/latency.\n\n## Ablations\nRandom vs recency-biased crops.\n\n## Failure cases to inspect\nHeavy-user gains masking sparse-user/cold-start losses.",
      boss_explanation:
        "For recsys, this paper's lesson is that longer user histories must be *trained for* — curriculum, balanced lengths, and retrieval tests — or the extra length is just noise.",
      sources_to_verify:
        "- ACL 2026 Findings acceptance (report claim) — verify.\n- Benchmark preservation claims — verify in paper.",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "p. 5",
        quote_or_claim: "Public arXiv date 2025-04-08, later visible as Findings of ACL 2026.",
        needs_verification: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Generative recommendation and retrieval
// ---------------------------------------------------------------------------

const generative: PaperSeed[] = [
  {
    title: "OneRec: Unified generative recommendation",
    slug: "onerec",
    organisation: "Kuaishou",
    year: 2025,
    arxiv_id: "2502.18965",
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 5,
    relevance: 4,
    production_relevance: 5,
    production_evidence:
      "Report: deployed in Kuaishou's main recommendation scene with a 1.6% watch-time uplift (needs primary verification).",
    note_source: `${GUIDE}, ch. 11 (pp. 23–24); ${REPORT} (pp. 3, 7)`,
    topics: ["generative-retrieval", "semantic-ids", "sequential-recommendation"],
    concepts: ["semantic-ids-concept", "mixture-of-experts", "dpo"],
    sections: {
      summary:
        "Kuaishou's case that generative recommendation is a serious alternative to retrieve-then-rank: encoder-decoder over behaviour sequences, session-wise slate generation, sparse MoE capacity, and DPO-like iterative preference alignment.",
      thesis:
        "A single generative model can produce coherent session/slate recommendations competitive with cascaded retrieval+ranking — with real online evidence.",
      problem:
        "Classic stacks separate retrieval/ranking/reranking; retrieval may discard good candidates early and coherence gets patched late. Can the model directly generate recommended items/slates?",
      mechanism:
        "- Encoder-decoder: encode user behaviour sequence, decode items autoregressively.\n- Sparse MoE scales capacity without proportional FLOPs.\n- Session-wise generation for coherent slates rather than pointwise guesses.\n- Iterative Preference Alignment (DPO-like) on generated results.",
      why_it_works:
        "- Autoregressive generation models dependencies *between* recommended items.\n- Semantic IDs compress the item space into meaningful tokens, making generation tractable.\n- Preference alignment tunes generation toward user preference beyond next-item likelihood.",
      results:
        "Reported (per report; needs primary verification): +1.6% watch-time in Kuaishou's main scene — material for a production system.",
      failure_modes:
        "- Generation latency and beam complexity vs strict serving budgets.\n- Catalog updates: new items need semantic IDs and model awareness.\n- Can hallucinate invalid/unavailable item IDs unless constrained.\n- Slates need business constraints (diversity, trust, merchant exposure).",
      relevance_to_me:
        "Watch-time uplift on short video is a strong analogy but not e-commerce: commerce platforms need GMV/CVR/trust objectives. Near term, most useful as a retrieval stage or candidate generator, not a full rank/rerank replacement.",
      experiment_proposal:
        "## Hypothesis\nSemantic-ID generation beats two-tower retrieval on long-tail coverage at acceptable latency.\n\n## Baseline\nTwo-tower retrieval; popularity retrieval.\n\n## Treatment\nToy sequence→semantic-ID generator over category/brand/price/popularity buckets.\n\n## Metrics\nRecall@K, NDCG, long-tail coverage, invalid-ID rate, latency.\n\n## Ablations\nOutcome conditioning: clicks vs purchases vs GMV.\n\n## Failure cases to inspect\nInvalid/out-of-stock generations; semantic collapse reducing diversity.",
      boss_explanation:
        "OneRec is the strongest public evidence that generative recommendation can win online at scale — while showing the costs: semantic-ID maintenance, generation latency, and preference-alignment machinery.",
      sources_to_verify:
        "- '+1.6% watch-time in Kuaishou main scene' — verify against the primary paper.\n- MoE/IPA implementation details — guide-level only.",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "pp. 3, 7 (evidence table)",
        quote_or_claim:
          "OneRec: +1.6% watch-time, Kuaishou main recommendation scene, real A/B evidence.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "HSTU: Actions Speak Louder than Words (Generative Recommenders)",
    slug: "hstu-generative-recommenders",
    organisation: "Meta",
    year: 2024,
    arxiv_id: "2402.17152",
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 4,
    relevance: 4,
    production_relevance: 5,
    production_evidence:
      "Report: up to 12.4% online metric improvement on a large platform with billions of users (needs primary verification).",
    note_source: `${GUIDE}, ch. 11 (pp. 23–24); ${REPORT} (pp. 4, 8)`,
    topics: ["generative-retrieval", "sequential-recommendation", "gpu-efficiency"],
    concepts: [],
    sections: {
      summary:
        "Meta's reformulation of recommendation as sequential transduction over user actions, with the HSTU architecture designed for high-cardinality, non-stationary streaming data. Foundational for the 2025–2026 generative-recommendation wave.",
      thesis:
        "Recommendation can be posed as generative sequential transduction at trillion-parameter scale, with architecture built for streaming recommendation data rather than text.",
      mechanism:
        "- Flatten user action history into sequential transduction (alternating item/action tokens).\n- HSTU architecture for high-cardinality, non-stationary streams.\n- Claims large speedups over FlashAttention2-based transformer baselines on long sequences.",
      results:
        "Reported (per guide/report; needs primary verification): large offline NDCG gains, substantial long-sequence speedups, online deployment across multiple surfaces, up to 12.4% online improvement.",
      failure_modes:
        "Same family risks as OneRec/PinRec: serving latency of generation, catalog updates, invalid generations, business constraints on slates.",
      relevance_to_me:
        "The 'alternating item-action tokens' framing transfers directly to mixed video/search/cart/purchase histories.",
      experiment_proposal:
        "## Hypothesis\nAction-conditioned token sequences beat item-only sequences.\n\n## Baseline\nStandard SASRec item-only sequence.\n\n## Treatment\nFlattened alternating item-action tokens.\n\n## Metrics\nNDCG@K, Recall@K, per-action-type performance.\n\n## Ablations\nAction vocabulary granularity.\n\n## Failure cases to inspect\nAction tokens diluting sequence length budget for sparse users.",
      boss_explanation:
        "HSTU showed that generative sequence modelling of raw user *actions* can beat classic recommenders online at extreme scale — the paper that made generative recommenders credible.",
      sources_to_verify:
        "- 'Up to 12.4% online improvement' and speedup-vs-FlashAttention2 claims — verify in paper.",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "p. 8 (evidence table)",
        quote_or_claim:
          "HSTU / Generative Recommenders: up to 12.4% online metric improvement; large internet platform with billions of users.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "PinRec: Outcome-conditioned generative retrieval at Pinterest",
    slug: "pinrec",
    organisation: "Pinterest",
    year: 2025,
    arxiv_id: "2504.10507",
    reading_status: "to_read",
    verification_status: "secondary_summary_only",
    priority: 4,
    relevance: 3,
    production_relevance: 4,
    production_evidence:
      "Report: sitewide positive impact including higher clicks and search saves (needs primary verification).",
    note_source: `${GUIDE}, ch. 11 (pp. 23–24); ${REPORT} (pp. 4, 9)`,
    topics: ["generative-retrieval", "semantic-ids"],
    concepts: ["semantic-ids-concept", "outcome-conditioning"],
    sections: {
      summary:
        "One of the clearest industrial reports on generative retrieval at scale, notable for outcome-conditioned generation (steer retrieval toward clicks vs saves) and multi-token generation for diversity.",
      mechanism:
        "- Outcome-conditioned generative retrieval: specify outcome goals to control behaviour.\n- Multi-token generation improves diversity and output flexibility.\n- Competes against strong two-tower baselines at industry scale.",
      why_it_works:
        "Outcome conditioning gives one model a knob across business objectives instead of a fixed retriever per objective.",
      results:
        "Reported (per report; needs primary verification): sitewide gains in clicks/search-saves with explicit attention to serving efficiency.",
      failure_modes:
        "Outcome conditioning may merely shift popularity or price bias; check whether the knob changes *what* is retrieved or just re-weights the same head candidates.",
      relevance_to_me:
        "Outcome conditioning maps to click vs purchase vs GMV steering for commerce retrieval — precision/diversity trade-offs per objective.",
      boss_explanation:
        "PinRec shows generative retrieval working sitewide in production, with a practical twist: condition generation on the business outcome you want.",
      sources_to_verify: "- Sitewide click/search-save gains — verify in paper.",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "p. 9 (evidence table)",
        quote_or_claim: "PinRec: sitewide click/search-save gains, Pinterest multiple surfaces.",
        needs_verification: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// LLM-enhanced recommendation and intent
// ---------------------------------------------------------------------------

const llmIntent: PaperSeed[] = [
  {
    title: "Atomic Intent Reasoning (AIR)",
    slug: "atomic-intent-reasoning",
    organisation: "Kuaishou / academic collaborators",
    year: 2026,
    arxiv_id: "2606.10357",
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 5,
    relevance: 5,
    production_relevance: 5,
    production_evidence:
      "Report: ~400× inference acceleration and +3.446% GMV in Kuaishou e-commerce cross-domain recommendation A/B (needs primary verification; brand-new preprint).",
    note_source: `${GUIDE}, ch. 12 (pp. 25–26); ${REPORT} (pp. 3, 8)`,
    topics: ["intent-modelling", "llm-enhanced-recommendation", "cold-start"],
    concepts: ["offline-llm-intent-mining"],
    sections: {
      summary:
        "The most directly content-to-commerce paper in the set: cross-domain content-to-commerce recommendation that pushes expensive LLM semantics offline (atomic intent representations) and composes them cheaply online.",
      thesis:
        "Mine atomic intents offline with LLMs, retrieve and compose them online — semantic quality without online LLM latency.",
      problem:
        "Content-to-commerce platforms have a semantic gap: watching content doesn't directly reveal purchase intent; behaviour is huge, noisy, cross-domain; online LLM inference is too slow for millisecond ranking.",
      mechanism:
        "- LLMs offline derive atomic intent representations from content-side and commerce-side behaviour.\n- Online: retrieve and compose intent representations instead of running the LLM.\n- Atomic decomposition reduces noise: broad behaviour → smaller reusable semantic units.",
      why_it_works:
        "- LLMs excel at semantic abstraction ('budget skincare for sensitive skin', 'gift ideas for new home').\n- Intent doesn't need recomputing per request: precompute, cache, retrieve, compose.",
      results:
        "Reported (per guide/report; needs primary verification): public-dataset SOTA; large-scale Kuaishou e-commerce A/B; ~400× inference acceleration; +3.446% GMV.",
      failure_modes:
        "- Intents can be wrong, stale, culturally biased, or too generic.\n- Offline intent features need freshness management — a mission can change within minutes.\n- Brand-new preprint, not yet peer-reviewed.",
      relevance_to_me:
        "This *is* the content-to-commerce problem shape: translate video consumption into product intent. Intent features can support retrieval, ranking, cold-start mapping, tagging, seller tools, and evaluation.",
      experiment_proposal:
        "## Hypothesis\nOffline-mined intent tags improve cross-domain cold-start ranking.\n\n## Baseline\nRanker without intent features.\n\n## Treatment\nRule-based/small-model 'LLM surrogate' maps content behaviour to atomic intents (category, use-case, budget, urgency, trust sensitivity) used as features.\n\n## Metrics\nCross-domain AUC/uAUC, GMV-weighted NDCG, intent coverage, latency.\n\n## Ablations\nIntent freshness/refresh policies under intent shift.\n\n## Failure cases to inspect\nMissing intent coverage by category/language; filter-bubble reinforcement; calibration damage.",
      boss_explanation:
        "AIR is the clearest published recipe for content-to-commerce: LLM reasoning offline into atomic intents, fast composition online — with claimed GMV evidence at Kuaishou.",
      sources_to_verify:
        "- '+3.446% GMV' and '~400× acceleration' — exact numbers, verify in the primary paper before ever citing.\n- Public-dataset SOTA claims.",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "pp. 3, 8 (evidence table)",
        quote_or_claim:
          "Atomic Intent Reasoning: +3.446% GMV, ~400× inference acceleration, Kuaishou e-commerce cross-domain, real A/B evidence.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "RecGPT",
    slug: "recgpt",
    organisation: "Alibaba (Taobao)",
    year: 2025,
    arxiv_id: "2507.22879",
    reading_status: "to_read",
    verification_status: "secondary_summary_only",
    priority: 3,
    relevance: 4,
    production_relevance: 4,
    production_evidence:
      "Guide: reports full deployment on Taobao with online improvements across users, merchants, platform outcomes (needs primary verification).",
    note_source: `${GUIDE}, ch. 12 (pp. 25–26)`,
    topics: ["llm-enhanced-recommendation", "intent-modelling"],
    concepts: ["offline-llm-intent-mining"],
    sections: {
      summary:
        "Taobao's move from log-fitting to intent-centric recommendation: mine user interests, improve item retrieval, generate explanations; multi-stage training with reasoning-enhanced pre-alignment, self-training, and Human-LLM cooperative judges.",
      results:
        "Reported (per guide; needs primary verification): full Taobao deployment with online improvements across users, merchants, and platform outcomes.",
      failure_modes:
        "Agent-based systems are harder to debug than deterministic feature pipelines; intent explanations don't guarantee calibrated CTR/CVR.",
      relevance_to_me:
        "Template for intent-centric e-commerce recommendation at a Taobao-scale platform; boss-facing narrative: LLMs as semantic feature generators and judges, not online rankers.",
      boss_explanation:
        "RecGPT is Alibaba's production case for intent-centric recommendation: LLMs mine interests and judge quality offline while the fast stack serves.",
      sources_to_verify: "- Deployment scope and online gains — verify in the primary paper.",
    },
    sources: [
      {
        source_name: GUIDE,
        locator: "ch. 12, pp. 25–26",
        quote_or_claim:
          "RecGPT reports full deployment on Taobao with online improvements across users, merchants, and platform outcomes.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "RecGPT-V2",
    slug: "recgpt-v2",
    organisation: "Alibaba (Taobao)",
    year: 2025,
    arxiv_id: "2512.14503",
    reading_status: "to_read",
    verification_status: "secondary_summary_only",
    priority: 3,
    relevance: 4,
    production_relevance: 4,
    needs_revisit: true,
    note_source: `${GUIDE}, ch. 12 (pp. 25–26). Caution: the report (p. 5) could not verify strong primary-source anchors for RecGPT-V2 — verify the official report before trusting details.`,
    topics: ["llm-enhanced-recommendation", "intent-modelling"],
    concepts: ["offline-llm-intent-mining"],
    sections: {
      summary:
        "Successor to RecGPT: hierarchical multi-agent intent reasoning, hybrid representation compression, meta-prompting, constrained RL, and agent-as-judge evaluation.",
      results:
        "Reported (per guide; needs primary verification): GPU consumption reduction, exclusive recall and tag/explanation improvements, online A/B gains (CTR/IPV/TV/NER) in Taobao.",
      sources_to_verify:
        "- The deep-research report explicitly flagged that it could not verify a strong primary source for RecGPT-V2 — confirm the official report exists and matches these claims before citing anything.",
      boss_explanation:
        "Claimed second-generation intent-centric stack at Taobao with efficiency and judge improvements — treat as unverified until the primary report is checked.",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "p. 5",
        quote_or_claim:
          "RecGPT-V2 and RecGPT-Mobile did not surface as strong primary-source anchors in the highest-confidence set.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "RecGPT-Mobile",
    slug: "recgpt-mobile",
    organisation: "Alibaba (Taobao)",
    year: 2026,
    arxiv_id: "2605.04726",
    reading_status: "to_read",
    verification_status: "secondary_summary_only",
    priority: 2,
    relevance: 3,
    production_relevance: 3,
    needs_revisit: true,
    note_source: `${GUIDE}, ch. 12 (pp. 25–26). Same primary-source caution as RecGPT-V2.`,
    topics: ["llm-enhanced-recommendation", "intent-modelling"],
    concepts: ["offline-llm-intent-mining"],
    sections: {
      summary:
        "Targets next-query/user-intent understanding in Taobao feed with a lightweight on-device LLM intent agent — reduces cloud inference cost and captures rapidly changing intent closer to the user.",
      results:
        "Reported (per guide; needs primary verification): offline and online improvements for mobile next-query/intention understanding.",
      sources_to_verify:
        "- Primary-source anchor flagged as unverified by the report — confirm before citing.",
      boss_explanation:
        "The on-device variant of the intent-mining idea: move part of intent inference to the phone for freshness and cost.",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "p. 5",
        quote_or_claim:
          "RecGPT-V2 and RecGPT-Mobile did not surface as strong primary-source anchors in the highest-confidence set.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "ItemRAG: Item-based retrieval-augmented generation for LLM recommendation",
    slug: "itemrag",
    organisation: "Academic / industry e-commerce",
    year: 2025,
    arxiv_id: "2511.15141",
    reading_status: "to_read",
    verification_status: "secondary_summary_only",
    priority: 3,
    relevance: 4,
    production_relevance: 2,
    note_source: `${GUIDE}, ch. 13 (pp. 27–28)`,
    topics: ["llm-enhanced-recommendation", "cold-start"],
    concepts: [],
    sections: {
      summary:
        "Retrieves relevant *items* (from item-item co-purchase histories) rather than similar users, combining semantic similarity with co-purchase frequency to give the LLM useful context — targets zero-shot and cold-start recommendation.",
      results:
        "Reported (per guide; needs primary verification): up to 43% HitRatio@1 improvement over zero-shot LLM recommender settings; stronger under cold-start items.",
      failure_modes:
        "Co-purchase is not always substitutable preference (complements vs substitutes behave differently); HitRatio gains may not translate to GMV for low-margin/out-of-stock/low-trust items.",
      relevance_to_me:
        "Maps to product-to-product retrieval: similar products, complements, bundles, post-purchase recommendations — new products, new sellers, cross-border SKUs.",
      boss_explanation:
        "ItemRAG shows a low-risk LLM role: give the LLM an item-graph context (co-purchases + semantics) to fix cold-start retrieval, no ranking-stack surgery required.",
      sources_to_verify: "- '43% HitRatio@1' — verify in paper.",
    },
    sources: [
      {
        source_name: GUIDE,
        locator: "ch. 13, pp. 27–28",
        quote_or_claim:
          "ItemRAG reports up to 43% HitRatio@1 improvement over zero-shot LLM recommender settings.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "LLM-I2I: LLM-enhanced item-to-item recommendation",
    slug: "llm-i2i",
    organisation: "Industry e-commerce (cross-border platform)",
    year: 2025,
    arxiv_id: "2512.21595",
    reading_status: "to_read",
    verification_status: "secondary_summary_only",
    priority: 3,
    relevance: 4,
    production_relevance: 4,
    production_evidence:
      "Guide: deployment on a large-scale cross-border e-commerce platform with recall-number and GMV gains (needs primary verification).",
    note_source: `${GUIDE}, ch. 13 (pp. 27–28)`,
    topics: ["llm-enhanced-recommendation", "cold-start"],
    concepts: [],
    sections: {
      summary:
        "LLM generator synthesises user-item interactions for long-tail items; LLM discriminator filters noisy real and synthetic interactions; a small scalable I2I model trains on the refined data and serves online — LLM improves the data, cheap model serves.",
      why_it_works:
        "Semantic similarity fills sparse-interaction gaps; synthetic data helps *only if filtered* — unfiltered hallucination injects false preference and damages calibration; small-model distillation is the production trick.",
      results:
        "Reported (per guide; needs primary verification): industry + academic evaluations; deployed on a cross-border e-commerce platform with recall and GMV gains.",
      failure_modes:
        "Synthetic interactions can amplify stereotypes, popularity, or wrong complements; check synthetic-data precision manually — false positives poison long-tail models.",
      relevance_to_me:
        "LLM-as-data-refiner is safer than LLM-as-online-ranker for high-QPS systems; directly applicable to long-tail product discovery and cross-border SKUs.",
      boss_explanation:
        "LLM-I2I: use LLMs to generate and filter training data for long-tail items, then serve a cheap item-to-item model — a production-safe LLM pattern with claimed GMV evidence.",
      sources_to_verify: "- Deployment claims and recall/GMV gains — verify in paper.",
    },
    sources: [
      {
        source_name: GUIDE,
        locator: "ch. 13, pp. 27–28",
        quote_or_claim:
          "LLM-I2I reports deployment on a large-scale cross-border e-commerce platform with recall-number and GMV gains.",
        needs_verification: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Multimodal recommendation
// ---------------------------------------------------------------------------

const multimodal: PaperSeed[] = [
  {
    title: "LEMUR: End-to-end multimodal recommendation",
    slug: "lemur",
    organisation: "ByteDance",
    year: 2025,
    arxiv_id: "2511.10962",
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 4,
    relevance: 5,
    production_relevance: 5,
    production_evidence:
      "Guide/report: deployed in Douyin Search with +0.81% QAUC and reduced query-change-rate decay; offline gains in Douyin Ads (needs primary verification).",
    note_source: `${GUIDE}, ch. 10 (pp. 21–22); ${REPORT} (pp. 4, 8)`,
    topics: ["multimodal-recommendation", "cold-start"],
    concepts: ["memory-banks"],
    sections: {
      summary:
        "ByteDance's case that end-to-end multimodal recommendation from raw inputs beats frozen-pretrain-then-plug-in pipelines in industrial settings, with a memory bank amortising multimodal sequence computation and real-time parameter updates.",
      thesis:
        "Multimodal product/video understanding should be optimised for recommendation outcomes, not generic image-text similarity.",
      problem:
        "ID-based recommenders struggle with cold start; frozen multimodal embeddings are misaligned with CTR/CVR/GMV — good generic semantics ≠ purchase intent ('beautiful but expensive' vs 'buyable and trusted').",
      mechanism:
        "- Train multimodal and recommendation components end-to-end from raw data.\n- Construct multimodal sequential user representations from histories.\n- Memory bank incrementally stores historical multimodal representations to cut sequence compute.\n- Real-time parameter updates keep representations fresh.",
      why_it_works:
        "- End-to-end training aligns the representation with the target objective.\n- Multimodal signals help cold start: new products lack clicks but have image/title/category/price/video evidence.\n- Memory banks amortise expensive multimodal encoding.",
      results:
        "Reported (per guide/report; needs primary verification): Douyin Search deployment, +0.81% QAUC, lower query-change-rate decay; Douyin Advertisement offline gains.",
      failure_modes:
        "- End-to-end multimodal training is expensive and operationally hard.\n- Visual features learn spurious shortcuts (background, lighting, creator style) rather than product value.\n- Cold-start gains may not hold for misleading images or poor seller trust.",
      segment_risks:
        "Check whether multimodal features help new items but hurt mature items; inspect cold-start/new-product segments separately.",
      relevance_to_me:
        "Content-commerce platforms are multimodal by default: users buy after watching videos, reading comments, seeing product cards, evaluating creators/sellers. The chain to model: video demonstration → product attributes → user intent → conversion probability.",
      experiment_proposal:
        "## Hypothesis\nJointly trained multimodal projections beat frozen embeddings on cold-start items.\n\n## Baseline\nID-only ranker; frozen multimodal embedding ranker.\n\n## Treatment\nJointly trained multimodal projection with the recommendation loss.\n\n## Metrics\nCold-start AUC/uAUC, NDCG@K, long-tail recall, ECE by item age.\n\n## Ablations\nPer-modality contribution (text/image/video-caption).\n\n## Failure cases to inspect\nAppearance overweighted vs seller trust/refund risk; train/serve feature availability online.",
      boss_explanation:
        "LEMUR argues the frozen-embedding era is ending for industrial multimodal recsys: train the multimodal encoder *with* the recommendation objective and cold start improves for real.",
      sources_to_verify:
        "- '+0.81% QAUC, reduced query-change-rate decay' — verify in paper.\n- Memory-bank and real-time update details.",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "pp. 4, 8 (evidence table)",
        quote_or_claim: "LEMUR: +0.81% QAUC, lower query-change-rate decay, Douyin Search and Ads.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "Gemma 3 Technical Report",
    slug: "gemma-3",
    organisation: "Google DeepMind",
    year: 2025,
    arxiv_id: "2503.19786",
    reading_status: "to_read",
    verification_status: "secondary_summary_only",
    priority: 2,
    relevance: 2,
    production_relevance: 1,
    note_source: `${GUIDE}, ch. 10 (pp. 21–22); ${REPORT} (p. 5, Tier Two)`,
    topics: ["multimodal-recommendation", "gpu-efficiency", "serving-and-caching"],
    concepts: ["kv-cache-compression"],
    sections: {
      summary:
        "Not a recommender paper: an open small-to-mid multimodal, multilingual, long-context model family. Relevant for local/global attention choices that limit KV-cache memory growth at long context — serving-efficient multimodal design.",
      relevance_to_me:
        "Reference for lightweight multimodal encoders and KV-cache-aware architecture when considering nearline multimodal features; multilingual capability matters for SEA markets.",
      boss_explanation:
        "Gemma 3 is the open reference for efficient multimodal/long-context model design — background reading, not an implementation guide for recsys.",
      sources_to_verify:
        "- Architecture details (local/global attention ratios) — verify in report.",
    },
    sources: [
      {
        source_name: GUIDE,
        locator: "ch. 10, pp. 21–22",
        quote_or_claim:
          "Gemma 3 uses local/global attention choices to reduce KV-cache memory growth for long context.",
        needs_verification: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Ranking and serving
// ---------------------------------------------------------------------------

const rankingServing: PaperSeed[] = [
  {
    title: "RankMixer: Hardware-aware ranking architecture",
    slug: "rankmixer",
    organisation: "ByteDance",
    year: 2025,
    arxiv_id: "2507.15551",
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 4,
    relevance: 5,
    production_relevance: 5,
    production_evidence:
      "Guide/report: MFU 4.5% → 45%, ~100× parameter scale-up at roughly constant latency, online gains in Douyin feed (+0.3% active days, +1.08% app duration) (needs primary verification).",
    note_source: `${GUIDE}, ch. 7 (pp. 15–16); ${REPORT} (pp. 4, 8)`,
    topics: ["ranking-architecture", "gpu-efficiency"],
    concepts: ["mixture-of-experts"],
    sections: {
      summary:
        "GPU-era ranking design: replace diverse handcrafted low-MFU feature-cross modules with a unified, shape-regular architecture (multi-head token mixing + per-token FFNs), scaling to large dense and sparse-MoE variants at stable latency.",
      thesis:
        "Scaling ranking models is not adding parameters — it is designing feature interaction so GPUs are actually utilised under production latency.",
      problem:
        "Industrial rankers score many candidates under strict latency/QPS; CPU-era feature-interaction modules have low model-FLOPs-utilisation and bottleneck scaling even when accurate.",
      mechanism:
        "- Unified feature-interaction architecture replacing irregular handcrafted modules.\n- Multi-head token mixing instead of full quadratic self-attention.\n- Per-token FFNs for distinct feature subspaces.\n- Dense → sparse-MoE scaling while holding serving latency.",
      why_it_works:
        "GPU efficiency needs dense, parallel, shape-regular compute; token mixing lets feature tokens interact at sub-attention cost; a unified architecture reduces engineering fragmentation.",
      results:
        "Reported (per guide/report; needs primary verification): MFU 4.5% → 45%; 100× parameter scale-up at roughly constant inference latency; online A/B gains in Douyin feed ranking (+0.3% user active days, +1.08% app duration).",
      failure_modes:
        "- Bigger rankers can overfit logging bias/popularity.\n- Hardware efficiency can hide small-segment quality regressions.\n- Guardrails: feature freshness, calibration, business constraints, train/serve consistency.",
      relevance_to_me:
        "Commerce ranking needs rich feature crossing (user behaviour × product metadata × seller × price/promotion × content embeddings × context). Read AUC/uAUC, calibration, latency, and GPU utilisation together when debugging.",
      experiment_proposal:
        "## Hypothesis\nA token-mixing block beats a concatenation MLP at matched latency.\n\n## Baseline\nMLP ranker; cross-network; mini-transformer.\n\n## Treatment\nTokenized feature ranker: each feature field an embedding token + token-mixing block before CTR/CVR heads.\n\n## Metrics\nuAUC, GMV-weighted NDCG, calibration, latency, parameter count, rough MFU proxy.\n\n## Ablations\nToken count / mixing depth.\n\n## Failure cases to inspect\nCold-start/long-tail/high-price/new-seller segments; overconfidence after richer interactions.",
      boss_explanation:
        "RankMixer is ByteDance's evidence that ranking capacity should be scaled with GPU-shaped architecture — 100× parameters at flat latency by fixing MFU first.",
      sources_to_verify:
        "- 'MFU 4.5%→45%', '100× params ~constant latency', '+0.3% active days / +1.08% duration' — verify all in the primary paper.",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "pp. 4, 8 (evidence table)",
        quote_or_claim:
          "RankMixer: MFU 4.5%→45%; +0.3% active days, +1.08% app duration; Douyin feed ranking; real A/B evidence.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "UG-Separation: Reusable user-side computation for ranking",
    slug: "ug-separation",
    organisation: "ByteDance",
    year: 2026,
    arxiv_id: "2602.10455",
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 4,
    relevance: 5,
    production_relevance: 5,
    production_evidence:
      "Report: up to 20% latency reduction with stable online metrics across Douyin feed, ads, and other ByteDance scenarios (needs primary verification).",
    note_source: `${GUIDE}, ch. 8 (pp. 17–18); ${REPORT} (pp. 4, 8)`,
    topics: ["serving-and-caching", "ranking-architecture", "gpu-efficiency"],
    concepts: ["ug-separation-concept"],
    sections: {
      summary:
        "Solves a concrete serving pain point: user-side representation is recomputed for every candidate in naive user-item rankers. Compute it once, cache it, reuse it across hundreds of candidates, and control the approximation error.",
      thesis:
        "Recommender serving gains a lot by amortising user-side sequence compute across candidate items without changing the product objective.",
      mechanism:
        "- Separate user-side computation from item-side/cross computation.\n- Precompute or cache user representation per request or nearline window.\n- Reuse across candidates; run cheaper item interaction/scoring.\n- Control approximation error to keep quality stable.",
      why_it_works:
        "Shared computation amortises over many candidates; caching works when user state changes slower than request frequency; safe when the user encoder captures broad preference and the scorer captures item-specific interaction.",
      results:
        "Reported (per report; needs primary verification): up to 20% latency reduction without hurting online metrics.",
      failure_modes:
        "- Too much interaction moved out of the candidate path loses fine-grained matching.\n- Cached state goes stale after in-session clicks/searches/carts.\n- Train/serve mismatch: training computes fresh encodings, serving reuses cached ones.",
      relevance_to_me:
        "User representations from watch/click/cart/purchase sequences are expensive; reuse across candidate products is natural. When offline wins fail online, check whether serving approximates something offline computed exactly.",
      experiment_proposal:
        "## Hypothesis\nCached user encodings preserve ranking quality at large latency savings until staleness bites.\n\n## Baseline\nPairwise ranker encoding user sequence per user-item pair.\n\n## Treatment\nSeparated ranker: encode user once, score N items.\n\n## Metrics\nScore correlation, top-K overlap, uAUC/NDCG, latency/memory at N=100/500/1000.\n\n## Ablations\nCache refresh policies under mid-session behaviour updates.\n\n## Failure cases to inspect\nFast-changing sessions; long-tail items losing item-specific interaction capacity.",
      boss_explanation:
        "UG-Separation: compute the user once, score many items — up to 20% claimed latency reduction with flat online metrics, purely from serving structure.",
      sources_to_verify:
        "- 'Up to 20% latency reduction, stable online metrics' — verify in paper (report treats the arXiv source as authority).",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "pp. 4, 8 (evidence table)",
        quote_or_claim:
          "UG-Separation: up to 20% latency reduction with stable online metrics; Douyin feed, ads, other ByteDance scenarios.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "Efficient Memory Management for LLM Serving with PagedAttention (vLLM)",
    slug: "vllm-pagedattention",
    organisation: "UC Berkeley / vLLM team",
    year: 2023,
    arxiv_id: "2309.06180",
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 5,
    relevance: 4,
    production_relevance: 5,
    production_evidence:
      "Very widely adopted serving system; guide reports 2–4× throughput improvement at similar latency vs prior systems in evaluated settings (needs primary verification).",
    note_source: `${GUIDE}, ch. 5 (pp. 11–12); ${REPORT} (p. 3)`,
    topics: ["serving-and-caching", "gpu-efficiency"],
    concepts: ["pagedattention", "kv-cache-compression"],
    sections: {
      summary:
        "OS-style paging for the KV cache: fixed-size blocks instead of contiguous allocation, enabling continuous batching and prefix sharing. LLM serving is often KV-cache and scheduling limited, not compute limited.",
      thesis:
        "Memory layout and reuse are product features: paging the KV cache turns wasted memory into throughput.",
      mechanism:
        "- KV cache as virtual memory: fixed-size blocks/pages, no contiguous allocation requirement.\n- Continuous batching: add/remove requests dynamically.\n- Prefix KV-block sharing across overlapping prompts.",
      why_it_works:
        "KV cache grows with batch × seq × layers × heads × head_dim; requests vary in length and finish asynchronously — naive allocation fragments memory and caps batch size.",
      results:
        "Reported (per guide; needs primary verification): 2–4× throughput improvement at similar latency vs prior serving systems in evaluated settings; extremely broad adoption.",
      failure_modes:
        "Systems wins are workload-specific: request-length distribution changes everything. Serving throughput ≠ downstream ranking quality.",
      relevance_to_me:
        "Table stakes for any LLM-assisted seller tool, shopping assistant, or offline labelling pipeline; the recsys analogue of the bottleneck is feature lookup, embedding tables, user-side recomputation, candidate fanout.",
      experiment_proposal:
        "## Hypothesis\nPaged allocation materially beats naive batching on throughput-per-GPU-dollar for a toy assistant/reranker service.\n\n## Baseline\nNaive contiguous allocation batching simulator.\n\n## Treatment\nBlock/paged allocation with variable request lengths.\n\n## Metrics\np50/p95 latency, throughput, memory ceiling, degradation when context doubles.\n\n## Ablations\nRequest-length distributions.\n\n## Failure cases to inspect\nPrefill vs decode timing conflated; mean throughput hiding p99.",
      boss_explanation:
        "vLLM's PagedAttention made KV-cache memory management the centre of LLM serving — the reason 'how you batch' matters as much as 'what model you run'.",
      sources_to_verify: "- '2–4× throughput at similar latency' — verify in paper.",
    },
    sources: [
      {
        source_name: GUIDE,
        locator: "ch. 5, pp. 11–12",
        quote_or_claim:
          "PagedAttention/vLLM reports 2–4× throughput improvement at similar latency versus prior serving systems.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "FlashInfer: Efficient attention kernels for LLM serving",
    slug: "flashinfer",
    organisation: "University of Washington / industry collaborators",
    year: 2025,
    arxiv_id: "2501.01005",
    reading_status: "to_read",
    verification_status: "secondary_summary_only",
    priority: 3,
    relevance: 3,
    production_relevance: 4,
    note_source: `${GUIDE}, ch. 5 (pp. 11–12); ${REPORT} (p. 3)`,
    topics: ["serving-and-caching", "gpu-efficiency"],
    concepts: ["kv-cache-compression"],
    sections: {
      summary:
        "Optimised attention kernels and scheduling for diverse inference workloads (prefill, decode, long context, batch variability), with block-sparse/composable KV-cache formats; integrated into major serving stacks.",
      results:
        "Reported (per guide; needs primary verification): large inter-token latency reductions and long-context/parallel-generation improvements; integration into vLLM/SGLang/MLC-style stacks.",
      failure_modes:
        "Exact gains depend heavily on hardware, model, prompt lengths, batch mix, kernel backend — benchmark end-to-end latency, not kernel speed.",
      relevance_to_me:
        "Determines whether long-context inference is affordable for LLM-judge pipelines, seller copilots, long-history intent analysers.",
      boss_explanation:
        "FlashInfer shows kernels and scheduling decide whether long-context serving is economical — measure end-to-end, not kernel microbenchmarks.",
      sources_to_verify: "- Latency-reduction claims and integration list — verify in paper.",
    },
    sources: [
      {
        source_name: GUIDE,
        locator: "ch. 5, pp. 11–12",
        quote_or_claim:
          "FlashInfer reports large inter-token latency reductions and improvements for long-context and parallel generation workloads.",
        needs_verification: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Pretraining, model architecture, post-training, calibration
// ---------------------------------------------------------------------------

const pretrainingPost: PaperSeed[] = [
  {
    title: "Qwen3 Technical Report",
    slug: "qwen3",
    organisation: "Qwen Team / Alibaba Cloud",
    year: 2025,
    arxiv_id: "2505.09388",
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 4,
    relevance: 3,
    production_relevance: 2,
    note_source: `${GUIDE}, ch. 1 (pp. 3–4); ${REPORT} (p. 2)`,
    topics: ["data-quality-pretraining", "gpu-efficiency"],
    concepts: ["mixture-of-experts"],
    sections: {
      summary:
        "Open frontier recipe: dense + MoE variants, multilinguality, and explicit thinking/non-thinking operating modes. The transferable idea is controllable reasoning cost — one family exposing cheap and expensive inference modes.",
      thesis:
        "Frontier models are now designed for controllable reasoning cost, not only raw quality — inference is a resource-allocation decision.",
      mechanism:
        "- Dense and MoE variants across sizes.\n- Thinking vs non-thinking modes; thinking budget as a knob.\n- Distillation from flagship models into cheaper deployments.",
      why_it_works:
        "Sparse capacity works because not every request needs all experts; a thinking budget works because difficulty is heterogeneous; distillation moves expensive-model value into cheap online models.",
      results:
        "Broad first-party benchmark coverage across reasoning/coding/multilingual/agent tasks — treat as evidence of controllable compute, not of recsys transfer.",
      failure_modes:
        "Thinking mode raises latency/cost — unacceptable for every recsys request; benchmark ability ≠ calibrated probabilities or ranking gains.",
      relevance_to_me:
        "Cascade thinking: retrieval → rank → rerank → optional expensive semantic rerank for ambiguous/high-value/high-risk traffic slices only. Use expensive LLM inference offline (annotation, intent clusters, eval labels), cheap students online.",
      experiment_proposal:
        "## Hypothesis\nUncertainty-triggered expensive reranking beats always-cheap and always-expensive at matched cost.\n\n## Baseline\nAlways cheap; always expensive.\n\n## Treatment\nBudget-aware reranker: expensive scorer only for high-uncertainty or high-GMV candidates.\n\n## Metrics\nNDCG@K, AUC/uAUC, ECE, latency-per-request, escalation fraction.\n\n## Ablations\nUncertainty-triggered vs GMV-triggered escalation.\n\n## Failure cases to inspect\nSegment-level uAUC where escalation triggers; calibration damage; unstable triggers selecting noise.",
      boss_explanation:
        "Qwen3's practical lesson is adaptive compute: cheap models for most traffic, expensive reasoning only where ambiguity, value, or risk justifies it.",
      sources_to_verify:
        "- Benchmark specifics and mode implementation details — verify in report.",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "p. 2",
        quote_or_claim:
          "Qwen3: dense + MoE variants, thinking/non-thinking modes; arXiv record 2025-05-13.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "DeepSeek-V3 Technical Report",
    slug: "deepseek-v3",
    organisation: "DeepSeek-AI",
    year: 2024,
    arxiv_id: "2412.19437",
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 4,
    relevance: 3,
    production_relevance: 2,
    note_source: `${GUIDE}, ch. 2 (pp. 5–6); ${REPORT} (p. 2)`,
    topics: ["data-quality-pretraining", "gpu-efficiency", "ranking-architecture"],
    concepts: ["mixture-of-experts", "multi-head-latent-attention", "kv-cache-compression"],
    sections: {
      summary:
        "The best model-report anchor for sparse scaling: separate total capacity from active compute. MoE + Multi-head Latent Attention + auxiliary-loss-free load balancing + multi-token prediction + stable large-scale training.",
      thesis:
        "Huge total capacity, small activated subset per token — frontier capability at controlled compute.",
      mechanism:
        "- MoE: token routes to a subset of experts.\n- MLA: compressed KV representations for memory-efficient attention.\n- Auxiliary-loss-free load balancing to prevent expert collapse without a conflicting loss.\n- Multi-token prediction for denser training signal.\n- Emphasis on stable training without catastrophic rollbacks.",
      why_it_works:
        "MoE works when the input distribution has latent subproblems (in recsys: categories, markets, price bands, lifecycles); routing pays off only if experts specialise and stay balanced; KV compression matters because long sequences and serving are memory-bound.",
      results:
        "Reported (per guide; needs primary verification): 671B total / 37B activated parameters, 14.8T pretraining tokens, competitive performance at much lower training cost than dense expectations.",
      failure_modes:
        "MoE is operationally complex: routing imbalance, undertrained experts, communication overhead, train/serve mismatch; expert specialisation can overfit historical exposure; sparse wins can hide small-segment losses.",
      relevance_to_me:
        "MoE ranker routing by category/price band/country/seller type/user lifecycle/intent state; expert towers sharing an embedding space for retrieval; MLA lessons for long-history encoders.",
      boss_explanation:
        "DeepSeek-V3 is the reference for capacity-vs-compute separation: 671B parameters, 37B active — the pattern recsys can borrow as conditional capacity instead of bigger dense rankers.",
      sources_to_verify:
        "- '671B total / 37B active / 14.8T tokens' — verify in report before citing.",
    },
    sources: [
      {
        source_name: GUIDE,
        locator: "ch. 2, pp. 5–6",
        quote_or_claim:
          "DeepSeek-V3 uses 671B total parameters with 37B activated per token, pretrained on 14.8T tokens.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "DeepSeek-R1: Incentivizing reasoning capability in LLMs",
    slug: "deepseek-r1",
    organisation: "DeepSeek-AI",
    year: 2025,
    arxiv_id: "2501.12948",
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 4,
    relevance: 3,
    production_relevance: 2,
    note_source: `${GUIDE}, ch. 3 (pp. 7–8); ${REPORT} (p. 2)`,
    topics: ["reward-optimisation", "calibration"],
    concepts: ["rlvr"],
    sections: {
      summary:
        "Made RL-for-reasoning mainstream in open models (R1-Zero shows reasoning emerging under the right RL setup). For recsys the transfer is 'treat post-training as a controllable optimisation layer for decision quality', not chain-of-thought in ranking.",
      why_it_works:
        "Reward design determines behaviour; verifiable rewards reinforce checkable correctness. Recsys loopholes to remember: clickbait, over-discounting, repeated exposure, merchant/category imbalance.",
      results:
        "Strong reasoning-benchmark evidence (per guide; needs primary verification); transfer to recommendation requires separate testing.",
      failure_modes:
        "Reasoning-benchmark gains are not recommender gains; reward models go stale as catalog/behaviour shifts; RL can damage calibration (see DCPO).",
      relevance_to_me:
        "Post-training as an optimisation layer for seller tools, query understanding, and evaluation; RLVR maps to verifiable but delayed/biased commerce rewards (purchase, refund, compliance).",
      experiment_proposal:
        "## Hypothesis\nA tiny policy reranker on synthetic rewards (CTR proxy + diversity + margin confidence) beats plain supervised reranking.\n\n## Baseline\nSupervised BCE reranker.\n\n## Treatment\nPolicy reranker trained on the composite reward.\n\n## Metrics\nAUC/uAUC, NDCG@K, ECE, reward decomposition.\n\n## Ablations\nReward-term weights.\n\n## Failure cases to inspect\nReward hacking; calibration damage; exposure-bias exploitation.",
      boss_explanation:
        "R1's lesson for us is not chain-of-thought ranking — it's that reward design is a first-class engineering surface, and badly designed rewards create exactly the behaviour you asked for.",
      sources_to_verify: "- R1-Zero emergence claims and benchmark numbers — verify in paper.",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "p. 2",
        quote_or_claim:
          "DeepSeek-R1: RL-heavy reasoning adaptation; arXiv version date 2026-01-04.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "DataComp-LM: In search of the next generation of training sets for language models",
    slug: "datacomp-lm",
    organisation: "Academic consortium (DataComp)",
    year: 2024,
    venue: "NeurIPS 2024 (per report)",
    arxiv_id: "2406.11794",
    reading_status: "queued",
    verification_status: "secondary_summary_only",
    priority: 4,
    relevance: 4,
    production_relevance: 3,
    note_source: `${GUIDE}, ch. 4 (pp. 9–10); ${REPORT} (pp. 1, 4)`,
    topics: ["data-quality-pretraining", "evaluation-and-experimentation"],
    concepts: ["data-mixture-design"],
    sections: {
      summary:
        "Controlled benchmark for data curation: same compute recipe, different datasets, many evaluations. The strongest general proof that training-set design is itself a scaling lever.",
      thesis:
        "Data filtering, deduplication, mixture design, and leakage control can matter as much as architecture.",
      mechanism:
        "- Standardised Common Crawl corpus with controlled filtering/dedup/mixing experiments.\n- Model-based filtering to estimate document quality.\n- Broad downstream evaluation, scale-controlled comparisons.",
      why_it_works:
        "Bad data dominates gradients and teaches shortcuts; duplicates teach memorised popularity; different sources teach different abilities; future leakage silently inflates offline metrics.",
      results:
        "Reported (per guide; needs primary verification): model-based filtering is key to a strong open dataset; DCLM baseline beats previous open-data models with less compute.",
      failure_modes:
        "Filter models encode their own biases and can drop rare but valuable data; 'high quality for language' ≠ 'high quality for commerce'; mixture changes can shift calibration and segments while average AUC improves.",
      relevance_to_me:
        "The recsys pretraining corpus is impressions/clicks/carts/purchases/refunds/searches/metadata — curation means event selection, action weighting, exposure dedup, bot/fraud filtering, and time-split leakage control. When a fork fails on backtest, inspect data before architecture.",
      experiment_proposal:
        "## Hypothesis\nA curated event mixture beats a naive log dump at equal compute.\n\n## Baseline\nNaive full-log training corpus.\n\n## Treatment\nFiltered + deduped + reweighted mixture of impressions/clicks/carts/purchases/refunds.\n\n## Metrics\nData efficiency (quality vs tokens), long-tail recall, calibration by action type.\n\n## Ablations\nPopularity-capped sampling; deliberate future-leakage canary (metrics should become suspiciously high).\n\n## Failure cases to inspect\nGains from popular items rather than personalisation; negative sampling silently changing the task.",
      boss_explanation:
        "DataComp-LM proves data curation is a scaling lever, not hygiene — the recsys translation is that event selection, dedup, time splits, and sampling decide whether a model really improved.",
      sources_to_verify: "- DCLM baseline comparisons and compute claims — verify in paper.",
    },
    sources: [
      {
        source_name: REPORT,
        locator: "pp. 1, 4",
        quote_or_claim:
          "DataComp-LM showed better filtering and curation can materially improve compute-performance trade-offs; NeurIPS 2024.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "InstructGPT: Training language models to follow instructions with human feedback",
    slug: "instructgpt",
    organisation: "OpenAI",
    year: 2022,
    arxiv_id: "2203.02155",
    reading_status: "to_read",
    verification_status: "secondary_summary_only",
    priority: 2,
    relevance: 2,
    production_relevance: 2,
    note_source: `${GUIDE}, ch. 3 (pp. 7–8)`,
    topics: ["reward-optimisation"],
    concepts: [],
    sections: {
      summary:
        "The RLHF fundamentals paper: human-feedback fine-tuning made smaller models preferred to much larger pretrained models on instruction-following. Alignment background for all later preference-optimisation work.",
      why_it_works:
        "Preference learning works when absolute labels are hard but pairwise comparisons are easy — recsys has implicit pairwise data everywhere (clicked > skipped, purchased > clicked-only, retained > churned).",
      failure_modes:
        "Preference data biased by exposure/position; reward models go stale; proxy preference is not long-term value.",
      boss_explanation:
        "InstructGPT is where 'reward design determines behaviour' entered mainstream practice — the ancestor of every preference-optimised system we now discuss.",
      sources_to_verify: "- Preference-win claims vs larger models — verify in paper.",
    },
    sources: [
      {
        source_name: GUIDE,
        locator: "ch. 3, pp. 7–8",
        quote_or_claim:
          "InstructGPT showed human-feedback fine-tuning can make smaller models preferred to much larger pretrained models.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "Direct Preference Optimization",
    slug: "direct-preference-optimization",
    organisation: "Stanford",
    year: 2023,
    arxiv_id: "2305.18290",
    reading_status: "to_read",
    verification_status: "secondary_summary_only",
    priority: 3,
    relevance: 3,
    production_relevance: 2,
    note_source: `${GUIDE}, ch. 3 (pp. 7–8) + glossary (p. 34)`,
    topics: ["reward-optimisation", "calibration"],
    concepts: ["dpo"],
    sections: {
      summary:
        "Optimises chosen over rejected responses with a reference-policy term — preference alignment without a separate reward model or full RL loop. Reported comparable-or-better alignment than RLHF baselines with simpler, more stable training.",
      why_it_works:
        "Pairwise preferences are cheaper and cleaner than absolute labels; the reference term regularises against drifting into degenerate policies.",
      failure_modes:
        "Preference pairs biased by exposure/position ('clicked vs not-clicked' is not clean human preference); may optimise proxy preference over long-term value.",
      relevance_to_me:
        "DPO-style losses inspire pairwise/slate reranking: prefer slate A over slate B from logged or synthetic preference signals. OneRec's Iterative Preference Alignment is the recsys-flavoured descendant.",
      experiment_proposal:
        "## Hypothesis\nA DPO-style reranker beats BCE and BPR baselines without destroying calibration.\n\n## Baseline\nSupervised BCE ranker; pairwise BPR.\n\n## Treatment\nTiny DPO reranker (preferred vs rejected item/slate + reference score).\n\n## Metrics\nAUC/uAUC, NDCG@K, ECE, GMV-weighted NDCG.\n\n## Ablations\nReference-policy strength.\n\n## Failure cases to inspect\nExposure-bias exploitation; offline pairwise wins from logging-policy artefacts.",
      boss_explanation:
        "DPO made preference alignment a one-loss training recipe — and its recsys lesson is that pairwise implicit feedback is a usable preference signal if you control exposure bias.",
      sources_to_verify: "- 'Comparable or better than RLHF baselines' — verify in paper.",
    },
    sources: [
      {
        source_name: GUIDE,
        locator: "ch. 3, pp. 7–8",
        quote_or_claim:
          "DPO reports preference alignment comparable to or better than RLHF baselines while being simpler and more stable to train.",
        needs_verification: true,
      },
    ],
  },
  {
    title: "DCPO: Decoupled calibration-aware preference optimisation",
    slug: "dcpo",
    organisation: undefined,
    year: 2026,
    arxiv_id: "2603.09117",
    reading_status: "to_read",
    verification_status: "secondary_summary_only",
    priority: 3,
    relevance: 3,
    production_relevance: 2,
    note_source: `${GUIDE}, ch. 3 (pp. 7–8)`,
    topics: ["calibration", "reward-optimisation"],
    concepts: ["calibration-concept", "rlvr"],
    sections: {
      summary:
        "2026 evidence that RLVR-style post-training can damage confidence calibration, proposing to decouple reasoning and calibration objectives.",
      why_it_works:
        "Calibration matters because probabilities feed downstream arithmetic — an overconfident model can rank better while making GMV estimates worse.",
      failure_modes:
        "The recommendation analogue of overconfident wrong answers: pCTR/pCVR drift breaking bid/blend/threshold logic even as AUC improves.",
      relevance_to_me:
        "Maps directly to calibration-aware ranking: never let a reward-optimised model become numerically overconfident. Debug rule: if AUC improves but ECE worsens, ranking got better while probability estimates got worse.",
      boss_explanation:
        "DCPO's warning: optimising harder objectives (RL, preference) silently taxes calibration — decouple and monitor both.",
      sources_to_verify:
        "- Organisation/authors unknown from the guides — fill in from the primary paper.\n- Calibration-damage findings — verify.",
    },
    sources: [
      {
        source_name: GUIDE,
        locator: "ch. 3, pp. 7–8",
        quote_or_claim:
          "DCPO provides 2026 evidence that RLVR can damage confidence calibration and proposes decoupling reasoning and calibration objectives.",
        needs_verification: true,
      },
    ],
  },
];

export const PAPER_SEEDS: PaperSeed[] = [
  ...foundational,
  oneTrans,
  ...longHistory,
  ...generative,
  ...llmIntent,
  ...multimodal,
  ...rankingServing,
  ...pretrainingPost,
];

export const RELATION_SEEDS: RelationSeed[] = [
  {
    from: "bert4rec",
    to: "sasrec",
    kind: "same_family",
    note: "Masked vs causal sequential baselines",
  },
  { from: "behavior-sequence-transformer", to: "sasrec", kind: "same_family" },
  {
    from: "longer",
    to: "sasrec",
    kind: "builds_on",
    note: "Long-history extension of transformer sequence modelling",
  },
  {
    from: "longer",
    to: "large-memory-network",
    kind: "contrasts_with",
    note: "In-model compression vs persistent external memory",
  },
  {
    from: "large-memory-network",
    to: "lemur",
    kind: "same_family",
    note: "Both use memory banks to amortise expensive encodings",
  },
  {
    from: "hstu-generative-recommenders",
    to: "sasrec",
    kind: "builds_on",
    note: "Sequential transduction reformulation",
  },
  { from: "onerec", to: "hstu-generative-recommenders", kind: "same_family" },
  {
    from: "pinrec",
    to: "onerec",
    kind: "same_family",
    note: "Industrial generative retrieval with outcome conditioning",
  },
  {
    from: "onerec",
    to: "direct-preference-optimization",
    kind: "builds_on",
    note: "Iterative Preference Alignment is DPO-like",
  },
  { from: "deepseek-r1", to: "deepseek-v3", kind: "builds_on" },
  {
    from: "direct-preference-optimization",
    to: "instructgpt",
    kind: "contrasts_with",
    note: "Direct loss vs reward-model RLHF",
  },
  {
    from: "dcpo",
    to: "direct-preference-optimization",
    kind: "builds_on",
    note: "Calibration-aware successor direction",
  },
  { from: "recgpt-v2", to: "recgpt", kind: "supersedes" },
  { from: "recgpt-mobile", to: "recgpt", kind: "builds_on" },
  {
    from: "atomic-intent-reasoning",
    to: "recgpt",
    kind: "same_family",
    note: "Offline LLM intent mining family",
  },
  {
    from: "flashinfer",
    to: "vllm-pagedattention",
    kind: "builds_on",
    note: "Kernel/scheduling layer beneath paged serving stacks",
  },
  {
    from: "rankmixer",
    to: "deepseek-v3",
    kind: "builds_on",
    note: "Sparse-MoE instinct applied inside ranking",
  },
  {
    from: "onetrans",
    to: "behavior-sequence-transformer",
    kind: "builds_on",
    note: "TODO: verify actual lineage from the primary paper",
  },
];
