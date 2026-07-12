import type { Metadata } from "next";
import Link from "next/link";
import { NewConceptDialog } from "@/app/(app)/concepts/new-concept-dialog";
import { Badge } from "@/components/ui/badge";
import { KNOWLEDGE_OBJECTS } from "@/lib/knowledge-objects";
import { hasRealContent } from "@/lib/papers/queries";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Concepts" };

const conceptStyle = KNOWLEDGE_OBJECTS.concept;
const ConceptIcon = conceptStyle.icon;

/**
 * The Concepts glossary: technical reference entries, alphabetical like a
 * textbook index. Each row shows the plain definition and which reference
 * material (equation, failure modes) the entry already has.
 */
export default async function ConceptsPage() {
  const supabase = await createClient();
  const [conceptsRes, linksRes] = await Promise.all([
    supabase.from("concepts").select("*").order("name"),
    supabase.from("paper_concepts").select("concept_id, papers!inner(deleted_at)"),
  ]);

  const counts = new Map<string, number>();
  for (const link of linksRes.data ?? []) {
    const paper = link.papers as unknown as { deleted_at: string | null } | null;
    if (paper?.deleted_at) continue;
    counts.set(link.concept_id, (counts.get(link.concept_id) ?? 0) + 1);
  }

  const concepts = conceptsRes.data ?? [];
  const byLetter = new Map<string, typeof concepts>();
  for (const c of concepts) {
    const letter = /^[a-z]/i.test(c.name) ? c.name[0].toUpperCase() : "#";
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), c]);
  }
  const letters = [...byLetter.keys()].sort();

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <ConceptIcon className={cn("mt-1 size-5", conceptStyle.textClass)} aria-hidden />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Concepts</h1>
            <p className="text-sm text-muted-foreground">
              Your technical reference: definitions, mechanisms, equations, and failure modes,
              linked across papers.
            </p>
          </div>
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
        <div className="space-y-5">
          {letters.map((letter) => (
            <section key={letter}>
              <h2
                className={cn(
                  "border-b pb-1 text-xs font-semibold uppercase tracking-wide",
                  conceptStyle.textClass
                )}
              >
                {letter}
              </h2>
              <ul className="divide-y">
                {(byLetter.get(letter) ?? []).map((c) => {
                  const paperCount = counts.get(c.id) ?? 0;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/concepts/${c.slug}`}
                        className="group flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5"
                      >
                        <span className="text-sm font-medium group-hover:underline underline-offset-4">
                          {c.name}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                          {(c.plain_definition_md ?? "").replace(/[#*`>]/g, "").slice(0, 140) ||
                            "No definition yet"}
                        </span>
                        <span className="ml-auto flex shrink-0 items-center gap-1.5">
                          {hasRealContent(c.equation_md) ? (
                            <Badge variant="outline" className="font-normal text-[10px]">
                              equation
                            </Badge>
                          ) : null}
                          {hasRealContent(c.failure_modes_md) ? (
                            <Badge variant="outline" className="font-normal text-[10px]">
                              failure modes
                            </Badge>
                          ) : null}
                          <span className="text-[11px] text-muted-foreground">
                            {paperCount} paper{paperCount === 1 ? "" : "s"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
