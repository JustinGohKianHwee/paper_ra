"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/actions/papers";
import { createClient } from "@/lib/supabase/server";

const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

const createSchema = z.object({
  paper_id: z.string().uuid(),
  page_number: z.number().int().min(1),
  selected_text: z.string().trim().min(1).max(10000),
  rects: z.array(rectSchema).max(400),
  color: z.string().trim().max(20).optional(),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/** Persists a highlight over selected PDF text. Returns the new highlight id. */
export async function createHighlight(input: unknown): Promise<ActionResult & { id?: string }> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("paper_highlights")
    .insert({
      user_id: user.id,
      paper_id: parsed.data.paper_id,
      page_number: parsed.data.page_number,
      selected_text: parsed.data.selected_text,
      rects: parsed.data.rects,
      color: parsed.data.color ?? "amber",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/papers");
  return { ok: true, id: data.id };
}

export async function deleteHighlight(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("paper_highlights").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/papers");
  return { ok: true };
}

const noteSchema = z.object({
  highlight_id: z.string().uuid(),
  body_md: z.string().trim().min(1, "Write something first").max(20000),
});

/**
 * Attaches a note to a highlight: creates a `note` annotation carrying the
 * highlight's page + selected text as provenance, then links it back to the
 * highlight. The highlight stays visible on the PDF; the note appears beside it.
 */
export async function addHighlightNote(
  input: unknown
): Promise<ActionResult & { annotationId?: string }> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await requireUser();

  const { data: highlight } = await supabase
    .from("paper_highlights")
    .select("id, paper_id, page_number, selected_text")
    .eq("id", parsed.data.highlight_id)
    .maybeSingle();
  if (!highlight) return { ok: false, error: "Highlight not found" };

  const { data: annotation, error: insertError } = await supabase
    .from("paper_annotations")
    .insert({
      user_id: user.id,
      paper_id: highlight.paper_id,
      kind: "note",
      body_md: parsed.data.body_md,
      page_number: highlight.page_number,
      selected_text: highlight.selected_text,
      anchor: { page: highlight.page_number, quote: { exact: highlight.selected_text } },
    })
    .select("id")
    .single();
  if (insertError || !annotation) {
    return { ok: false, error: insertError?.message ?? "Could not create note" };
  }

  const { error: linkError } = await supabase
    .from("paper_highlights")
    .update({ annotation_id: annotation.id })
    .eq("id", highlight.id);
  if (linkError) return { ok: false, error: linkError.message };

  revalidatePath("/papers");
  return { ok: true, annotationId: annotation.id };
}
