"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SaveResult } from "@/actions/notes";
import type { ActionResult } from "@/actions/papers";
import { createClient } from "@/lib/supabase/server";
import { synthesisTemplate } from "@/lib/templates/synthesis";
import { synthesisCreateSchema, synthesisUpdateSchema } from "@/lib/validation/schemas";

export async function createSynthesisNote(input: unknown): Promise<ActionResult> {
  const parsed = synthesisCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const body = parsed.data.body_md.trim()
    ? parsed.data.body_md
    : synthesisTemplate(parsed.data.kind);

  const { data, error } = await supabase
    .from("synthesis_notes")
    .insert({ ...parsed.data, body_md: body, user_id: user.id })
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
  redirect(`/synthesis/${data.id}`);
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
