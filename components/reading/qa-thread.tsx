"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CornerDownRight, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { askAi, deleteQa, updateQaAnswer } from "@/actions/qa";
import { AiBadge } from "@/components/ai-badge";
import { MarkdownView } from "@/components/markdown-view";
import { usePdfNav } from "@/components/reading/pdf-nav-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AI_DISCLOSURE } from "@/lib/config";
import type { PaperQaRow, QaCoverage } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const COVERAGE_LABELS: Record<QaCoverage, { label: string; className: string; title: string }> = {
  grounded: {
    label: "grounded in paper",
    className: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
    title: "The model answered fully from the retrieved paper text.",
  },
  partial: {
    label: "partially grounded",
    className: "border-amber-600/40 text-amber-700 dark:text-amber-400",
    title: "The paper covers only part of the question; the rest is interpretation.",
  },
  insufficient: {
    label: "not covered by paper",
    className: "border-amber-600/40 text-amber-700 dark:text-amber-400",
    title: "The retrieved paper text did not contain enough information to answer.",
  },
};

/**
 * Grounded Q&A thread under a question annotation. Answers come from the
 * paper's own extracted pages, carry provenance (AI badge, coverage, cited
 * pages), stay editable, and support follow-ups within the same thread.
 */
export function QaThread({
  annotationId,
  qa,
  aiEnabled,
}: {
  annotationId: string;
  qa: PaperQaRow[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUp, setFollowUp] = useState("");

  function ask(question?: string, retryQaId?: string) {
    startTransition(async () => {
      const result = await askAi({ annotation_id: annotationId, question, retry_qa_id: retryQaId });
      if (result.ok) {
        setFollowUp("");
        setFollowUpOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Answering failed");
        router.refresh();
      }
    });
  }

  if (!aiEnabled && qa.length === 0) return null;

  const lastAnswered = qa.some((row) => row.status === "answered");

  return (
    <div className="mt-1.5 space-y-1.5 border-l-2 border-violet-500/30 pl-2">
      {qa.map((row) => (
        <QaItem key={row.id} row={row} onRetry={() => ask(undefined, row.id)} />
      ))}

      {pending ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
          Reading the paper…
        </p>
      ) : null}

      {aiEnabled && qa.length === 0 && !pending ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-violet-700 dark:text-violet-400"
              onClick={() => ask()}
            >
              <Sparkles className="size-3" /> Ask AI to answer from the paper
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-64">
            {AI_DISCLOSURE}
          </TooltipContent>
        </Tooltip>
      ) : null}

      {aiEnabled && lastAnswered && !pending ? (
        followUpOpen ? (
          <div className="space-y-1.5">
            <Textarea
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              placeholder="Follow-up question about this paper…"
              rows={2}
              autoFocus
              className="text-xs leading-snug"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && followUp.trim()) {
                  e.preventDefault();
                  ask(followUp.trim());
                }
              }}
            />
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setFollowUpOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={!followUp.trim()}
                onClick={() => ask(followUp.trim())}
              >
                Ask
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
            onClick={() => setFollowUpOpen(true)}
          >
            <CornerDownRight className="size-3" /> Follow-up
          </Button>
        )
      ) : null}
    </div>
  );
}

function QaItem({ row, onRetry }: { row: PaperQaRow; onRetry: () => void }) {
  const router = useRouter();
  const goToPage = usePdfNav();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.answer_md ?? "");

  const grounding = (row.grounding ?? {}) as { pages?: number[] };
  const citedPages = grounding.pages ?? [];

  function saveEdit() {
    startTransition(async () => {
      const result = await updateQaAnswer({ id: row.id, answer_md: draft });
      if (result.ok) {
        setEditing(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Save failed");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteQa(row.id);
      if (result.ok) router.refresh();
      else toast.error(result.error ?? "Delete failed");
    });
  }

  return (
    <div className="group/qa space-y-1">
      {row.position > 1 ? (
        <p className="text-xs text-muted-foreground">
          <CornerDownRight className="mr-1 inline size-3" aria-hidden />
          {row.question_md}
        </p>
      ) : null}

      {row.status === "failed" ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-destructive">
          <span>AI answer failed: {row.error ?? "unknown error"}</span>
          <Button variant="outline" size="sm" className="h-5 px-1.5 text-[11px]" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : row.status === "pending" ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />
          Waiting for answer…
        </p>
      ) : (
        <div className="rounded-md bg-muted/40 px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <AiBadge authorship={row.answer_authorship} />
            {row.coverage ? (
              <Badge
                variant="outline"
                className={cn("font-normal text-[10px]", COVERAGE_LABELS[row.coverage].className)}
                title={COVERAGE_LABELS[row.coverage].title}
              >
                {COVERAGE_LABELS[row.coverage].label}
              </Badge>
            ) : null}
            {citedPages.length > 0 ? (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                cites
                {citedPages.map((p, i) =>
                  goToPage ? (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goToPage(p)}
                      className="underline-offset-2 hover:text-foreground hover:underline"
                      title={`Go to page ${p}`}
                    >
                      p. {p}
                      {i < citedPages.length - 1 ? "," : ""}
                    </button>
                  ) : (
                    <span key={p}>
                      p. {p}
                      {i < citedPages.length - 1 ? "," : ""}
                    </span>
                  )
                )}
              </span>
            ) : null}
            <span className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover/qa:opacity-100">
              <button
                type="button"
                onClick={() => {
                  setDraft(row.answer_md ?? "");
                  setEditing((e) => !e);
                }}
                className="text-muted-foreground hover:text-foreground"
                title="Edit answer"
                aria-label="Edit answer"
              >
                <Pencil className="size-3" />
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="text-muted-foreground hover:text-destructive"
                title="Delete this Q&A"
                aria-label="Delete this Q&A"
              >
                <Trash2 className="size-3" />
              </button>
            </span>
          </div>
          {editing ? (
            <div className="mt-1.5 space-y-1.5">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                className="font-mono text-xs leading-snug"
              />
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={pending || !draft.trim()}
                  onClick={saveEdit}
                >
                  {pending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1">
              <MarkdownView markdown={row.answer_md ?? ""} className="prose-qa" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
