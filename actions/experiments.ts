"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SaveResult } from "@/actions/notes";
import type { ActionResult } from "@/actions/papers";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { experimentCreateSchema, experimentUpdateSchema } from "@/lib/validation/schemas";

const EDITABLE_MD_FIELDS = [
  "research_question",
  "hypothesis",
  "baseline",
  "treatment",
  "dataset",
  "parameters_md",
  "metrics_md",
  "results_md",
  "segment_results_md",
  "latency_memory_md",
  "interpretation_md",
  "failure_cases_md",
  "next_experiment_md",
] as const;
export type ExperimentField = (typeof EDITABLE_MD_FIELDS)[number];

export async function createExperiment(input: unknown): Promise<ActionResult> {
  const parsed = experimentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { paper_ids, concept_ids, metrics_json, ...fields } = parsed.data;

  const base = slugify(fields.title);
  const { data: existing } = await supabase
    .from("experiments")
    .select("slug")
    .like("slug", `${base}%`);
  const slug = uniqueSlug(base, new Set((existing ?? []).map((r) => r.slug)));

  const { data: experiment, error } = await supabase
    .from("experiments")
    .insert({ ...fields, metrics_json: (metrics_json ?? null) as Json, user_id: user.id, slug })
    .select("id, slug")
    .single();
  if (error) return { ok: false, error: error.message };

  if (paper_ids.length > 0) {
    await supabase.from("experiment_papers").insert(
      paper_ids.map((paper_id) => ({
        user_id: user.id,
        experiment_id: experiment.id,
        paper_id,
      }))
    );
  }
  if (concept_ids.length > 0) {
    await supabase.from("experiment_concepts").insert(
      concept_ids.map((concept_id) => ({
        user_id: user.id,
        experiment_id: experiment.id,
        concept_id,
      }))
    );
  }

  revalidatePath("/experiments");
  redirect(`/experiments/${experiment.slug}`);
}

export async function updateExperimentMeta(input: unknown): Promise<ActionResult> {
  const parsed = experimentUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const { id, metrics_json, ...fields } = parsed.data;

  const { data, error } = await supabase
    .from("experiments")
    .update({
      ...fields,
      ...(metrics_json !== undefined ? { metrics_json: metrics_json as Json } : {}),
    })
    .eq("id", id)
    .select("slug")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/experiments");
  revalidatePath(`/experiments/${data.slug}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Autosave target for an experiment Markdown field. */
export async function saveExperimentField(
  experimentId: string,
  field: ExperimentField,
  bodyMd: string
): Promise<SaveResult> {
  if (!EDITABLE_MD_FIELDS.includes(field)) {
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
    .from("experiments")
    .update({ [field]: bodyMd } as { [K in ExperimentField]?: string })
    .eq("id", experimentId)
    .select("updated_at")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, savedAt: data.updated_at };
}

export async function setExperimentPapers(
  experimentId: string,
  paperIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error: delError } = await supabase
    .from("experiment_papers")
    .delete()
    .eq("experiment_id", experimentId);
  if (delError) return { ok: false, error: delError.message };
  if (paperIds.length > 0) {
    const { error } = await supabase.from("experiment_papers").insert(
      paperIds.map((paper_id) => ({
        user_id: user.id,
        experiment_id: experimentId,
        paper_id,
      }))
    );
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/experiments");
  return { ok: true };
}

export async function setExperimentConcepts(
  experimentId: string,
  conceptIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error: delError } = await supabase
    .from("experiment_concepts")
    .delete()
    .eq("experiment_id", experimentId);
  if (delError) return { ok: false, error: delError.message };
  if (conceptIds.length > 0) {
    const { error } = await supabase.from("experiment_concepts").insert(
      conceptIds.map((concept_id) => ({
        user_id: user.id,
        experiment_id: experimentId,
        concept_id,
      }))
    );
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/experiments");
  return { ok: true };
}
