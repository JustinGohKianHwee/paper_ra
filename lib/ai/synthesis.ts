import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPTY_USAGE, getOpenAI, structuredCompletion } from "@/lib/ai/client";
import { buildSynthesisPrompt } from "@/lib/ai/prompts";
import type { Database, SynthesisKind } from "@/lib/supabase/database.types";
import { synthesisTemplate } from "@/lib/templates/synthesis";

type Client = SupabaseClient<Database>;

function periodEnd(kind: SynthesisKind, periodStart: string): string {
  const start = new Date(`${periodStart}T00:00:00Z`);
  const end = new Date(start);
  if (kind === "weekly") end.setUTCDate(end.getUTCDate() + 7);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end.toISOString();
}

/**
 * Collects the period's recorded activity as a compact plain-text digest.
 * Exposed for testing; contains no AI calls.
 */
export async function collectPeriodActivity(
  supabase: Client,
  kind: SynthesisKind,
  periodStart: string
): Promise<string> {
  const startIso = new Date(`${periodStart}T00:00:00Z`).toISOString();
  const endIso = periodEnd(kind, periodStart);

  const [papersRes, sessionsRes, annotationsRes, misconceptionsRes, conceptsRes, experimentsRes] =
    await Promise.all([
      supabase
        .from("papers")
        .select("title, reading_status, updated_at")
        .is("deleted_at", null)
        .gte("updated_at", startIso)
        .lt("updated_at", endIso)
        .order("updated_at", { ascending: false })
        .limit(30),
      supabase
        .from("reading_sessions")
        .select("minutes, takeaway_md, continue_md, papers(title)")
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .limit(30),
      supabase
        .from("paper_annotations")
        .select("kind, body_md, resolved, papers(title)")
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .limit(60),
      supabase
        .from("misconception_corrections")
        .select("initial_belief_md, corrected_understanding_md, papers(title)")
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .limit(20),
      supabase
        .from("concepts")
        .select("name, plain_definition_md")
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .limit(20),
      supabase
        .from("experiments")
        .select("title, status, interpretation_md")
        .gte("updated_at", startIso)
        .lt("updated_at", endIso)
        .limit(20),
    ]);

  const clip = (s: string | null | undefined, n = 300) =>
    (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const paperTitle = (row: { papers: unknown }) =>
    (row.papers as { title?: string } | null)?.title ?? "(unknown paper)";

  const parts: string[] = [];

  const papers = papersRes.data ?? [];
  if (papers.length > 0) {
    parts.push(
      "PAPERS TOUCHED:\n" + papers.map((p) => `- ${p.title} [${p.reading_status}]`).join("\n")
    );
  }
  const sessions = sessionsRes.data ?? [];
  if (sessions.length > 0) {
    parts.push(
      "READING SESSIONS:\n" +
        sessions
          .map(
            (s) =>
              `- ${paperTitle(s)} (${s.minutes ?? "?"} min)` +
              (s.takeaway_md ? ` — takeaway: ${clip(s.takeaway_md)}` : "") +
              (s.continue_md ? ` — continue: ${clip(s.continue_md, 120)}` : "")
          )
          .join("\n")
    );
  }
  const annotations = annotationsRes.data ?? [];
  if (annotations.length > 0) {
    parts.push(
      "READING ANNOTATIONS:\n" +
        annotations
          .map(
            (a) =>
              `- [${a.kind}${a.kind === "question" && !a.resolved ? ", unresolved" : ""}] ${paperTitle(a)}: ${clip(a.body_md)}`
          )
          .join("\n")
    );
  }
  const misconceptions = misconceptionsRes.data ?? [];
  if (misconceptions.length > 0) {
    parts.push(
      "MISCONCEPTIONS CORRECTED:\n" +
        misconceptions
          .map(
            (m) =>
              `- Believed: ${clip(m.initial_belief_md, 200)} → Corrected: ${clip(m.corrected_understanding_md, 200)} (${paperTitle(m)})`
          )
          .join("\n")
    );
  }
  const concepts = conceptsRes.data ?? [];
  if (concepts.length > 0) {
    parts.push(
      "NEW CONCEPTS:\n" +
        concepts.map((c) => `- ${c.name}: ${clip(c.plain_definition_md, 150)}`).join("\n")
    );
  }
  const experiments = experimentsRes.data ?? [];
  if (experiments.length > 0) {
    parts.push(
      "EXPERIMENTS UPDATED:\n" +
        experiments
          .map(
            (e) =>
              `- ${e.title} [${e.status}]${e.interpretation_md ? `: ${clip(e.interpretation_md)}` : ""}`
          )
          .join("\n")
    );
  }

  return parts.join("\n\n");
}

const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["draft_md"],
  properties: {
    draft_md: { type: "string", description: "The full synthesis draft in Markdown" },
  },
} as const;

export interface SynthesisDraftResult {
  draft: string | null;
  /** Why no draft was produced (no activity / no AI). */
  reason?: string;
}

/** Drafts a synthesis from recorded activity. Returns null draft when there is nothing to synthesise. */
export async function draftSynthesis(
  supabase: Client,
  kind: SynthesisKind,
  periodStart: string
): Promise<SynthesisDraftResult> {
  const activity = await collectPeriodActivity(supabase, kind, periodStart);
  if (!activity.trim()) {
    return { draft: null, reason: "No recorded activity in this period to synthesise." };
  }

  const prompt = buildSynthesisPrompt({
    kind,
    periodStart,
    activity,
    templateQuestions: synthesisTemplate(kind),
  });

  const { data } = await structuredCompletion<{ draft_md: string }>({
    client: getOpenAI(),
    system: prompt.system,
    user: prompt.user,
    schemaName: "synthesis_draft",
    schema: DRAFT_SCHEMA as unknown as Record<string, unknown>,
    usage: EMPTY_USAGE,
  });
  return { draft: data.draft_md };
}
