"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileText, MapPin } from "lucide-react";
import { AiBadge } from "@/components/ai-badge";
import { MarkdownView } from "@/components/markdown-view";
import { AnnotationComposer } from "@/components/reading/annotation-composer";
import { AnnotationItem } from "@/components/reading/annotation-item";
import {
  QuickConceptDialog,
  QuickMisconceptionDialog,
} from "@/components/reading/quick-create-dialogs";
import type { PaperAnnotationRow, PaperPassageRow } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

interface Props {
  paperId: string;
  pdfSrc: string | null;
  passages: PaperPassageRow[];
  annotations: PaperAnnotationRow[];
}

/**
 * Split-screen study surface: the primary paper (PDF) stays visible on the
 * left; page-linked AI passage summaries with your annotations live on the
 * right. Summaries guide reading — clicking a passage jumps the PDF to its
 * pages rather than replacing them.
 */
export function ReadingWorkspace({ paperId, pdfSrc, passages, annotations }: Props) {
  const [page, setPage] = useState(1);
  const [pdfNonce, setPdfNonce] = useState(0);

  const byPassage = useMemo(() => {
    const map = new Map<string, PaperAnnotationRow[]>();
    const paperLevel: PaperAnnotationRow[] = [];
    for (const annotation of annotations) {
      if (annotation.passage_id) {
        const list = map.get(annotation.passage_id) ?? [];
        list.push(annotation);
        map.set(annotation.passage_id, list);
      } else {
        paperLevel.push(annotation);
      }
    }
    return { map, paperLevel };
  }, [annotations]);

  function jumpTo(passage: PaperPassageRow) {
    if (!passage.page_start) return;
    setPage(passage.page_start);
    // Changing only the #page fragment doesn't reload the viewer; nonce forces it.
    setPdfNonce((n) => n + 1);
  }

  const passageList = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <QuickConceptDialog paperId={paperId} />
        <QuickMisconceptionDialog paperId={paperId} />
      </div>

      {passages.length === 0 ? (
        <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No AI breakdown yet — it appears here once processing finishes. You can still annotate the
          paper below.
        </div>
      ) : (
        passages.map((passage) => {
          const passageAnnotations = byPassage.map.get(passage.id) ?? [];
          return (
            <section key={passage.id} className="rounded-lg border bg-card px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h2 className="text-sm font-semibold tracking-tight">{passage.title}</h2>
                {passage.page_start ? (
                  <button
                    type="button"
                    onClick={() => jumpTo(passage)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    title="Jump the PDF to these pages"
                  >
                    <MapPin className="size-3" aria-hidden />
                    {passage.anchor ? `${passage.anchor} · ` : ""}
                    pp. {passage.page_start}
                    {passage.page_end && passage.page_end !== passage.page_start
                      ? `–${passage.page_end}`
                      : ""}
                  </button>
                ) : passage.anchor ? (
                  <span className="text-[11px] text-muted-foreground">{passage.anchor}</span>
                ) : null}
                <AiBadge className="ml-auto" />
              </div>

              {passage.ai_summary_md ? (
                <div className="mt-1.5">
                  <MarkdownView markdown={passage.ai_summary_md} />
                </div>
              ) : null}

              {passageAnnotations.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {passageAnnotations.map((a) => (
                    <AnnotationItem key={a.id} annotation={a} />
                  ))}
                </div>
              ) : null}

              <div className="mt-2">
                <AnnotationComposer
                  paperId={paperId}
                  passageId={passage.id}
                  compactLabel="Add note / question / idea"
                />
              </div>
            </section>
          );
        })
      )}

      <section className="rounded-lg border bg-card px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Whole-paper notes</h2>
        <p className="text-[11px] text-muted-foreground">
          Thoughts that don&apos;t belong to one passage.
        </p>
        {byPassage.paperLevel.length > 0 ? (
          <div className="mt-2 space-y-2">
            {byPassage.paperLevel.map((a) => (
              <AnnotationItem key={a.id} annotation={a} />
            ))}
          </div>
        ) : null}
        <div className="mt-2">
          <AnnotationComposer paperId={paperId} passageId={null} />
        </div>
      </section>
    </div>
  );

  if (!pdfSrc) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="size-3.5" /> No PDF source available — add a PDF URL via “Edit
          metadata” to read side-by-side.
        </p>
        {passageList}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]">
        <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-lg border">
          <div className="flex items-center gap-2 border-b bg-muted/40 px-2 py-1">
            <FileText className="size-3.5 text-muted-foreground" aria-hidden />
            <span className="text-[11px] text-muted-foreground">Primary paper</span>
            <a
              href={pdfSrc}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Open in tab <ExternalLink className="size-3" />
            </a>
          </div>
          <iframe
            key={pdfNonce}
            src={`${pdfSrc}#page=${page}&view=FitH`}
            title="Paper PDF"
            className={cn("h-full w-full flex-1 bg-neutral-100 dark:bg-neutral-900")}
          />
        </div>
      </div>
      <div className="min-w-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
        {passageList}
      </div>
    </div>
  );
}
