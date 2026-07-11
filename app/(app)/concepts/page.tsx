import type { Metadata } from "next";
import Link from "next/link";
import { NewConceptDialog } from "@/app/(app)/concepts/new-concept-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Concepts" };

export default async function ConceptsPage() {
  const supabase = await createClient();
  const [conceptsRes, linksRes] = await Promise.all([
    supabase.from("concepts").select("*").order("name"),
    supabase.from("paper_concepts").select("concept_id"),
  ]);

  const counts = new Map<string, number>();
  for (const link of linksRes.data ?? []) {
    counts.set(link.concept_id, (counts.get(link.concept_id) ?? 0) + 1);
  }

  const concepts = conceptsRes.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Concepts</h1>
          <p className="text-sm text-muted-foreground">
            Reusable techniques and mechanisms, linked across papers.
          </p>
        </div>
        <NewConceptDialog />
      </div>

      {concepts.length === 0 ? (
        <div className="rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No concepts yet — run `npm run seed` or add one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {concepts.map((c) => (
            <Link key={c.id} href={`/concepts/${c.slug}`}>
              <Card className="h-full py-4 transition-colors hover:bg-accent/40">
                <CardContent className="space-y-1 px-4">
                  <p className="font-medium leading-snug">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {counts.get(c.id) ?? 0} linked paper{(counts.get(c.id) ?? 0) === 1 ? "" : "s"}
                  </p>
                  {c.plain_definition_md ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {c.plain_definition_md.replace(/[#*`>]/g, "").slice(0, 160)}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
