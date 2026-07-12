"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify, uniqueSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { newPaperSectionRows } from "@/lib/templates/paper";
import {
  paperCreateSchema,
  paperRelationCreateSchema,
  paperUpdateSchema,
  readingSessionCreateSchema,
  type PaperCreateInput,
} from "@/lib/validation/schemas";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function createPaper(input: PaperCreateInput): Promise<ActionResult> {
  const parsed = paperCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await requireUser();
  const { topic_ids, concept_ids, ...fields } = parsed.data;

  const base = slugify(fields.title);
  const { data: existing } = await supabase.from("papers").select("slug").like("slug", `${base}%`);
  const slug = uniqueSlug(base, new Set((existing ?? []).map((r) => r.slug)));

  const { data: paper, error } = await supabase
    .from("papers")
    .insert({ ...fields, user_id: user.id, slug })
    .select("id, slug")
    .single();
  if (error || !paper) {
    return { ok: false, error: error?.message ?? "Failed to create paper" };
  }

  // Template sections so every structured section is immediately editable.
  const sections = newPaperSectionRows().map((s) => ({
    ...s,
    user_id: user.id,
    paper_id: paper.id,
  }));
  const { error: notesError } = await supabase.from("paper_notes").insert(sections);
  if (notesError) {
    return { ok: false, error: `Paper created but sections failed: ${notesError.message}` };
  }

  if (topic_ids.length > 0) {
    await supabase
      .from("paper_topics")
      .insert(topic_ids.map((topic_id) => ({ user_id: user.id, paper_id: paper.id, topic_id })));
  }
  if (concept_ids.length > 0) {
    await supabase
      .from("paper_concepts")
      .insert(
        concept_ids.map((concept_id) => ({ user_id: user.id, paper_id: paper.id, concept_id }))
      );
  }

  revalidatePath("/papers");
  redirect(`/papers/${paper.slug}`);
}

export async function updatePaperMeta(input: unknown): Promise<ActionResult> {
  const parsed = paperUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase } = await requireUser();
  const { id, ...fields } = parsed.data;

  const { data, error } = await supabase
    .from("papers")
    .update(fields)
    .eq("id", id)
    .select("slug")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/papers");
  revalidatePath(`/papers/${data.slug}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Soft delete: the paper (and everything attached to it) disappears from the
 * library, search, dashboard, and Radar, but stays restorable from
 * /papers/trash. Nothing is destroyed until "Delete forever".
 */
export async function trashPaper(paperId: string): Promise<ActionResult & { slug?: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("papers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", paperId)
    .select("slug")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/papers");
  revalidatePath("/dashboard");
  return { ok: true, slug: data.slug };
}

export async function restorePaper(paperId: string): Promise<ActionResult & { slug?: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("papers")
    .update({ deleted_at: null })
    .eq("id", paperId)
    .select("slug")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/papers");
  revalidatePath("/dashboard");
  return { ok: true, slug: data.slug };
}

/**
 * Permanent delete. Postgres cascades remove passages, structured notes,
 * annotations, Q&A, extracted pages, sessions, sources, suggestions,
 * processing runs, relations, and topic/concept links. Misconception records
 * survive with their paper link cleared; concepts and topics are untouched.
 * Only allowed from the trash (paper must already be soft-deleted).
 */
export async function deletePaperForever(paperId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data: paper } = await supabase
    .from("papers")
    .select("id, deleted_at, source_input")
    .eq("id", paperId)
    .maybeSingle();
  if (!paper) return { ok: false, error: "Paper not found" };
  if (!paper.deleted_at) {
    return { ok: false, error: "Move the paper to the trash before deleting it permanently." };
  }

  if (paper.source_input?.startsWith("storage:")) {
    // Best effort: remove the uploaded PDF too. A stray object is not fatal.
    await supabase.storage
      .from("paper-attachments")
      .remove([paper.source_input.slice("storage:".length)]);
  }

  const { error } = await supabase.from("papers").delete().eq("id", paperId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/papers");
  revalidatePath("/papers/trash");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Counts shown in the delete confirmation so you know what goes with it. */
export async function relatedRecordCounts(paperId: string): Promise<Record<string, number>> {
  const { supabase } = await requireUser();
  const count = async (table: string, column = "paper_id") => {
    const { count: n } = await supabase
      .from(table as "paper_notes")
      .select("*", { count: "exact", head: true })
      .eq(column, paperId);
    return n ?? 0;
  };
  const [notes, passages, annotations, qa, sessions, sources, suggestions, misconceptions] =
    await Promise.all([
      count("paper_notes"),
      count("paper_passages"),
      count("paper_annotations"),
      count("paper_qa"),
      count("reading_sessions"),
      count("sources"),
      count("paper_suggestions"),
      count("misconception_corrections"),
    ]);
  const { count: relationsOut } = await supabase
    .from("paper_relations")
    .select("*", { count: "exact", head: true })
    .eq("from_paper_id", paperId);
  const { count: relationsIn } = await supabase
    .from("paper_relations")
    .select("*", { count: "exact", head: true })
    .eq("to_paper_id", paperId);
  return {
    notes,
    passages,
    annotations,
    qa,
    sessions,
    sources,
    suggestions,
    misconceptions,
    relations: (relationsOut ?? 0) + (relationsIn ?? 0),
  };
}

export async function setPaperTopics(paperId: string, topicIds: string[]): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error: delError } = await supabase.from("paper_topics").delete().eq("paper_id", paperId);
  if (delError) return { ok: false, error: delError.message };
  if (topicIds.length > 0) {
    const { error } = await supabase
      .from("paper_topics")
      .insert(topicIds.map((topic_id) => ({ user_id: user.id, paper_id: paperId, topic_id })));
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/papers");
  return { ok: true };
}

export async function setPaperConcepts(
  paperId: string,
  conceptIds: string[]
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error: delError } = await supabase
    .from("paper_concepts")
    .delete()
    .eq("paper_id", paperId);
  if (delError) return { ok: false, error: delError.message };
  if (conceptIds.length > 0) {
    const { error } = await supabase
      .from("paper_concepts")
      .insert(
        conceptIds.map((concept_id) => ({ user_id: user.id, paper_id: paperId, concept_id }))
      );
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/papers");
  return { ok: true };
}

export async function addPaperRelation(input: unknown): Promise<ActionResult> {
  const parsed = paperRelationCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (parsed.data.from_paper_id === parsed.data.to_paper_id) {
    return { ok: false, error: "A paper cannot relate to itself" };
  }
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("paper_relations")
    .insert({ ...parsed.data, user_id: user.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/papers");
  return { ok: true };
}

export async function removePaperRelation(relationId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("paper_relations").delete().eq("id", relationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/papers");
  return { ok: true };
}

export async function logReadingSession(input: unknown): Promise<ActionResult> {
  const parsed = readingSessionCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("reading_sessions")
    .insert({ ...parsed.data, user_id: user.id });
  if (error) return { ok: false, error: error.message };

  await supabase
    .from("papers")
    .update({ last_read_at: new Date().toISOString() })
    .eq("id", parsed.data.paper_id);

  revalidatePath("/dashboard");
  return { ok: true };
}
