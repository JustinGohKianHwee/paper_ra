"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/actions/papers";
import { aiEnabled } from "@/lib/ai/client";
import { RateLimitError } from "@/lib/ai/pipeline";
import { answerQuestion } from "@/lib/ai/qa";
import type { PaperQaRow } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type QaActionResult = ActionResult & { qa?: PaperQaRow };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

const askSchema = z.object({
  annotation_id: z.string().uuid(),
  /** Omitted for the first ask — the annotation's own text is the question. */
  question: z.string().trim().min(3).max(4000).optional(),
  retry_qa_id: z.string().uuid().optional(),
});

/**
 * Asks the AI to answer a question annotation from the paper's own text.
 * First ask answers the annotation body; subsequent calls with `question`
 * append follow-ups to the same thread.
 */
export async function askAi(input: unknown): Promise<QaActionResult> {
  const parsed = askSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!aiEnabled()) {
    return { ok: false, error: "AI answering is not configured (OPENAI_API_KEY missing)." };
  }
  const { supabase, user } = await requireUser();

  const { data: annotation } = await supabase
    .from("paper_annotations")
    .select("id, paper_id, kind, body_md, selected_text, page_number")
    .eq("id", parsed.data.annotation_id)
    .maybeSingle();
  if (!annotation) return { ok: false, error: "Annotation not found" };
  if (annotation.kind !== "question") {
    return { ok: false, error: "Only question annotations can be answered" };
  }

  // If this question came from a selected passage, that passage is primary
  // context for the whole thread (including follow-ups).
  const primarySelection =
    annotation.selected_text && annotation.page_number
      ? { text: annotation.selected_text, page: annotation.page_number }
      : null;

  const { data: last } = await supabase
    .from("paper_qa")
    .select("position, status")
    .eq("annotation_id", annotation.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last?.status === "pending") {
    return { ok: false, error: "An answer is already being generated for this question." };
  }

  let question: string;
  let position: number;
  if (parsed.data.retry_qa_id) {
    const { data: retryRow } = await supabase
      .from("paper_qa")
      .select("id, annotation_id, position, question_md, status")
      .eq("id", parsed.data.retry_qa_id)
      .maybeSingle();
    if (!retryRow || retryRow.annotation_id !== annotation.id) {
      return { ok: false, error: "Could not find that failed answer to retry." };
    }
    if (retryRow.status !== "failed") {
      return { ok: false, error: "Only failed answers can be retried." };
    }
    question = retryRow.question_md;
    position = retryRow.position;
    await supabase.from("paper_qa").delete().eq("id", retryRow.id);
  } else if (parsed.data.question) {
    // Follow-up: appended to the thread.
    question = parsed.data.question;
    position = (last?.position ?? 0) + 1;
  } else if (last && last.status === "answered") {
    return { ok: false, error: "This question already has an answer — ask a follow-up instead." };
  } else {
    // First ask, or retry after a failure (the failed row frees its slot).
    question = annotation.body_md;
    position = last?.position ?? 1;
    if (last) {
      await supabase
        .from("paper_qa")
        .delete()
        .eq("annotation_id", annotation.id)
        .eq("position", last.position);
    }
  }

  try {
    const qa = await answerQuestion(supabase, user.id, {
      paperId: annotation.paper_id,
      annotationId: annotation.id,
      question,
      position,
      primarySelection,
    });
    revalidatePath("/papers");
    if (qa.status === "failed") {
      return { ok: false, error: qa.error ?? "Answering failed", qa };
    }
    return { ok: true, qa };
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: error.message };
    return { ok: false, error: error instanceof Error ? error.message : "Answering failed" };
  }
}

const askSelectionSchema = z.object({
  paper_id: z.string().uuid(),
  passage_id: z.string().uuid().optional().nullable(),
  question: z.string().trim().min(3, "Ask a question about the passage").max(4000),
  selected_text: z.string().trim().min(1).max(10000),
  page_number: z.number().int().min(1),
});

/**
 * "Ask about this" from a PDF text selection: records a question annotation
 * carrying the selection as provenance, then answers it with the selected
 * passage as primary evidence. One atomic call so the reader stays in flow.
 */
export async function askAboutSelection(
  input: unknown
): Promise<QaActionResult & { annotationId?: string }> {
  const parsed = askSelectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!aiEnabled()) {
    return { ok: false, error: "AI answering is not configured (OPENAI_API_KEY missing)." };
  }
  const { supabase, user } = await requireUser();

  const { data: annotation, error: insertError } = await supabase
    .from("paper_annotations")
    .insert({
      user_id: user.id,
      paper_id: parsed.data.paper_id,
      passage_id: parsed.data.passage_id ?? null,
      kind: "question",
      body_md: parsed.data.question,
      selected_text: parsed.data.selected_text,
      page_number: parsed.data.page_number,
      anchor: { page: parsed.data.page_number, quote: { exact: parsed.data.selected_text } },
    })
    .select("id")
    .single();
  if (insertError || !annotation) {
    return { ok: false, error: insertError?.message ?? "Could not record the question" };
  }

  try {
    const qa = await answerQuestion(supabase, user.id, {
      paperId: parsed.data.paper_id,
      annotationId: annotation.id,
      question: parsed.data.question,
      position: 1,
      primarySelection: {
        text: parsed.data.selected_text,
        page: parsed.data.page_number,
      },
    });
    revalidatePath("/papers");
    if (qa.status === "failed") {
      return { ok: false, error: qa.error ?? "Answering failed", qa, annotationId: annotation.id };
    }
    return { ok: true, qa, annotationId: annotation.id };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { ok: false, error: error.message, annotationId: annotation.id };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Answering failed",
      annotationId: annotation.id,
    };
  }
}

const editSchema = z.object({
  id: z.string().uuid(),
  answer_md: z.string().trim().min(1).max(50000),
});

/** Editing an AI answer keeps it, provenance-flipped to ai_edited. */
export async function updateQaAnswer(input: unknown): Promise<ActionResult> {
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("paper_qa")
    .update({ answer_md: parsed.data.answer_md, answer_authorship: "ai_edited" })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/papers");
  return { ok: true };
}

export async function deleteQa(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("paper_qa").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/papers");
  return { ok: true };
}
