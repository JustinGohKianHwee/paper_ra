import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ExperimentStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Experiments" };

export default async function ExperimentsPage() {
  const supabase = await createClient();
  const [experimentsRes, linksRes] = await Promise.all([
    supabase.from("experiments").select("*").order("updated_at", { ascending: false }),
    supabase.from("experiment_papers").select("experiment_id, papers(title, slug)"),
  ]);

  const papersByExperiment = new Map<string, { title: string; slug: string }[]>();
  for (const link of linksRes.data ?? []) {
    const paper = link.papers as unknown as { title: string; slug: string } | null;
    if (!paper) continue;
    const existing = papersByExperiment.get(link.experiment_id) ?? [];
    existing.push(paper);
    papersByExperiment.set(link.experiment_id, existing);
  }

  const experiments = experimentsRes.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Experiments</h1>
          <p className="text-sm text-muted-foreground">
            Your own toy implementations and studies — the proof behind “implemented”.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/experiments/new">
            <Plus className="size-4" /> Record experiment
          </Link>
        </Button>
      </div>

      {experiments.length === 0 ? (
        <div className="rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No experiments recorded yet. A paper only counts as “implemented” once an experiment
            exists.
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {experiments.map((e) => (
            <li key={e.id} className="py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/experiments/${e.slug}`}
                    className="font-medium hover:underline underline-offset-4"
                  >
                    {e.title}
                  </Link>
                  {e.research_question ? (
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                      {e.research_question}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      e.repo_name,
                      e.happened_on,
                      (papersByExperiment.get(e.id) ?? []).map((p) => p.title).join(", "),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <ExperimentStatusBadge status={e.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
