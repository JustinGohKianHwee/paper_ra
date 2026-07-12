"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/actions/papers";
import { refreshRadar } from "@/lib/radar/refresh";
import { slugify, uniqueSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { newPaperSectionRows } from "@/lib/templates/paper";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

const refreshSchema = z.object({
  query: z.string().trim().max(200).optional(),
});

/** User-triggered refresh — no background jobs in v1. */
export async function refreshRecommendations(
  input: unknown
): Promise<ActionResult & { added?: number }> {
  const parsed = refreshSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await requireUser();
  const result = await refreshRadar(supabase, user.id, { query: parsed.data.query });
  revalidatePath("/radar");
  if (result.error) return { ok: false, error: result.error };
  return { ok: true, added: result.added };
}

const decisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["accepted", "dismissed", "deferred"]),
});

/**
 * Records a queue decision. Accepting creates an HONEST paper: metadata-only,
 * queued to read — never marked read/verified, and the Radar's generated
 * "why" text does not become canonical notes.
 */
export async function decideCandidate(
  input: unknown
): Promise<ActionResult & { paperSlug?: string }> {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await requireUser();

  const { data: candidate } = await supabase
    .from("radar_candidates")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!candidate) return { ok: false, error: "Candidate not found" };

  if (parsed.data.decision !== "accepted") {
    const { error } = await supabase
      .from("radar_candidates")
      .update({ status: parsed.data.decision, decided_at: new Date().toISOString() })
      .eq("id", candidate.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/radar");
    return { ok: true };
  }

  // ---- accept: create the library paper -----------------------------------
  const base = slugify(candidate.title);
  const { data: existing } = await supabase.from("papers").select("slug").like("slug", `${base}%`);
  const slug = uniqueSlug(base, new Set((existing ?? []).map((r) => r.slug)));

  const { data: paper, error: paperError } = await supabase
    .from("papers")
    .insert({
      user_id: user.id,
      title: candidate.title,
      slug,
      authors: candidate.authors,
      abstract: candidate.abstract,
      arxiv_id: candidate.arxiv_id,
      doi: candidate.doi,
      canonical_url: candidate.url ?? "",
      pdf_url: candidate.arxiv_id ? `https://arxiv.org/pdf/${candidate.arxiv_id}` : "",
      venue: candidate.provider === "arxiv" ? "arXiv" : null,
      year: candidate.published_on ? Number(candidate.published_on.slice(0, 4)) : null,
      reading_status: "queued",
      verification_status: "metadata_only",
      priority: 3,
      source_input: `radar:${candidate.id}`,
    })
    .select("id, slug")
    .single();
  if (paperError || !paper) {
    return { ok: false, error: paperError?.message ?? "Could not create paper" };
  }

  const sections = newPaperSectionRows().map((s) => ({
    ...s,
    user_id: user.id,
    paper_id: paper.id,
  }));
  const { error: notesError } = await supabase.from("paper_notes").insert(sections);
  if (notesError) {
    return { ok: false, error: `Paper created but sections failed: ${notesError.message}` };
  }

  // Link the topics the recommendation came from (existing topics only).
  const related = (candidate.related_json ?? {}) as { topics?: string[] };
  const topicNames = related.topics ?? [];
  if (topicNames.length > 0) {
    const { data: topics } = await supabase
      .from("topics")
      .select("id, name")
      .in("name", topicNames);
    if (topics && topics.length > 0) {
      await supabase
        .from("paper_topics")
        .insert(topics.map((t) => ({ user_id: user.id, paper_id: paper.id, topic_id: t.id })));
    }
  }

  const { error: updateError } = await supabase
    .from("radar_candidates")
    .update({
      status: "accepted",
      decided_at: new Date().toISOString(),
      accepted_paper_id: paper.id,
    })
    .eq("id", candidate.id);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/radar");
  revalidatePath("/papers");
  revalidatePath("/dashboard");
  return { ok: true, paperSlug: paper.slug };
}
