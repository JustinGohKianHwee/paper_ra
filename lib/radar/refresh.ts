import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EMPTY_USAGE,
  PROMPT_VERSION,
  aiEnabled,
  aiModel,
  getOpenAI,
  structuredCompletion,
  type UsageTotals,
} from "@/lib/ai/client";
import { RADAR_JSON_SCHEMA, buildRadarPrompt, radarResponseSchema } from "@/lib/ai/prompts";
import { normaliseArxivPaper, searchArxiv } from "@/lib/radar/arxiv";
import { deduplicateCandidates, normaliseTitle } from "@/lib/radar/dedupe";
import {
  buildInterestProfile,
  diversityFilter,
  paperSignalWeight,
  relatedLibraryPapers,
  scoreCandidateAgainstProfile,
  titleSimilarity,
  type WeightedText,
} from "@/lib/radar/interest";
import type { Database } from "@/lib/supabase/database.types";
import { DEPTH_LABELS, depthBucket } from "@/lib/topics/depth";
import type { ReadingStatus } from "@/lib/validation/enums";

type Client = SupabaseClient<Database>;

const MAX_QUERIES = 4;
const RESULTS_PER_QUERY = 15;
const MAX_NEW_CANDIDATES = 12;
const LLM_EXPLAIN_TOP = 8;

export interface RefreshResult {
  runId: string;
  added: number;
  fetched: number;
  error?: string;
}

/**
 * User-triggered Radar refresh. Everything up to the final explanations is
 * deterministic and metadata-only: infer interests from the library, search
 * arXiv, dedupe against the library and existing candidates, score locally,
 * and keep the queue diverse. The LLM (if configured) only re-ranks and
 * explains the small top slice; its usage is recorded on radar_runs.
 */
export async function refreshRadar(
  supabase: Client,
  userId: string,
  options: { query?: string } = {}
): Promise<RefreshResult> {
  const queryContext = options.query?.trim() || null;

  const { data: run, error: runError } = await supabase
    .from("radar_runs")
    .insert({
      user_id: userId,
      query_context: queryContext,
      model: aiEnabled() ? aiModel() : null,
      prompt_version: PROMPT_VERSION,
    })
    .select("id")
    .single();
  if (runError || !run) throw new Error(runError?.message ?? "Could not create radar run");

  let usage: UsageTotals = EMPTY_USAGE;

  try {
    // ---- 1. library snapshot ------------------------------------------------
    const [papersRes, topicLinksRes, conceptLinksRes, annotationsRes, decidedRes] =
      await Promise.all([
        supabase
          .from("papers")
          .select(
            "id, title, slug, abstract, arxiv_id, doi, reading_status, relevance, updated_at, deleted_at"
          ),
        supabase.from("paper_topics").select("paper_id, topics(name)"),
        supabase.from("paper_concepts").select("paper_id, concepts(name)"),
        supabase
          .from("paper_annotations")
          .select("body_md")
          .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
          .limit(100),
        supabase
          .from("radar_candidates")
          .select("title, status, decided_at")
          .in("status", ["accepted", "dismissed"])
          .order("decided_at", { ascending: false })
          .limit(60),
      ]);

    const allPapers = papersRes.data ?? [];
    const activePapers = allPapers.filter((p) => !p.deleted_at);

    if (activePapers.length === 0 && !queryContext) {
      throw new Error("Your library is empty — add a few papers first, or search a topic.");
    }

    const topicsByPaper = new Map<string, string[]>();
    const topicCounts = new Map<string, { name: string; weight: number }>();
    for (const link of topicLinksRes.data ?? []) {
      const name = (link.topics as unknown as { name: string } | null)?.name;
      if (!name) continue;
      topicsByPaper.set(link.paper_id, [...(topicsByPaper.get(link.paper_id) ?? []), name]);
    }
    const conceptNames = new Set<string>();
    for (const link of conceptLinksRes.data ?? []) {
      const name = (link.concepts as unknown as { name: string } | null)?.name;
      if (name) conceptNames.add(name);
    }

    const now = Date.now();
    const positives: WeightedText[] = [];
    for (const paper of activePapers) {
      const weight = paperSignalWeight({
        readingStatus: paper.reading_status,
        relevance: paper.relevance,
        updatedAt: paper.updated_at,
        now,
      });
      positives.push({ text: `${paper.title} ${paper.abstract ?? ""}`, weight });
      for (const topicName of topicsByPaper.get(paper.id) ?? []) {
        positives.push({ text: topicName, weight });
        const entry = topicCounts.get(topicName) ?? { name: topicName, weight: 0 };
        entry.weight += weight;
        topicCounts.set(topicName, entry);
      }
    }
    for (const name of conceptNames) positives.push({ text: name, weight: 1.5 });
    for (const a of annotationsRes.data ?? []) positives.push({ text: a.body_md, weight: 0.5 });

    const penalties: WeightedText[] = [];
    for (const decided of decidedRes.data ?? []) {
      if (decided.status === "accepted") positives.push({ text: decided.title, weight: 2 });
      else penalties.push({ text: decided.title, weight: 1.5 });
    }

    const profile = buildInterestProfile(positives, penalties);

    // ---- 2. queries -----------------------------------------------------------
    const topTopics = [...topicCounts.values()].sort((a, b) => b.weight - a.weight);
    const queries = queryContext
      ? [queryContext]
      : topTopics.slice(0, MAX_QUERIES).map((t) => t.name);
    if (queries.length === 0) {
      throw new Error("No topics found to search from — link papers to topics first.");
    }

    await supabase.from("radar_runs").update({ queries }).eq("id", run.id);

    // ---- 3. fetch + normalise + dedupe ---------------------------------------
    const rawByKey = new Map<
      string,
      { candidate: ReturnType<typeof normaliseArxivPaper>; authors: string[]; sourceQuery: string }
    >();
    let fetched = 0;
    for (const query of queries) {
      const results = await searchArxiv({
        query: `all:"${query.replace(/"/g, "")}"`,
        maxResults: RESULTS_PER_QUERY,
      });
      fetched += results.length;
      for (const raw of results) {
        const candidate = normaliseArxivPaper(raw);
        const key = candidate.arxivId ?? candidate.normalisedTitle;
        if (!rawByKey.has(key)) {
          rawByKey.set(key, { candidate, authors: raw.authors ?? [], sourceQuery: query });
        }
      }
    }

    const { data: existingCandidates } = await supabase
      .from("radar_candidates")
      .select("arxiv_id, doi, normalised_title, title");

    const existingKeys = [
      // Library papers (including trashed — a deliberately removed paper
      // must not bounce back as a recommendation).
      ...allPapers.map((p) => ({
        arxivId: p.arxiv_id,
        doi: p.doi,
        normalisedTitle: normaliseTitle(p.title),
      })),
      ...(existingCandidates ?? []).map((c) => ({
        arxivId: c.arxiv_id,
        doi: c.doi,
        normalisedTitle: c.normalised_title,
      })),
    ];

    const fresh = deduplicateCandidates(
      [...rawByKey.values()].map((r) => r.candidate),
      existingKeys
    );

    // ---- 4. deterministic scoring + diversity --------------------------------
    const libraryIndex = activePapers.map((p) => ({ title: p.title, slug: p.slug }));
    const scored = fresh.map((candidate) => {
      const meta = rawByKey.get(candidate.arxivId ?? candidate.normalisedTitle);
      const profileScore = scoreCandidateAgainstProfile(candidate, profile, now);
      return {
        candidate,
        authors: meta?.authors ?? [],
        sourceQuery: meta?.sourceQuery ?? queries[0],
        score: profileScore.score,
        breakdown: profileScore.breakdown,
        matchedTerms: profileScore.matchedTerms,
        relatedPapers: relatedLibraryPapers(candidate, libraryIndex),
        relatedConcepts: [...conceptNames].filter((name) =>
          `${candidate.title} ${candidate.abstract ?? ""}`
            .toLowerCase()
            .includes(name.toLowerCase())
        ),
        why: "",
        llmRelevance: null as number | null,
      };
    });

    // Diversity: nothing nearly identical to another new candidate OR to a
    // candidate already sitting in the queue from an earlier refresh.
    const knownTitles = (existingCandidates ?? []).map((c) => c.title);
    const diverse = diversityFilter(
      scored.map((s) => ({ ...s, title: s.candidate.title })),
      0.6
    )
      .filter((c) => !knownTitles.some((known) => titleSimilarity(known, c.title) >= 0.6))
      .slice(0, MAX_NEW_CANDIDATES);

    // ---- 5. LLM explanations for the top slice (optional) --------------------
    if (aiEnabled() && diverse.length > 0) {
      const top = diverse.slice(0, LLM_EXPLAIN_TOP);
      const librarySummary = [
        "Top topics (by reading depth):",
        ...topTopics.slice(0, 6).map((t) => `- ${t.name}`),
        `Key concepts: ${[...conceptNames].slice(0, 15).join("; ") || "(none)"}`,
        "Representative papers:",
        ...activePapers
          .filter((p) => depthBucket(p.reading_status as ReadingStatus) !== "unread")
          .slice(0, 10)
          .map(
            (p) => `- ${p.title} (${DEPTH_LABELS[depthBucket(p.reading_status as ReadingStatus)]})`
          ),
        queryContext ? `One-off search context: ${queryContext}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      try {
        const prompt = buildRadarPrompt({
          librarySummary,
          candidates: top.map((c, index) => ({
            index,
            title: c.candidate.title,
            abstract: c.candidate.abstract ?? "",
          })),
        });
        const result = await structuredCompletion<unknown>({
          client: getOpenAI(),
          system: prompt.system,
          user: prompt.user,
          schemaName: "radar_explanations",
          schema: RADAR_JSON_SCHEMA as unknown as Record<string, unknown>,
          usage,
        });
        usage = result.usage;
        const parsed = radarResponseSchema.parse(result.data);
        for (const item of parsed.items) {
          const target = top[item.index];
          if (!target) continue;
          target.why = item.why;
          target.llmRelevance = Math.max(0, Math.min(5, item.relevance));
          // Blend: deterministic score dominates; LLM nudges ±10.
          target.score = Math.max(0, Math.min(100, target.score + (target.llmRelevance - 2.5) * 4));
        }
      } catch (error) {
        // Explanations are a bonus — a model failure must not lose the refresh.
        console.warn("Radar explanation call failed:", error);
      }
    }

    // ---- 6. persist -----------------------------------------------------------
    const rows = diverse.map((c) => ({
      user_id: userId,
      title: c.candidate.title,
      normalised_title: c.candidate.normalisedTitle,
      arxiv_id: c.candidate.arxivId ?? null,
      doi: c.candidate.doi ?? null,
      url: c.candidate.url ?? null,
      abstract: c.candidate.abstract ?? null,
      provider: "arxiv",
      published_on: c.candidate.publishedOn ?? null,
      topics: queryContext ? [] : [c.sourceQuery],
      authors: c.authors.slice(0, 12),
      score: c.score,
      score_breakdown: { ...c.breakdown, llmRelevance: c.llmRelevance },
      why_it_matters:
        c.why ||
        `Matches your library on: ${c.matchedTerms.slice(0, 5).join(", ") || "recent activity in your topics"}.`,
      related_json: {
        topics: queryContext ? [] : [c.sourceQuery],
        concepts: c.relatedConcepts.slice(0, 5),
        papers: c.relatedPapers,
        matched_terms: c.matchedTerms,
      },
      query_context: queryContext,
      status: "scored" as const,
    }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("radar_candidates").insert(rows);
      if (insertError) throw new Error(`Saving candidates failed: ${insertError.message}`);
    }

    await supabase
      .from("radar_runs")
      .update({
        status: "done",
        candidates_fetched: fetched,
        candidates_added: rows.length,
        usage: { ...usage },
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return { runId: run.id, added: rows.length, fetched };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase
      .from("radar_runs")
      .update({
        status: "failed",
        error: message,
        usage: { ...usage },
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    return { runId: run.id, added: 0, fetched: 0, error: message };
  }
}
