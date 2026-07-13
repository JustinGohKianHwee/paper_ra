"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Highlighter, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addHighlightNote, deleteHighlight } from "@/actions/highlights";
import { AnnotationItem } from "@/components/reading/annotation-item";
import { usePdfNav } from "@/components/reading/pdf-nav-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PaperAnnotationRow, PaperHighlightRow } from "@/lib/supabase/database.types";

/**
 * A highlight in the assistant rail: the quoted passage, a return-to-source
 * page jump, and either its linked note or an inline composer to add one. When
 * `autoFocus` is set (just created via "Note"), it scrolls into view and opens
 * the composer, ready to type.
 */
export function HighlightItem({
  highlight,
  note,
  autoFocus,
  onFocused,
}: {
  highlight: PaperHighlightRow;
  note: PaperAnnotationRow | null;
  autoFocus: boolean;
  onFocused: () => void;
}) {
  const router = useRouter();
  const goToPage = usePdfNav();
  const [pending, startTransition] = useTransition();
  const [composerOpen, setComposerOpen] = useState(autoFocus && !note);
  const [body, setBody] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    onFocused(); // clear the parent's focus request so it fires only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  function removeHighlight() {
    startTransition(async () => {
      const result = await deleteHighlight(highlight.id);
      if (result.ok) router.refresh();
      else toast.error(result.error ?? "Could not remove highlight");
    });
  }

  function saveNote() {
    if (!body.trim()) return;
    startTransition(async () => {
      const result = await addHighlightNote({ highlight_id: highlight.id, body_md: body });
      if (result.ok) {
        setBody("");
        setComposerOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not add note");
      }
    });
  }

  const quote =
    highlight.selected_text.length > 240
      ? highlight.selected_text.slice(0, 240) + "…"
      : highlight.selected_text;

  return (
    <div ref={containerRef} className="group/hl rounded-md border bg-card px-2.5 py-2">
      <div className="flex items-center gap-2">
        <Highlighter className="size-3 text-amber-500" aria-hidden />
        {highlight.page_number && goToPage ? (
          <button
            type="button"
            onClick={() => goToPage(highlight.page_number)}
            className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            title="Return to source in the PDF"
          >
            <MapPin className="size-3" aria-hidden /> p. {highlight.page_number}
          </button>
        ) : null}
        <button
          type="button"
          onClick={removeHighlight}
          disabled={pending}
          className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/hl:opacity-100"
          title="Remove highlight"
          aria-label="Remove highlight"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <p className="mt-1 border-l-2 border-amber-400/60 pl-2 text-[12px] italic text-muted-foreground">
        “{quote}”
      </p>

      {note ? (
        <div className="mt-2">
          <AnnotationItem annotation={note} />
        </div>
      ) : composerOpen ? (
        <div className="mt-2 space-y-1.5">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a note about this highlight…"
            rows={3}
            autoFocus
            className="font-mono text-[13px]"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && body.trim()) {
                e.preventDefault();
                saveNote();
              }
            }}
          />
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                setComposerOpen(false);
                setBody("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={saveNote}
              disabled={pending || !body.trim()}
            >
              {pending ? "Saving…" : "Save note"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 h-6 px-1.5 text-xs text-muted-foreground"
          onClick={() => setComposerOpen(true)}
        >
          + Add note
        </Button>
      )}
    </div>
  );
}
