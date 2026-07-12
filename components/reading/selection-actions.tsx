"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MessageCircleQuestion, StickyNote, X } from "lucide-react";
import { toast } from "sonner";
import { createAnnotation } from "@/actions/annotations";
import { askAboutSelection } from "@/actions/qa";
import type { PdfSelectionEvent } from "@/components/reading/pdf-viewer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AI_DISCLOSURE } from "@/lib/config";

const TOOLBAR_WIDTH = 220;

/**
 * Floating actions for a live PDF text selection: "Ask about this" (grounds a
 * question in the selected passage) and "Note" (captures the passage as a note
 * with a return-to-source anchor). Kept close to the text so the reader never
 * leaves the flow. `onMouseDown` preventDefault keeps the selection alive while
 * the toolbar is clicked.
 */
export function SelectionActions({
  paperId,
  selection,
  aiEnabled,
  onOpenChange,
  onDone,
}: {
  paperId: string;
  selection: PdfSelectionEvent | null;
  aiEnabled: boolean;
  /** true while a composer is open, so the parent freezes selection updates. */
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"toolbar" | "ask">("toolbar");
  const [captured, setCaptured] = useState<PdfSelectionEvent | null>(null);
  const [question, setQuestion] = useState("");
  const [pending, startTransition] = useTransition();

  // `mode` returns to "toolbar" via close(); entering "ask" freezes the
  // parent's selection updates, so a fresh selection always arrives in
  // "toolbar" mode and needs no reset effect.
  const active = mode === "ask" ? captured : selection;
  if (!active) return null;

  // Position above the selection, clamped to the viewport.
  const centerX = active.rect.left + active.rect.width / 2;
  const left = Math.min(
    Math.max(8, centerX - TOOLBAR_WIDTH / 2),
    window.innerWidth - TOOLBAR_WIDTH - 8
  );
  const belowTop = active.rect.top + active.rect.height + 8;
  const aboveTop = active.rect.top - 8;
  const openDown = active.rect.top < 160;

  function close() {
    setMode("toolbar");
    setQuestion("");
    onOpenChange(false);
    onDone();
  }

  function startAsk() {
    setCaptured(selection);
    setMode("ask");
    onOpenChange(true);
  }

  function submitAsk() {
    if (!captured || !question.trim()) return;
    startTransition(async () => {
      const result = await askAboutSelection({
        paper_id: paperId,
        question: question.trim(),
        selected_text: captured.text,
        page_number: captured.page,
      });
      if (result.ok) {
        toast.success("Answered from the selected passage");
        window.getSelection()?.removeAllRanges();
        close();
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not answer");
        router.refresh();
      }
    });
  }

  function createNote() {
    if (!selection) return;
    startTransition(async () => {
      const quote =
        selection.text.length > 600 ? selection.text.slice(0, 600) + "…" : selection.text;
      const result = await createAnnotation({
        paper_id: paperId,
        kind: "note",
        body_md: `> ${quote.replace(/\n+/g, " ")}\n\n`,
        selected_text: selection.text,
        page_number: selection.page,
        anchor: { page: selection.page, quote: { exact: selection.text } },
      });
      if (result.ok) {
        toast.success(`Note captured from p. ${selection.page}`);
        window.getSelection()?.removeAllRanges();
        close();
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not create note");
      }
    });
  }

  return (
    <div
      className="fixed z-50"
      style={{
        left,
        top: openDown ? belowTop : undefined,
        bottom: openDown ? undefined : window.innerHeight - aboveTop,
        width: TOOLBAR_WIDTH,
      }}
      // Keep the PDF text selection alive while interacting with the toolbar.
      onMouseDown={(e) => e.preventDefault()}
    >
      {mode === "toolbar" ? (
        <div className="flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md">
          {aiEnabled ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs"
              onClick={startAsk}
              title={AI_DISCLOSURE}
            >
              <MessageCircleQuestion className="size-3.5" /> Ask about this
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-xs"
            onClick={createNote}
            disabled={pending}
          >
            <StickyNote className="size-3.5" /> Note
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5 rounded-md border bg-popover p-2 shadow-md">
          <p className="line-clamp-2 border-l-2 border-violet-500/40 pl-1.5 text-[11px] text-muted-foreground">
            “{captured?.text}”
          </p>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about this passage…"
            rows={2}
            autoFocus
            className="text-[13px]"
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && question.trim()) {
                e.preventDefault();
                submitAsk();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">p. {captured?.page}</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={close}>
                <X className="size-3" />
              </Button>
              <Button
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={submitAsk}
                disabled={pending || !question.trim()}
              >
                {pending ? "Asking…" : "Ask"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
