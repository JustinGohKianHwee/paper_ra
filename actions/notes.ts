"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PaperSectionTypeDb } from "@/lib/supabase/database.types";
import { sectionPosition, type PaperSectionType } from "@/lib/templates/paper";
import { noteSectionUpsertSchema } from "@/lib/validation/schemas";

export interface SaveResult {
  ok: boolean;
  error?: string;
  savedAt?: string;
}

/**
 * Autosave target for a single structured paper section. Bound from the paper
 * page as `saveSection.bind(null, paperId, sectionType)`.
 */
export async function saveSection(
  paperId: string,
  sectionType: PaperSectionType,
  bodyMd: string
): Promise<SaveResult> {
  const parsed = noteSectionUpsertSchema.safeParse({
    paper_id: paperId,
    section_type: sectionType,
    body_md: bodyMd,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated — sign in again" };

  const { data, error } = await supabase
    .from("paper_notes")
    .upsert(
      {
        user_id: user.id,
        paper_id: paperId,
        section_type: sectionType as PaperSectionTypeDb,
        body_md: parsed.data.body_md,
        position: sectionPosition(sectionType),
      },
      { onConflict: "paper_id,section_type" }
    )
    .select("updated_at")
    .single();

  if (error) return { ok: false, error: error.message };

  // Keep the parent paper's updated_at fresh for "recently edited".
  await supabase.from("papers").update({ updated_at: new Date().toISOString() }).eq("id", paperId);

  revalidatePath("/dashboard");
  return { ok: true, savedAt: data.updated_at };
}
