"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/papers";
import { slugify, uniqueSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

interface NamePayload {
  name?: string;
  rationale?: string;
}
interface ValuePayload {
  value?: number;
  rationale?: string;
}

/**
 * Accept or reject an AI suggestion. Accepting applies the change (create+link
 * topic/concept, or set priority/relevance); either way the decision is
 * recorded on the suggestion row for auditing.
 */
export async function decideSuggestion(
  suggestionId: string,
  decision: "accepted" | "rejected"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: suggestion, error } = await supabase
    .from("paper_suggestions")
    .select("*, papers(slug)")
    .eq("id", suggestionId)
    .maybeSingle();
  if (error || !suggestion) return { ok: false, error: error?.message ?? "Suggestion not found" };
  if (suggestion.status !== "proposed") {
    return { ok: false, error: "Suggestion already decided" };
  }

  if (decision === "accepted") {
    const applyError = await applySuggestion(supabase, user.id, suggestion);
    if (applyError) return { ok: false, error: applyError };
  }

  const { error: updateError } = await supabase
    .from("paper_suggestions")
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq("id", suggestionId);
  if (updateError) return { ok: false, error: updateError.message };

  const paperSlug = (suggestion.papers as unknown as { slug: string } | null)?.slug;
  if (paperSlug) revalidatePath(`/papers/${paperSlug}`);
  return { ok: true };
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function applySuggestion(
  supabase: SupabaseServer,
  userId: string,
  suggestion: { kind: string; paper_id: string; payload: unknown }
): Promise<string | null> {
  const payload = (suggestion.payload ?? {}) as NamePayload & ValuePayload;

  switch (suggestion.kind) {
    case "topic": {
      const name = payload.name?.trim();
      if (!name) return "Suggestion has no topic name";
      const { data: existing } = await supabase
        .from("topics")
        .select("id")
        .ilike("name", name)
        .maybeSingle();
      let topicId = existing?.id;
      if (!topicId) {
        const base = slugify(name);
        const { data: slugs } = await supabase
          .from("topics")
          .select("slug")
          .like("slug", `${base}%`);
        const { data: created, error } = await supabase
          .from("topics")
          .insert({
            user_id: userId,
            name,
            slug: uniqueSlug(base, new Set((slugs ?? []).map((s) => s.slug))),
          })
          .select("id")
          .single();
        if (error || !created) return error?.message ?? "Could not create topic";
        topicId = created.id;
      }
      const { error: linkError } = await supabase
        .from("paper_topics")
        .upsert(
          { user_id: userId, paper_id: suggestion.paper_id, topic_id: topicId },
          { onConflict: "paper_id,topic_id", ignoreDuplicates: true }
        );
      return linkError?.message ?? null;
    }

    case "concept": {
      const name = payload.name?.trim();
      if (!name) return "Suggestion has no concept name";
      const { data: existing } = await supabase
        .from("concepts")
        .select("id")
        .ilike("name", name)
        .maybeSingle();
      let conceptId = existing?.id;
      if (!conceptId) {
        const base = slugify(name);
        const { data: slugs } = await supabase
          .from("concepts")
          .select("slug")
          .like("slug", `${base}%`);
        const { data: created, error } = await supabase
          .from("concepts")
          .insert({
            user_id: userId,
            name,
            slug: uniqueSlug(base, new Set((slugs ?? []).map((s) => s.slug))),
            plain_definition_md: payload.rationale
              ? `${payload.rationale}\n\n*AI-suggested while adding a paper — refine this definition.*`
              : null,
          })
          .select("id")
          .single();
        if (error || !created) return error?.message ?? "Could not create concept";
        conceptId = created.id;
      }
      const { error: linkError } = await supabase
        .from("paper_concepts")
        .upsert(
          { user_id: userId, paper_id: suggestion.paper_id, concept_id: conceptId },
          { onConflict: "paper_id,concept_id", ignoreDuplicates: true }
        );
      return linkError?.message ?? null;
    }

    case "priority": {
      const value = Math.min(5, Math.max(1, Math.round(payload.value ?? 3)));
      const { error } = await supabase
        .from("papers")
        .update({ priority: value })
        .eq("id", suggestion.paper_id);
      return error?.message ?? null;
    }

    case "relevance": {
      const value = Math.min(5, Math.max(0, Math.round(payload.value ?? 0)));
      const { data: paper } = await supabase
        .from("papers")
        .select("relevance_note")
        .eq("id", suggestion.paper_id)
        .single();
      const { error } = await supabase
        .from("papers")
        .update({
          relevance: value,
          // Never overwrite the user's own note.
          relevance_note: paper?.relevance_note?.trim()
            ? paper.relevance_note
            : payload.rationale
              ? `${payload.rationale} *(AI-suggested — edit me.)*`
              : null,
        })
        .eq("id", suggestion.paper_id);
      return error?.message ?? null;
    }

    default:
      return `Unknown suggestion kind: ${suggestion.kind}`;
  }
}
