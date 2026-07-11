"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAnnotation, updateAnnotation } from "@/actions/annotations";
import { MarkdownView } from "@/components/markdown-view";
import { Badge } from "@/components/ui/badge";
import type { PaperAnnotationRow } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export const ANNOTATION_KIND_LABELS: Record<string, string> = {
  note: "Note",
  question: "Question",
  correction: "Correction",
  idea: "Idea",
};

const KIND_STYLES: Record<string, string> = {
  note: "",
  question: "border-blue-500/40 text-blue-700 dark:text-blue-400",
  correction: "border-red-500/40 text-red-700 dark:text-red-400",
  idea: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
};

export function AnnotationItem({ annotation }: { annotation: PaperAnnotationRow }) {
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
    <div className={cn("group rounded-md border px-3 py-2", annotation.resolved && "opacity-60")}>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn("font-normal text-[10px]", KIND_STYLES[annotation.kind])}
        >
          {ANNOTATION_KIND_LABELS[annotation.kind] ?? annotation.kind}
        </Badge>
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
      {annotation.kind === "question" && annotation.resolved ? (
        <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">resolved</p>
      ) : null}
    </div>
  );
}
