import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { FilterBar } from "@/components/papers/filter-bar";
import { PaperListCompact, PaperListDetailed } from "@/components/papers/paper-list";
import { Button } from "@/components/ui/button";
import { facetValues, filterPapers, parsePaperFilters, sortPapers } from "@/lib/papers/filters";
import { fetchPaperLibrary } from "@/lib/papers/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Papers" };

export default async function PapersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parsePaperFilters(params);

  const supabase = await createClient();
  const [library, topicsRes, trashRes] = await Promise.all([
    fetchPaperLibrary(supabase),
    supabase.from("topics").select("name, slug").order("name"),
    supabase
      .from("papers")
      .select("id", { count: "exact", head: true })
      .not("deleted_at", "is", null),
  ]);
  const trashCount = trashRes.count ?? 0;

  const { organisations, years } = facetValues(library);
  const visible = sortPapers(filterPapers(library, filters), filters.sort);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Paper library</h1>
          <p className="text-sm text-muted-foreground">
            {library.length} paper{library.length === 1 ? "" : "s"} in your library
          </p>
        </div>
        <div className="flex items-center gap-2">
          {trashCount > 0 ? (
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link href="/papers/trash">
                <Trash2 className="size-4" /> Trash ({trashCount})
              </Link>
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link href="/papers/new">
              <Plus className="size-4" /> Add paper
            </Link>
          </Button>
        </div>
      </div>

      <FilterBar
        filters={filters}
        organisations={organisations}
        years={years}
        topics={topicsRes.data ?? []}
        resultCount={visible.length}
      />

      {visible.length === 0 ? (
        <div className="rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {library.length === 0
              ? "Your library is empty. Run `npm run seed` for the starter library, or add a paper manually."
              : "No papers match these filters."}
          </p>
        </div>
      ) : filters.view === "compact" ? (
        <PaperListCompact papers={visible} />
      ) : (
        <PaperListDetailed papers={visible} />
      )}
    </div>
  );
}
