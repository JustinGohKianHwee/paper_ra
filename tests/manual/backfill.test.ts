/**
 * One-time AI backfill: runs every un-processed paper in the target database
 * through the REAL processing pipeline (extract text -> passages/AI summaries ->
 * AI note drafts -> suggestions), the same code the "Process" button runs.
 *
 * `npm run seed` deliberately makes NO LLM calls, so a freshly-seeded library
 * has metadata + hand-authored notes but no AI summaries. This fills that in.
 *
 * Run it (needs a real OPENAI_API_KEY, costs a few cents per paper):
 *   npm run backfill
 *
 * Target: whatever `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in
 * `.env.local` point at — local by default; set the cloud values to backfill a
 * deployed database. Idempotent: papers already `done` are skipped, so it is
 * safe to re-run (e.g. after adding more papers).
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { describe, it } from "vitest";
import { runPaperPipeline } from "@/lib/ai/pipeline";
import type { Database } from "@/lib/supabase/database.types";

loadEnv({ path: ".env.local" });

const enabled = Boolean(process.env.OPENAI_API_KEY) && !process.env.OPENAI_BASE_URL;

describe.skipIf(!enabled)("AI backfill (real OpenAI)", () => {
  it("processes every un-processed paper end-to-end", { timeout: 60 * 60_000 }, backfill);
});

function hasSource(p: {
  arxiv_id: string | null;
  pdf_url: string | null;
  source_input: string | null;
}): boolean {
  return Boolean(p.arxiv_id || p.pdf_url || p.source_input?.startsWith("storage:"));
}

async function backfill() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  }
  // This backfill deliberately runs many pipelines at once; lift the hourly cap
  // for this process only (the running app keeps its own configured limit).
  process.env.AI_MAX_RUNS_PER_HOUR = "1000000";

  console.log(`Model: ${process.env.OPENAI_MODEL || "gpt-5-mini (default)"}`);
  console.log(`Target: ${url}`);

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: papers, error } = await supabase
    .from("papers")
    .select("id, user_id, title, arxiv_id, pdf_url, source_input, processing_status")
    .is("deleted_at", null)
    .neq("processing_status", "done")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const withSource = (papers ?? []).filter(hasSource);
  const skipped = (papers ?? []).filter((p) => !hasSource(p));
  console.log(
    `\n${papers?.length ?? 0} un-processed paper(s); ${withSource.length} with a fetchable source, ${skipped.length} skipped (no PDF/arXiv source).\n`
  );
  for (const p of skipped) console.log(`  skip (no source): ${p.title}`);

  let done = 0;
  let failed = 0;
  for (const [i, paper] of withSource.entries()) {
    const label = `[${i + 1}/${withSource.length}] ${paper.title}`;
    process.stdout.write(`\n${label}\n  processing… `);
    const started = Date.now();
    try {
      const result = await runPaperPipeline(supabase, paper.user_id, paper.id);
      const secs = Math.round((Date.now() - started) / 1000);
      if (result.status === "done") {
        done++;
        console.log(`done (${secs}s)`);
      } else {
        failed++;
        console.log(`FAILED (${secs}s): ${result.error ?? "unknown"}`);
      }
    } catch (e) {
      failed++;
      console.log(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
    // Be gentle on arXiv's PDF endpoint between papers.
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(
    `\n\nBackfill complete: ${done} processed, ${failed} failed, ${skipped.length} skipped.`
  );
}
