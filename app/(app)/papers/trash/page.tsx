import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { DeleteForeverButton, RestorePaperButton } from "@/components/papers/delete-paper-dialog";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Trash" };

export default async function TrashPage() {
  const supabase = await createClient();
  const { data: papers } = await supabase
    .from("papers")
    .select("id, title, slug, authors, year, deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  return (
    <div className="max-w-3xl space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Trash2 className="size-5 text-muted-foreground" aria-hidden />
          <h1 className="text-lg font-semibold tracking-tight">Trash</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Trashed papers are hidden from your library, search, dashboard, and Radar. Restore them
          intact — notes, annotations, sessions, and AI content included — or delete them forever.
        </p>
        <Link
          href="/papers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to papers
        </Link>
      </div>

      {(papers ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          The trash is empty.
        </div>
      ) : (
        <ul className="space-y-2">
          {(papers ?? []).map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    p.authors.slice(0, 3).join(", ") + (p.authors.length > 3 ? " et al." : ""),
                    p.year,
                    p.deleted_at
                      ? `trashed ${new Date(p.deleted_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <RestorePaperButton paperId={p.id} />
                <DeleteForeverButton paperId={p.id} title={p.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
