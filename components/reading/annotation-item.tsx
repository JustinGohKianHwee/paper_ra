"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAnnotation, updateAnnotation } from "@/actions/annotations";
import { MarkdownView } from "@/components/markdown-view";
import { QaThread } from "@/components/reading/qa-thread";
import { KindBadge } from "@/components/status-badges";
import type { PaperAnnotationRow, PaperQaRow } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export function AnnotationItem({
  annotation,
  qa = [],
  aiEnabled = false,
}: {
  annotation: PaperAnnotationRow;
  /** Grounded Q&A thread (question annotations only). */
  qa?: PaperQaRow[];
  aiEnabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleResolved() {
    startTransition(async () => {
      const result = await updateAnnotation({
        id: annotation.id,
        resolved: !annotation.resolved,
      });
      if (result.ok) router.refresh();
      else toast.error(result.error ?? "Update failed");
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteAnnotation(annotation.id);
      if (result.ok) router.refresh();
      else toast.error(result.error ?? "Delete failed");
    });
  }

  return (
    <div
      className={cn("group rounded-md border px-2.5 py-1.5", annotation.resolved && "opacity-60")}
    >
      <div className="flex items-center gap-2">
        <KindBadge kind={annotation.kind} className="text-[10px]" />
        <span className="text-[11px] text-muted-foreground">
          {new Date(annotation.created_at).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          })}
        </span>
        <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {annotation.kind === "question" ? (
            <button
              type="button"
              onClick={toggleResolved}
              disabled={pending}
              className="text-muted-foreground hover:text-foreground"
              title={annotation.resolved ? "Reopen question" : "Mark resolved"}
              aria-label={annotation.resolved ? "Reopen question" : "Mark question resolved"}
            >
              {annotation.resolved ? (
                <CheckCircle2 className="size-3.5 text-emerald-600" />
              ) : (
                <Circle className="size-3.5" />
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
            title="Delete"
            aria-label="Delete annotation"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-1">
        <MarkdownView markdown={annotation.body_md} />
      </div>
      {annotation.kind === "question" ? (
        <QaThread annotationId={annotation.id} qa={qa} aiEnabled={aiEnabled} />
      ) : null}
      {annotation.kind === "question" && annotation.resolved ? (
        <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">resolved</p>
      ) : null}
    </div>
  );
}
