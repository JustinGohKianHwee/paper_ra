import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PaperRow } from "@/lib/supabase/database.types";
import type { PaperLibraryItem } from "@/lib/papers/filters";

type Client = SupabaseClient<Database>;

/**
 * Loads the full library with topic links, open-question flags, and
 * experiment counts. Personal libraries are small; three cheap queries beat a
 * complicated join for clarity.
 */
export async function fetchPaperLibrary(supabase: Client): Promise<PaperLibraryItem[]> {
  const [papersRes, topicLinksRes, openQuestionRes, questionAnnotationsRes, experimentLinksRes] =
    await Promise.all([
      supabase.from("papers").select("*"),
      supabase.from("paper_topics").select("paper_id, topics(name, slug)"),
      supabase.from("paper_notes").select("paper_id, body_md").eq("section_type", "open_questions"),
      supabase
        .from("paper_annotations")
        .select("paper_id")
        .eq("kind", "question")
        .eq("resolved", false),
      supabase.from("experiment_papers").select("paper_id"),
    ]);

  if (papersRes.error) throw new Error(`Failed to load papers: ${papersRes.error.message}`);

  const topicsByPaper = new Map<string, { name: string; slug: string }[]>();
  for (const link of topicLinksRes.data ?? []) {
    const topic = link.topics as unknown as { name: string; slug: string } | null;
    if (!topic) continue;
    const existing = topicsByPaper.get(link.paper_id) ?? [];
    existing.push(topic);
    topicsByPaper.set(link.paper_id, existing);
  }

  // Unresolved question annotations (reading flow) or a non-empty legacy
  // open-questions section both count.
  const openQuestionPapers = new Set([
    ...(openQuestionRes.data ?? []).filter((n) => hasRealContent(n.body_md)).map((n) => n.paper_id),
    ...(questionAnnotationsRes.data ?? []).map((a) => a.paper_id),
  ]);

  const experimentCounts = new Map<string, number>();
  for (const link of experimentLinksRes.data ?? []) {
    experimentCounts.set(link.paper_id, (experimentCounts.get(link.paper_id) ?? 0) + 1);
  }

  return ((papersRes.data ?? []) as PaperRow[]).map((p) => ({
    ...p,
    topics: (topicsByPaper.get(p.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    has_open_questions: openQuestionPapers.has(p.id),
    experiment_count: experimentCounts.get(p.id) ?? 0,
  }));
}

/** True when a Markdown body has content beyond headings/whitespace/TODO stubs. */
export function hasRealContent(bodyMd: string | null | undefined): boolean {
  if (!bodyMd) return false;
  const stripped = bodyMd
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n")
    .trim();
  return stripped.length > 0;
}
