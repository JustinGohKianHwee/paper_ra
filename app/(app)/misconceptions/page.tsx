import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { MisconceptionCard } from "@/components/misconceptions/misconception-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Misconceptions" };

export default async function MisconceptionsPage() {
  const supabase = await createClient();
  const { data: records } = await supabase
    .from("misconception_corrections")
    .select("*, papers(title, slug), concepts(name, slug)")
    .order("corrected_on", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Misconceptions and corrections</h1>
          <p className="text-sm text-muted-foreground">
            What you initially believed, why, and what corrected it — the record of how your
            understanding actually improved.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/misconceptions/new">
            <Plus className="size-4" /> Record misconception
          </Link>
        </Button>
      </div>

      {(records ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing recorded yet. When you catch yourself being wrong about something, write it down
            here — it is the most valuable content in this notebook.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(records ?? []).map((m) => (
            <MisconceptionCard
              key={m.id}
              record={m}
              paper={m.papers as unknown as { title: string; slug: string } | null}
              concept={m.concepts as unknown as { name: string; slug: string } | null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
