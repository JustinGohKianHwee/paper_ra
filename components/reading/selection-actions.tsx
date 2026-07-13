"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Highlighter, MessageCircleQuestion, StickyNote, X } from "lucide-react";
import { toast } from "sonner";
import { askAboutSelection } from "@/actions/qa";
import { createHighlight } from "@/actions/highlights";
import type { PdfSelectionEvent } from "@/components/reading/pdf-viewer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AI_DISCLOSURE } from "@/lib/config";

const TOOLBAR_WIDTH = 268;

/**
 * Floating actions for a live PDF text selection: "Ask about this" (grounds a
 * question in the selected passage), "Highlight" (persists a highlight only),
 * and "Note" (persists a highlight AND opens a note composer in the rail).
 * Kept close to the text so the reader never leaves the flow. `onMouseDown`
 * preventDefault keeps the selection alive while the toolbar is clicked.
 */
export function SelectionActions({
  paperId,
  selection,
  aiEnabled,
  onOpenChange,
  onDone,
  onHighlightNote,
}: {
  paperId: string;
  selection: PdfSelectionEvent | null;
  aiEnabled: boolean;
  /** true while a composer is open, so the parent freezes selection updates. */
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  /** Called after a "highlight + note" so the rail can focus the new composer. */
  onHighlightNote: (highlightId: string) => void;
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

  function justHighlight() {
    if (!selection) return;
    startTransition(async () => {
      const result = await createHighlight({
        paper_id: paperId,
        page_number: selection.page,
        selected_text: selection.text,
        rects: selection.rects,
      });
      if (result.ok) {
        toast.success(`Highlighted on p. ${selection.page}`);
        window.getSelection()?.removeAllRanges();
        close();
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not highlight");
      }
    });
  }

  function highlightAndNote() {
    if (!selection) return;
    startTransition(async () => {
      const result = await createHighlight({
        paper_id: paperId,
        page_number: selection.page,
        selected_text: selection.text,
        rects: selection.rects,
      });
      if (result.ok && result.id) {
        window.getSelection()?.removeAllRanges();
        // The highlight stays painted on the PDF; hand the rail the new id so it
        // scrolls to and opens a note composer for it.
        onHighlightNote(result.id);
        close();
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not highlight");
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
        <div className="flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md">
          {aiEnabled ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-1.5 text-xs"
              onClick={startAsk}
              title={AI_DISCLOSURE}
            >
              <MessageCircleQuestion className="size-3.5" /> Ask
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-1.5 text-xs"
            onClick={justHighlight}
            disabled={pending}
            title="Highlight this passage"
          >
            <Highlighter className="size-3.5" /> Highlight
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-1.5 text-xs"
            onClick={highlightAndNote}
            disabled={pending}
            title="Highlight and add a note"
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
