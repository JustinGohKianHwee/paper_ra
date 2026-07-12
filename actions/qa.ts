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
    .select("id, paper_id, kind, body_md")
    .eq("id", parsed.data.annotation_id)
    .maybeSingle();
  if (!annotation) return { ok: false, error: "Annotation not found" };
  if (annotation.kind !== "question") {
    return { ok: false, error: "Only question annotations can be answered" };
  }

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
  if (parsed.data.question) {
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
