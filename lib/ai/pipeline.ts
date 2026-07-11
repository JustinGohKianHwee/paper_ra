import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EMPTY_USAGE,
  PROMPT_VERSION,
  aiModel,
  getOpenAI,
  structuredCompletion,
  type UsageTotals,
} from "@/lib/ai/client";
import { chunkPages, extractPdfFromBuffer, extractPdfFromUrl } from "@/lib/ai/extract";
import {
  AI_NOTE_SECTIONS,
  NOTES_JSON_SCHEMA,
  PASSAGES_JSON_SCHEMA,
  SUGGESTIONS_JSON_SCHEMA,
  buildNotesPrompt,
  buildPassagesPrompt,
  buildSuggestionsPrompt,
  notesResponseSchema,
  passagesResponseSchema,
  suggestionsResponseSchema,
} from "@/lib/ai/prompts";
import type { Database, ProcessingStatus } from "@/lib/supabase/database.types";
import { sectionPosition } from "@/lib/templates/paper";

type Client = SupabaseClient<Database>;

/** LLM stages that are skipped on resume once completed. */
const STAGE_PASSAGES = "passages";
const STAGE_NOTES = "notes";
const STAGE_SUGGESTIONS = "suggestions";

const MAX_RUNS_PER_HOUR = Number(process.env.AI_MAX_RUNS_PER_HOUR ?? 10);
/** Cap LLM work per paper regardless of PDF length (~8 chunks ≈ 50 pages of dense text). */
const MAX_CHUNKS = 8;

export class RateLimitError extends Error {}

export interface PipelineResult {
  runId: string;
  status: "done" | "failed";
  error?: string;
}

/**
 * Runs (or resumes) AI processing for a paper. Uses the caller's RLS-scoped
 * Supabase client — the pipeline can only ever touch the caller's rows.
 * Persists progress after every stage so a crash/timeout resumes cheaply,
 * and records model/prompt/usage on processing_runs for auditing.
 */
export async function runPaperPipeline(
  supabase: Client,
  userId: string,
  paperId: string
): Promise<PipelineResult> {
  const { data: paper, error: paperError } = await supabase
    .from("papers")
    .select("*")
    .eq("id", paperId)
    .single();
  if (paperError || !paper) throw new Error(paperError?.message ?? "Paper not found");

  // Rate limit: protects the OpenAI budget and outbound fetch volume.
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase
    .from("processing_runs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", oneHourAgo);
  if ((count ?? 0) >= MAX_RUNS_PER_HOUR) {
    throw new RateLimitError(
      `Processing limit reached (${MAX_RUNS_PER_HOUR}/hour). Try again later.`
    );
  }

  // Resume the latest failed run when there is one; otherwise start fresh.
  const { data: lastRun } = await supabase
    .from("processing_runs")
    .select("*")
    .eq("paper_id", paperId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let runId: string;
  let stagesCompleted: string[];
  if (lastRun && lastRun.status === "failed") {
    runId = lastRun.id;
    stagesCompleted = lastRun.stages_completed;
    await supabase
      .from("processing_runs")
      .update({
        status: "running",
        attempt: lastRun.attempt + 1,
        error: null,
        started_at: lastRun.started_at ?? new Date().toISOString(),
      })
      .eq("id", runId);
  } else if (lastRun && (lastRun.status === "running" || lastRun.status === "queued")) {
    // A run is already in flight; don't double-process.
    return { runId: lastRun.id, status: "done" };
  } else {
    const { data: created, error } = await supabase
      .from("processing_runs")
      .insert({
        user_id: userId,
        paper_id: paperId,
        status: "running",
        model: aiModel(),
        prompt_version: PROMPT_VERSION,
        started_at: new Date().toISOString(),
      })
      .select("id, stages_completed")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create run");
    runId = created.id;
    stagesCompleted = created.stages_completed;
  }

  let usage: UsageTotals = EMPTY_USAGE;

  const setPaperStatus = async (status: ProcessingStatus) => {
    await supabase.from("papers").update({ processing_status: status }).eq("id", paperId);
  };
  const completeStage = async (stage: string) => {
    stagesCompleted = [...stagesCompleted, stage];
    await supabase
      .from("processing_runs")
      .update({ stage, stages_completed: stagesCompleted, usage: { ...usage } })
      .eq("id", runId);
  };

  try {
    const client = getOpenAI();

    // ---- full text (always re-derived; cheap relative to LLM stages) -------
    await setPaperStatus("extracting");
    const pages = await loadPaperPages(supabase, paper);

    // ---- passages ----------------------------------------------------------
    if (!stagesCompleted.includes(STAGE_PASSAGES)) {
      await setPaperStatus("summarising");
      await supabase.from("processing_runs").update({ stage: STAGE_PASSAGES }).eq("id", runId);

      // Regeneration safety: remove earlier AI passages for this paper
      // (annotations survive via ON DELETE SET NULL).
      await supabase.from("paper_passages").delete().eq("paper_id", paperId);

      let position = 0;
      if (pages.length > 0) {
        const chunks = chunkPages(pages).slice(0, MAX_CHUNKS);
        for (const chunk of chunks) {
          const prompt = buildPassagesPrompt({
            paperTitle: paper.title,
            chunkText: chunk.text,
            chunkPageStart: chunk.pageStart,
            chunkPageEnd: chunk.pageEnd,
            isFirstChunk: chunk.index === 0,
          });
          const result = await structuredCompletion<unknown>({
            client,
            system: prompt.system,
            user: prompt.user,
            schemaName: "passages",
            schema: PASSAGES_JSON_SCHEMA as unknown as Record<string, unknown>,
            usage,
          });
          usage = result.usage;
          const parsed = passagesResponseSchema.parse(result.data);
          if (parsed.passages.length > 0) {
            const rows = parsed.passages.map((p) => ({
              user_id: userId,
              paper_id: paperId,
              position: position++,
              title: p.title.slice(0, 300),
              anchor: p.anchor.slice(0, 200),
              page_start: clampPage(p.page_start, pages.length),
              page_end: clampPage(p.page_end, pages.length),
              ai_summary_md: p.summary_md,
              ai_model: aiModel(),
            }));
            const { error } = await supabase.from("paper_passages").insert(rows);
            if (error) throw new Error(`Saving passages failed: ${error.message}`);
          }
        }
      } else if (paper.abstract) {
        // No full text — a single abstract-level passage so reading mode works.
        const { error } = await supabase.from("paper_passages").insert({
          user_id: userId,
          paper_id: paperId,
          position: 0,
          title: "Abstract",
          anchor: "Abstract",
          page_start: 1,
          page_end: 1,
          ai_summary_md:
            "Full text was not available; only the abstract could be processed. Add a PDF URL in the metadata and re-run processing for a full breakdown.",
          ai_model: aiModel(),
        });
        if (error) throw new Error(`Saving passages failed: ${error.message}`);
      }
      await completeStage(STAGE_PASSAGES);
    }

    // ---- structured notes (fills EMPTY sections only) -----------------------
    if (!stagesCompleted.includes(STAGE_NOTES)) {
      await supabase.from("processing_runs").update({ stage: STAGE_NOTES }).eq("id", runId);

      const { data: passages } = await supabase
        .from("paper_passages")
        .select("title, anchor, ai_summary_md")
        .eq("paper_id", paperId)
        .order("position");
      const passageSummaries = (passages ?? [])
        .map((p) => `## ${p.title} (${p.anchor})\n${p.ai_summary_md}`)
        .join("\n\n");

      if (passageSummaries || paper.abstract) {
        const prompt = buildNotesPrompt({
          paperTitle: paper.title,
          abstract: paper.abstract,
          passageSummaries,
        });
        const result = await structuredCompletion<unknown>({
          client,
          system: prompt.system,
          user: prompt.user,
          schemaName: "notes",
          schema: NOTES_JSON_SCHEMA as unknown as Record<string, unknown>,
          usage,
        });
        usage = result.usage;
        const notes = notesResponseSchema.parse(result.data);

        const { data: existing } = await supabase
          .from("paper_notes")
          .select("section_type, body_md")
          .eq("paper_id", paperId);
        const nonEmpty = new Set(
          (existing ?? []).filter((n) => n.body_md.trim() !== "").map((n) => n.section_type)
        );

        for (const section of AI_NOTE_SECTIONS) {
          const body = notes[section]?.trim();
          // Never overwrite user content — AI only fills empty sections.
          if (!body || body === "Not covered in the available text." || nonEmpty.has(section)) {
            continue;
          }
          const { error } = await supabase.from("paper_notes").upsert(
            {
              user_id: userId,
              paper_id: paperId,
              section_type: section,
              body_md: body,
              position: sectionPosition(section),
              authorship: "ai",
            },
            { onConflict: "paper_id,section_type" }
          );
          if (error) throw new Error(`Saving notes failed: ${error.message}`);
        }
      }
      await completeStage(STAGE_NOTES);
    }

    // ---- suggestions ---------------------------------------------------------
    if (!stagesCompleted.includes(STAGE_SUGGESTIONS)) {
      await setPaperStatus("suggesting");
      await supabase.from("processing_runs").update({ stage: STAGE_SUGGESTIONS }).eq("id", runId);

      const { count: proposedCount } = await supabase
        .from("paper_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("paper_id", paperId);

      if ((proposedCount ?? 0) === 0) {
        const [{ data: topics }, { data: concepts }, { data: summaryNote }] = await Promise.all([
          supabase.from("topics").select("name").order("name"),
          supabase.from("concepts").select("name").order("name"),
          supabase
            .from("paper_notes")
            .select("body_md")
            .eq("paper_id", paperId)
            .eq("section_type", "summary")
            .maybeSingle(),
        ]);

        const prompt = buildSuggestionsPrompt({
          paperTitle: paper.title,
          abstract: paper.abstract,
          summary: summaryNote?.body_md ?? "",
          existingTopics: (topics ?? []).map((t) => t.name),
          existingConcepts: (concepts ?? []).map((c) => c.name),
        });
        const result = await structuredCompletion<unknown>({
          client,
          system: prompt.system,
          user: prompt.user,
          schemaName: "suggestions",
          schema: SUGGESTIONS_JSON_SCHEMA as unknown as Record<string, unknown>,
          usage,
        });
        usage = result.usage;
        const suggestions = suggestionsResponseSchema.parse(result.data);

        const rows = [
          ...suggestions.topics.slice(0, 4).map((t) => ({
            kind: "topic" as const,
            payload: { name: t.name.slice(0, 200), rationale: t.rationale },
          })),
          ...suggestions.concepts.slice(0, 5).map((c) => ({
            kind: "concept" as const,
            payload: { name: c.name.slice(0, 200), rationale: c.rationale },
          })),
          {
            kind: "priority" as const,
            payload: {
              value: Math.min(5, Math.max(1, suggestions.priority.value)),
              rationale: suggestions.priority.rationale,
            },
          },
          {
            kind: "relevance" as const,
            payload: {
              value: Math.min(5, Math.max(0, suggestions.relevance.value)),
              rationale: suggestions.relevance.rationale,
            },
          },
        ];
        const { error } = await supabase
          .from("paper_suggestions")
          .insert(rows.map((r) => ({ user_id: userId, paper_id: paperId, run_id: runId, ...r })));
        if (error) throw new Error(`Saving suggestions failed: ${error.message}`);
      }
      await completeStage(STAGE_SUGGESTIONS);
    }

    // ---- finish --------------------------------------------------------------
    await supabase
      .from("processing_runs")
      .update({ status: "done", finished_at: new Date().toISOString(), usage: { ...usage } })
      .eq("id", runId);
    await supabase
      .from("papers")
      .update({
        processing_status: "done",
        processed_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq("id", paperId);
    return { runId, status: "done" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase
      .from("processing_runs")
      .update({
        status: "failed",
        error: message,
        usage: { ...usage },
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);
    await supabase
      .from("papers")
      .update({ processing_status: "failed", processing_error: message })
      .eq("id", paperId);
    return { runId, status: "failed", error: message };
  }
}

function clampPage(page: number, total: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(Math.round(page), Math.max(total, 1));
}

/**
 * Locates and extracts the paper's full text. Sources, in order: uploaded
 * attachment (source_input "storage:<path>"), explicit pdf_url, arXiv PDF.
 * Returns [] when no source is available (pipeline degrades to abstract-only).
 */
async function loadPaperPages(
  supabase: Client,
  paper: { source_input: string | null; pdf_url: string | null; arxiv_id: string | null }
): Promise<string[]> {
  try {
    if (paper.source_input?.startsWith("storage:")) {
      const path = paper.source_input.slice("storage:".length);
      const { data, error } = await supabase.storage.from("paper-attachments").download(path);
      if (error || !data) throw new Error(error?.message ?? "Attachment download failed");
      const document = await extractPdfFromBuffer(new Uint8Array(await data.arrayBuffer()));
      return document.pages;
    }
    const url =
      paper.pdf_url ?? (paper.arxiv_id ? `https://arxiv.org/pdf/${paper.arxiv_id}` : null);
    if (!url) return [];
    const document = await extractPdfFromUrl(url);
    return document.pages;
  } catch (error) {
    // Extraction failure should degrade, not abort: abstract-only processing.
    console.warn("PDF extraction failed:", error);
    return [];
  }
}
