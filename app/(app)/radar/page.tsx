import type { Metadata } from "next";
import Link from "next/link";
import { Radar } from "lucide-react";
import { CandidateCard } from "@/components/radar/candidate-card";
import { RadarRefreshControls } from "@/components/radar/refresh-controls";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Research Radar" };

// Radar refreshes call arXiv and (optionally) OpenAI; give them headroom.
export const maxDuration = 300;

/**
 * Recommendation-first Radar: candidates are inferred from the library at
 * refresh time — no separate interest profile to maintain. Refresh is
 * user-triggered only in v1 (no background jobs).
 */
export default async function RadarPage() {
  const supabase = await createClient();

  const [queueRes, deferredRes, decidedRes, lastRunRes, libraryCountRes] = await Promise.all([
    supabase
      .from("radar_candidates")
      .select("*")
      .in("status", ["fetched", "scored", "in_review"])
      .order("score", { ascending: false, nullsFirst: false })
      .limit(30),
    supabase
      .from("radar_candidates")
      .select("*")
      .eq("status", "deferred")
      .order("score", { ascending: false, nullsFirst: false })
      .limit(20),
    supabase
      .from("radar_candidates")
      .select("id, title, status, decided_at, accepted_paper_id, papers:accepted_paper_id(slug)")
      .in("status", ["accepted", "dismissed"])
      .order("decided_at", { ascending: false })
      .limit(5),
    supabase
      .from("radar_runs")
      .select("created_at, status, error, candidates_fetched, candidates_added, query_context")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("papers").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ]);

  const queue = queueRes.data ?? [];
  const deferred = deferredRes.data ?? [];
  const lastRun = lastRunRes.data;
  const libraryCount = libraryCountRes.count ?? 0;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Radar className="size-5 text-muted-foreground" aria-hidden />
          <h1 className="text-lg font-semibold tracking-tight">Research Radar</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          What might you want to read next? Recommendations are inferred from your library — the
          papers you study, your topics and concepts, recent questions, and your past accept and
          dismiss decisions. Nothing enters your library without your explicit accept, and accepted
          papers arrive honestly unread.
        </p>
      </div>

      <RadarRefreshControls />

      {lastRun ? (
        <p className="text-xs text-muted-foreground">
          Last refresh{" "}
          {new Date(lastRun.created_at).toLocaleString(undefined, {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {lastRun.query_context ? ` (topic search: “${lastRun.query_context}”)` : ""} —{" "}
          {lastRun.status === "failed"
            ? `failed: ${lastRun.error}`
            : `${lastRun.candidates_fetched} fetched, ${lastRun.candidates_added} new after dedup`}
        </p>
      ) : null}

      {queue.length === 0 ? (
        <div className="rounded-md border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          {libraryCount === 0 ? (
            <>
              Your library is empty, so there is nothing to infer interests from yet. Add a few
              papers first, or try a one-off topic search above.
            </>
          ) : (
            <>No open recommendations. Press “Refresh recommendations” to scan for recent papers.</>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((c) => (
            <CandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      )}

      {deferred.length > 0 ? (
        <details className="rounded-md border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Deferred ({deferred.length})
          </summary>
          <div className="mt-3 space-y-3">
            {deferred.map((c) => (
              <CandidateCard key={c.id} candidate={c} />
            ))}
          </div>
        </details>
      ) : null}

      {(decidedRes.data ?? []).length > 0 ? (
        <section className="space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent decisions
          </h2>
          <ul className="space-y-1 text-sm">
            {(decidedRes.data ?? []).map((c) => {
              const paper = c.papers as unknown as { slug: string } | null;
              return (
                <li key={c.id} className="flex items-center gap-2">
                  <span
                    className={
                      c.status === "accepted"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }
                  >
                    {c.status}
                  </span>
                  {c.status === "accepted" && paper ? (
                    <Link
                      href={`/papers/${paper.slug}`}
                      className="min-w-0 truncate hover:underline underline-offset-4"
                    >
                      {c.title}
                    </Link>
                  ) : (
                    <span className="min-w-0 truncate text-muted-foreground">{c.title}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        Radar uses paper metadata and abstracts only (arXiv API) plus deterministic local scoring;
        when an OpenAI key is configured, the top few candidates also get a short model-written
        explanation (usage recorded per refresh). Candidate PDFs are never downloaded or summarised.
      </p>
    </div>
  );
}
