"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SaveResult } from "@/actions/notes";
import type { ActionResult } from "@/actions/papers";
import { slugify, uniqueSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { conceptCreateSchema } from "@/lib/validation/schemas";

const EDITABLE_FIELDS = [
  "plain_definition_md",
  "technical_definition_md",
  "equation_md",
  "why_it_helps_md",
  "failure_modes_md",
  "my_implementations_md",
  "misconceptions_md",
] as const;
export type ConceptField = (typeof EDITABLE_FIELDS)[number];

export async function createConcept(input: unknown): Promise<ActionResult> {
  const parsed = conceptCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const base = slugify(parsed.data.name);
  const { data: existing } = await supabase
    .from("concepts")
    .select("slug")
    .like("slug", `${base}%`);
  const slug = uniqueSlug(base, new Set((existing ?? []).map((r) => r.slug)));

  const { data, error } = await supabase
    .from("concepts")
    .insert({ ...parsed.data, user_id: user.id, slug })
    .select("slug")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/concepts");
  redirect(`/concepts/${data.slug}`);
}

/** Autosave target for a concept Markdown field. */
export async function saveConceptField(
  conceptId: string,
  field: ConceptField,
  bodyMd: string
): Promise<SaveResult> {
  if (!EDITABLE_FIELDS.includes(field)) {
    return { ok: false, error: "Unknown field" };
  }
  if (bodyMd.length > 100000) {
    return { ok: false, error: "Content too long" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated — sign in again" };

  const { data, error } = await supabase
    .from("concepts")
    .update({ [field]: bodyMd } as { [K in ConceptField]?: string })
    .eq("id", conceptId)
    .select("updated_at, slug")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/concepts/${data.slug}`);
  return { ok: true, savedAt: data.updated_at };
}
