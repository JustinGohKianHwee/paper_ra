import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Synthesis" };

export default async function SynthesisListPage() {
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("synthesis_notes")
    .select("id, kind, period_start, title, updated_at, ai_draft_md, approved_at")
    .order("period_start", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Synthesis notes</h1>
          <p className="text-sm text-muted-foreground">
            Weekly and monthly consolidation — where individual papers become a mental model.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/synthesis/new">
            <Plus className="size-4" /> New synthesis
          </Link>
        </Button>
      </div>

      {(notes ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No synthesis notes yet. Write one at the end of each week; the template asks the right
            questions.
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {(notes ?? []).map((n) => (
            <li key={n.id} className="flex items-center gap-3 py-2.5">
              <Badge variant="outline" className="w-16 justify-center font-normal">
                {n.kind}
              </Badge>
              <Link
                href={`/synthesis/${n.id}`}
                className="min-w-0 truncate text-sm font-medium hover:underline underline-offset-4"
              >
                {n.title}
              </Link>
              {n.ai_draft_md && !n.approved_at ? (
                <Badge
                  variant="outline"
                  className="shrink-0 font-normal border-violet-500/40 text-violet-700 dark:text-violet-400"
                >
                  AI draft — review
                </Badge>
              ) : null}
              {n.approved_at ? (
                <Badge
                  variant="outline"
                  className="shrink-0 font-normal border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
                >
                  approved
                </Badge>
              ) : null}
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {n.period_start}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
