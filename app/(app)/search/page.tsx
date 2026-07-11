import type { Metadata } from "next";
import Link from "next/link";
import { SearchInput } from "@/app/(app)/search/search-input";
import { Badge } from "@/components/ui/badge";
import {
  SEARCH_KIND_LABELS,
  excerptParts,
  searchResultHref,
  type SearchResult,
} from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let results: SearchResult[] = [];
  let error: string | null = null;

  if (query.length >= 2) {
    const supabase = await createClient();
    const { data, error: searchError } = await supabase.rpc("search_all", { query });
    if (searchError) {
      error = searchError.message;
    } else {
      results = (data ?? []) as SearchResult[];
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Full-text search across papers, structured notes, concepts, experiments, misconceptions,
          and synthesis notes.
        </p>
      </div>

      <SearchInput initialQuery={query} />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Search failed: {error}
        </p>
      ) : null}

      {query.length >= 2 && !error ? (
        results.length === 0 ? (
          <div className="rounded-md border border-dashed px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">No matches for “{query}”.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {results.map((r) => (
              <li key={`${r.kind}-${r.id}-${r.title}`} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={searchResultHref(r)}
                      className="font-medium hover:underline underline-offset-4"
                    >
                      {r.title}
                    </Link>
                    {r.excerpt ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {excerptParts(r.excerpt).map((part, i) =>
                          part.bold ? (
                            <b key={i} className="font-semibold text-foreground">
                              {part.text}
                            </b>
                          ) : (
                            <span key={i}>{part.text}</span>
                          )
                        )}
                      </p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="outline" className="font-normal">
                        {SEARCH_KIND_LABELS[r.kind] ?? r.kind}
                      </Badge>
                      {r.reading_status ? <span>{r.reading_status.replace(/_/g, " ")}</span> : null}
                      {(r.topic_names ?? []).map((t) => (
                        <span key={t}>· {t}</span>
                      ))}
                      <span>
                        · edited{" "}
                        {new Date(r.updated_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          Type at least two characters. Tip:{" "}
          <kbd className="rounded border bg-muted px-1">Ctrl</kbd>+
          <kbd className="rounded border bg-muted px-1">K</kbd> opens the command palette from
          anywhere.
        </p>
      )}
    </div>
  );
}
