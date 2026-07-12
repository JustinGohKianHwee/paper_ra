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
import { assertQaWithinLimit, loadPaperPages, persistPaperPages } from "@/lib/ai/pipeline";
import { QA_JSON_SCHEMA, buildQaPrompt, qaResponseSchema } from "@/lib/ai/prompts";
import { selectContext } from "@/lib/ai/qa-retrieval";
import type { Database, PaperQaRow } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

const MAX_FOLLOW_UP_CONTEXT = 3;
const QA_MAX_OUTPUT_TOKENS = Number(process.env.QA_MAX_OUTPUT_TOKENS ?? 1200);

/**
 * Answers a reading question from the paper's own extracted text.
 *
 * Retrieval-first: pages persisted at processing time are ranked lexically
 * against the question and only the best few are sent to the model. The full
 * audit — model, prompt version, grounding (cited pages + overlapping
 * passages), token usage, status, and errors — lives on the `paper_qa` row
 * itself. Q&A is a lightweight interactive workload, so it is NOT recorded as
 * a multi-stage `processing_runs` job and has its own hourly budget.
 */
export async function answerQuestion(
  supabase: Client,
  userId: string,
  options: {
    paperId: string;
    annotationId: string;
    question: string;
    /** 1 = the annotation's own question; 2+ = follow-ups. */
    position: number;
    /**
     * The exact passage the user selected in the PDF. When present it is the
     * PRIMARY grounding context (never re-derived from lexical retrieval); the
     * retrieved pages only supplement it.
     */
    primarySelection?: { text: string; page: number } | null;
  }
): Promise<PaperQaRow> {
  await assertQaWithinLimit(supabase);

  const { data: paper, error: paperError } = await supabase
    .from("papers")
    .select("id, title, source_input, pdf_url, arxiv_id, deleted_at")
    .eq("id", options.paperId)
    .single();
  if (paperError || !paper) throw new Error(paperError?.message ?? "Paper not found");
  if (paper.deleted_at) throw new Error("This paper is in the trash.");

  // The pending row exists immediately so a crash still leaves an audit trail.
  const { data: qaRow, error: insertError } = await supabase
    .from("paper_qa")
    .insert({
      user_id: userId,
      paper_id: options.paperId,
      annotation_id: options.annotationId,
      position: options.position,
      question_md: options.question,
      status: "pending",
      model: aiModel(),
      prompt_version: PROMPT_VERSION,
    })
    .select("*")
    .single();
  if (insertError || !qaRow) {
    throw new Error(insertError?.message ?? "Could not record the question");
  }

  let usage: UsageTotals = EMPTY_USAGE;

  const fail = async (message: string): Promise<PaperQaRow> => {
    const { data } = await supabase
      .from("paper_qa")
      .update({ status: "failed", error: message, usage: { ...usage } })
      .eq("id", qaRow.id)
      .select("*")
      .single();
    return data ?? { ...qaRow, status: "failed", error: message };
  };

  try {
    // ---- context: stored pages, with a one-time backfill for old papers ----
    let { data: pageRows } = await supabase
      .from("paper_pages")
      .select("page_no, content")
      .eq("paper_id", options.paperId)
      .order("page_no");

    if (!pageRows || pageRows.length === 0) {
      const extracted = await loadPaperPages(supabase, paper);
      if (extracted.length > 0) {
        await persistPaperPages(supabase, userId, options.paperId, extracted);
        pageRows = extracted.map((content, i) => ({ page_no: i + 1, content }));
      }
    }

    if (!pageRows || pageRows.length === 0) {
      return await fail(
        "No extracted paper text is available to ground an answer. Add a PDF source and run processing first."
      );
    }

    const retrieved = selectContext(
      pageRows.map((p) => ({ pageNo: p.page_no, content: p.content })),
      options.question
    );

    // Build the context pages. A selected passage is guaranteed context (its
    // page is prepended if retrieval missed it) — the user pointed at it, so we
    // never rely on lexical overlap to rediscover it.
    const contextPages: { pageNo: number; content: string }[] = retrieved.map((p) => ({
      pageNo: p.pageNo,
      content: p.content,
    }));
    const selection = options.primarySelection ?? null;
    if (selection && selection.page >= 1 && selection.page <= pageRows.length) {
      if (!contextPages.some((c) => c.pageNo === selection.page)) {
        const row = pageRows.find((r) => r.page_no === selection.page);
        if (row) contextPages.unshift({ pageNo: selection.page, content: row.content });
      }
    }

    if (contextPages.length === 0 && !selection) {
      return await fail(
        "The question didn't match any part of the extracted paper text — try rephrasing it with terms from the paper."
      );
    }

    // Passage overview orients the model; overlapping passages become grounding.
    const { data: passages } = await supabase
      .from("paper_passages")
      .select("id, title, anchor, page_start, page_end")
      .eq("paper_id", options.paperId)
      .order("position");
    const passageIndex = (passages ?? [])
      .map((p) => `- ${p.anchor || p.title} (pp. ${p.page_start ?? "?"}–${p.page_end ?? "?"})`)
      .join("\n");

    // Prior exchanges make follow-ups coherent without resending the paper.
    const { data: prior } = await supabase
      .from("paper_qa")
      .select("question_md, answer_md, position")
      .eq("annotation_id", options.annotationId)
      .eq("status", "answered")
      .lt("position", options.position)
      .order("position", { ascending: false })
      .limit(MAX_FOLLOW_UP_CONTEXT);
    const priorThread = (prior ?? [])
      .reverse()
      .map((p) => ({ question: p.question_md, answer: p.answer_md ?? "" }));

    const prompt = buildQaPrompt({
      paperTitle: paper.title,
      question: options.question,
      contextPages,
      passageIndex,
      priorThread,
      primarySelection: selection,
    });

    const result = await structuredCompletion<unknown>({
      client: getOpenAI(),
      system: prompt.system,
      user: prompt.user,
      schemaName: "qa_answer",
      schema: QA_JSON_SCHEMA as unknown as Record<string, unknown>,
      usage,
      maxOutputTokens: QA_MAX_OUTPUT_TOKENS,
    });
    usage = result.usage;
    const parsed = qaResponseSchema.parse(result.data);

    const citedPages = [...new Set(parsed.cited_pages)].filter(
      (p) => p >= 1 && p <= pageRows.length
    );
    // A selection-grounded answer always cites the selected page.
    if (selection && !citedPages.includes(selection.page)) citedPages.unshift(selection.page);
    const citedPassageIds = (passages ?? [])
      .filter(
        (p) =>
          p.page_start !== null &&
          citedPages.some((page) => page >= p.page_start! && page <= (p.page_end ?? p.page_start!))
      )
      .map((p) => p.id);

    const { data: answered, error: updateError } = await supabase
      .from("paper_qa")
      .update({
        answer_md: parsed.answer_md,
        answer_authorship: "ai",
        coverage: parsed.coverage,
        grounding: {
          pages: citedPages,
          passage_ids: citedPassageIds,
          retrieved_pages: contextPages.map((p) => p.pageNo),
          selection: selection ? { page: selection.page } : undefined,
        },
        status: "answered",
        error: null,
        usage: { ...usage },
      })
      .eq("id", qaRow.id)
      .select("*")
      .single();
    if (updateError || !answered) {
      throw new Error(updateError?.message ?? "Could not save the answer");
    }

    return answered;
  } catch (error) {
    return await fail(error instanceof Error ? error.message : String(error));
  }
}
