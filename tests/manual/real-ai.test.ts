/**
 * One-off real-key verification (deleted after use):
 * resolves real arXiv metadata, creates a paper, runs the full AI pipeline
 * against the real OpenAI API, and prints an audit summary.
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { fetchArxivById } from "@/lib/ai/resolve";
import { runPaperPipeline } from "@/lib/ai/pipeline";
import type { Database } from "@/lib/supabase/database.types";
import { newPaperSectionRows } from "@/lib/templates/paper";

loadEnv({ path: ".env.local" });

import { it, describe } from "vitest";

describe.skipIf(!process.env.RUN_REAL_AI)("real OpenAI verification", () => {
  it("processes a real arXiv paper end-to-end", { timeout: 360000 }, main);
});

async function main() {
  if (process.env.OPENAI_BASE_URL) throw new Error("OPENAI_BASE_URL set — not a real-key run");
  console.log("Model:", process.env.OPENAI_MODEL || "gpt-5-mini (default)");

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const session = await supabase.auth.signInWithPassword({
    email: process.env.SEED_EMAIL!,
    password: process.env.SEED_PASSWORD!,
  });
  if (session.error) throw session.error;
  const userId = session.data.user!.id;

  // 1. Real metadata resolution
  const meta = await fetchArxivById("1706.03762");
  console.log("\n[metadata]", meta?.title, "|", meta?.authors.length, "authors |", meta?.year);
  if (!meta) throw new Error("arXiv metadata resolution failed");

  // 2. Create the paper (skip if a previous verification left it around)
  const slug = "attention-is-all-you-need";
  await supabase.from("papers").delete().eq("slug", slug);
  const { data: paper, error } = await supabase
    .from("papers")
    .insert({
      user_id: userId,
      title: meta.title,
      slug,
      authors: meta.authors,
      abstract: meta.abstract,
      year: meta.year,
      venue: meta.venue,
      arxiv_id: meta.arxivId,
      canonical_url: meta.canonicalUrl,
      pdf_url: meta.pdfUrl,
      source_input: "https://arxiv.org/abs/1706.03762",
      processing_status: "queued",
    })
    .select("id")
    .single();
  if (error) throw error;
  await supabase
    .from("paper_notes")
    .insert(newPaperSectionRows().map((s) => ({ ...s, user_id: userId, paper_id: paper.id })));

  // 3. Real pipeline
  console.log("\n[pipeline] running (real OpenAI + real arXiv PDF)…");
  const started = Date.now();
  const result = await runPaperPipeline(supabase, userId, paper.id);
  console.log(
    "[pipeline]",
    result.status,
    result.error ?? "",
    `(${Math.round((Date.now() - started) / 1000)}s)`
  );

  // 4. Audit
  const { data: run } = await supabase
    .from("processing_runs")
    .select("stages_completed, model, prompt_version, usage, error")
    .eq("id", result.runId)
    .single();
  console.log("[run]", JSON.stringify(run, null, 1));

  const { data: passages } = await supabase
    .from("paper_passages")
    .select("position, title, anchor, page_start, page_end")
    .eq("paper_id", paper.id)
    .order("position");
  console.log(`\n[passages] ${passages?.length}`);
  for (const p of passages ?? []) {
    console.log(`  ${p.position}. ${p.title} (${p.anchor}, pp.${p.page_start}-${p.page_end})`);
  }

  const { data: notes } = await supabase
    .from("paper_notes")
    .select("section_type, authorship, body_md")
    .eq("paper_id", paper.id)
    .eq("authorship", "ai");
  console.log(`\n[ai notes] ${notes?.length} sections`);
  console.log("  thesis:", notes?.find((n) => n.section_type === "thesis")?.body_md?.slice(0, 160));

  const { data: suggestions } = await supabase
    .from("paper_suggestions")
    .select("kind, payload, status")
    .eq("paper_id", paper.id);
  console.log(`\n[suggestions] ${suggestions?.length}`);
  for (const s of suggestions ?? []) {
    const p = s.payload as { name?: string; value?: number; rationale?: string };
    console.log(`  ${s.kind}: ${p.name ?? p.value} — ${(p.rationale ?? "").slice(0, 90)}`);
  }
}
