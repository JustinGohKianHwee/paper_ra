"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SaveResult } from "@/actions/notes";
import type { ActionResult } from "@/actions/papers";
import { aiEnabled } from "@/lib/ai/client";
import { draftSynthesis } from "@/lib/ai/synthesis";
import { createClient } from "@/lib/supabase/server";
import { synthesisTemplate } from "@/lib/templates/synthesis";
import { synthesisCreateSchema, synthesisUpdateSchema } from "@/lib/validation/schemas";

export async function createSynthesisNote(
  input: unknown,
  options?: { withAiDraft?: boolean }
): Promise<ActionResult & { notice?: string }> {
  const parsed = synthesisCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  let body = parsed.data.body_md.trim() ? parsed.data.body_md : synthesisTemplate(parsed.data.kind);
  let aiDraft: string | null = null;
  let noDraftReason: string | null = null;

  if (options?.withAiDraft) {
    if (!aiEnabled()) {
      return { ok: false, error: "AI drafting is not configured (OPENAI_API_KEY missing)." };
    }
    try {
      const result = await draftSynthesis(supabase, parsed.data.kind, parsed.data.period_start);
      if (result.draft) {
        aiDraft = result.draft;
        // The draft becomes the starting body; the original stays in ai_draft_md
        // so your edits never destroy the record of what the AI actually wrote.
        body = result.draft;
      } else {
        noDraftReason = result.reason ?? "No recorded activity in this period.";
      }
    } catch (error) {
      return {
        ok: false,
        error: `AI drafting failed: ${error instanceof Error ? error.message : "unknown error"}`,
      };
    }
  }

  const { data, error } = await supabase
    .from("synthesis_notes")
    .insert({ ...parsed.data, body_md: body, ai_draft_md: aiDraft, user_id: user.id })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: `A ${parsed.data.kind} synthesis note for this period already exists.`,
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/synthesis");
  revalidatePath("/dashboard");
  redirect(
    noDraftReason
      ? `/synthesis/${data.id}?notice=${encodeURIComponent(noDraftReason)}`
      : `/synthesis/${data.id}`
  );
}

/** Marks a synthesis note as reviewed/approved by the user. */
export async function approveSynthesis(noteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("synthesis_notes")
    .update({ approved_at: new Date().toISOString() })
    .eq("id", noteId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/synthesis");
  revalidatePath(`/synthesis/${noteId}`);
  return { ok: true };
}

/** Autosave target for a synthesis note body. */
export async function saveSynthesisBody(noteId: string, bodyMd: string): Promise<SaveResult> {
  if (bodyMd.length > 200000) return { ok: false, error: "Content too long" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated — sign in again" };

  const { data, error } = await supabase
    .from("synthesis_notes")
    .update({ body_md: bodyMd })
    .eq("id", noteId)
    .select("updated_at")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/synthesis");
  return { ok: true, savedAt: data.updated_at };
}

export async function updateSynthesisTitle(input: unknown): Promise<ActionResult> {
  const parsed = synthesisUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const { id, ...fields } = parsed.data;
  const { error } = await supabase.from("synthesis_notes").update(fields).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/synthesis");
  revalidatePath(`/synthesis/${id}`);
  return { ok: true };
}
