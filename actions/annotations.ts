"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/actions/papers";
import { createClient } from "@/lib/supabase/server";

const annotationCreateSchema = z.object({
  paper_id: z.string().uuid(),
  passage_id: z.string().uuid().optional().nullable(),
  kind: z.enum(["note", "question", "correction", "idea"]).default("note"),
  body_md: z.string().trim().min(1, "Write something first").max(20000),
});

export async function createAnnotation(input: unknown): Promise<ActionResult & { id?: string }> {
  const parsed = annotationCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("paper_annotations")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}

const annotationUpdateSchema = z.object({
  id: z.string().uuid(),
  body_md: z.string().trim().min(1).max(20000).optional(),
  resolved: z.boolean().optional(),
});

export async function updateAnnotation(input: unknown): Promise<ActionResult> {
  const parsed = annotationUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const { id, ...fields } = parsed.data;
  const { error } = await supabase.from("paper_annotations").update(fields).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteAnnotation(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("paper_annotations").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}
