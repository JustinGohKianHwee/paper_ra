"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  FileText,
  Highlighter,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Group, Panel, Separator, useDefaultLayout, usePanelRef } from "react-resizable-panels";
import { AiBadge } from "@/components/ai-badge";
import { MarkdownView } from "@/components/markdown-view";
import { AnnotationComposer } from "@/components/reading/annotation-composer";
import { AnnotationItem } from "@/components/reading/annotation-item";
import { FormulaOcrDialog } from "@/components/reading/formula-ocr-dialog";
import { NotesPanel } from "@/components/reading/notes-panel";
import { HighlightItem } from "@/components/reading/highlight-item";
import { PdfNavProvider } from "@/components/reading/pdf-nav-context";
import {
  PdfViewer,
  type NormalisedRect,
  type PdfHighlight,
  type PdfSelectionEvent,
  type PdfViewerHandle,
} from "@/components/reading/pdf-viewer";
import {
  QuickConceptDialog,
  QuickMisconceptionDialog,
} from "@/components/reading/quick-create-dialogs";
import { SelectionActions } from "@/components/reading/selection-actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  PaperAnnotationRow,
  PaperHighlightRow,
  PaperNoteRow,
  PaperPassageRow,
  PaperQaRow,
} from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

interface Props {
  paperId: string;
  pdfSrc: string | null;
  passages: PaperPassageRow[];
  annotations: PaperAnnotationRow[];
  qa: PaperQaRow[];
  notes: PaperNoteRow[];
  highlights: PaperHighlightRow[];
  aiEnabled: boolean;
}

const LAYOUT_ID = "ra:reading-layout:v4";

/**
 * Reading workspace v3. The primary paper dominates the centre; structured
 * notes live in a collapsible/resizable left panel and the assistant rail
 * (AI passage summaries, annotations, Q&A, quick-create) on the right.
 * Panel layout persists globally; page + zoom persist per paper. Below xl
 * the three columns become tabs instead of being squeezed together.
 */
/** Hydration-safe "has the client mounted" flag without effect setState. */
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

const DESKTOP_QUERY = "(min-width: 1280px)";

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true
  );
}

export function ReadingWorkspace({
  paperId,
  pdfSrc,
  passages,
  annotations,
  qa,
  notes,
  highlights,
  aiEnabled,
}: Props) {
  const mounted = useMounted();
  const isDesktop = useIsDesktop();

  // The PDF viewer owns its own page/zoom state and persistence; the workspace
  // only needs to drive navigation (passage jumps, Q&A citations).
  const viewerRef = useRef<PdfViewerHandle>(null);
  const goToPage = useCallback((page: number) => viewerRef.current?.goToPage(page), []);

  // Live PDF text selection -> floating research actions. Frozen while a
  // selection-driven composer is open so focusing it doesn't clear the target.
  const [selection, setSelection] = useState<PdfSelectionEvent | null>(null);
  const composerOpenRef = useRef(false);
  const handleSelection = useCallback((next: PdfSelectionEvent | null) => {
    if (composerOpenRef.current) return;
    setSelection(next);
  }, []);

  // After a "highlight + note", focus the new highlight's composer in the rail.
  const [focusHighlightId, setFocusHighlightId] = useState<string | null>(null);

  const pdfHighlights = useMemo<PdfHighlight[]>(
    () =>
      highlights.map((h) => ({
        id: h.id,
        page_number: h.page_number,
        rects: (Array.isArray(h.rects) ? h.rects : []) as unknown as NormalisedRect[],
      })),
    [highlights]
  );

  // Notes attached to a highlight are shown under their highlight, not also in
  // the passage / whole-paper lists.
  const linkedAnnotationIds = useMemo(
    () => new Set(highlights.map((h) => h.annotation_id).filter(Boolean) as string[]),
    [highlights]
  );
  const annotationsById = useMemo(
    () => new Map(annotations.map((a) => [a.id, a])),
    [annotations]
  );

  const byPassage = useMemo(() => {
    const map = new Map<string, PaperAnnotationRow[]>();
    const paperLevel: PaperAnnotationRow[] = [];
    for (const annotation of annotations) {
      if (linkedAnnotationIds.has(annotation.id)) continue;
      if (annotation.passage_id) {
        const list = map.get(annotation.passage_id) ?? [];
        list.push(annotation);
        map.set(annotation.passage_id, list);
      } else {
        paperLevel.push(annotation);
      }
    }
    return { map, paperLevel };
  }, [annotations, linkedAnnotationIds]);

  const qaByAnnotation = useMemo(() => {
    const map = new Map<string, PaperQaRow[]>();
    for (const row of qa) {
      const list = map.get(row.annotation_id) ?? [];
      list.push(row);
      map.set(row.annotation_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position);
    return map;
  }, [qa]);

  function jumpTo(passage: PaperPassageRow) {
    if (!passage.page_start) return;
    goToPage(passage.page_start);
  }

  function clickShouldStayInCard(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLElement &&
      Boolean(target.closest("a, button, input, textarea, select, [role='button']"))
    );
  }

  const makeFormulaTool = () => <FormulaOcrDialog aiEnabled={aiEnabled} />;

  const assistantRail = (
    <div className="reading-pane space-y-3 pb-8">
      <div className="flex flex-wrap items-center gap-2">
        {makeFormulaTool()}
        <QuickConceptDialog paperId={paperId} />
        <QuickMisconceptionDialog paperId={paperId} />
      </div>

      {highlights.length > 0 ? (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1 text-[13px] font-semibold tracking-tight">
            <Highlighter className="size-3.5 text-amber-500" aria-hidden /> Highlights
          </h2>
          <div className="space-y-2">
            {highlights.map((h) => (
              <HighlightItem
                key={h.id}
                highlight={h}
                note={h.annotation_id ? (annotationsById.get(h.annotation_id) ?? null) : null}
                autoFocus={focusHighlightId === h.id}
                onFocused={() => setFocusHighlightId(null)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {passages.length === 0 ? (
        <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No AI breakdown yet — it appears here once processing finishes. You can still annotate the
          paper below.
        </div>
      ) : (
        passages.map((passage) => {
          const passageAnnotations = byPassage.map.get(passage.id) ?? [];
          const canJump = Boolean(passage.page_start);
          return (
            <section
              key={passage.id}
              className={cn(
                "rounded-lg border bg-card px-2.5 py-2",
                canJump && "cursor-pointer transition-colors hover:border-ring/40"
              )}
              onClick={(event) => {
                if (!canJump || clickShouldStayInCard(event.target)) return;
                jumpTo(passage);
              }}
              title={canJump ? "Jump the PDF to these pages" : undefined}
            >
              <button
                type="button"
                onClick={() => jumpTo(passage)}
                disabled={!canJump}
                className={cn(
                  "group flex w-full flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  canJump && "-mx-1 -mt-0.5 px-1 py-0.5 hover:bg-accent/40"
                )}
                title={canJump ? "Jump the PDF to these pages" : undefined}
              >
                <h2 className="text-[13px] font-semibold tracking-tight">{passage.title}</h2>
                {passage.page_start ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground group-hover:text-foreground">
                    <MapPin className="size-3" aria-hidden />
                    {passage.anchor ? `${passage.anchor} · ` : ""}
                    pp. {passage.page_start}
                    {passage.page_end && passage.page_end !== passage.page_start
                      ? `–${passage.page_end}`
                      : ""}
                  </span>
                ) : passage.anchor ? (
                  <span className="text-[10.5px] text-muted-foreground">{passage.anchor}</span>
                ) : null}
                <AiBadge className="ml-auto" />
              </button>

              {passage.ai_summary_md ? (
                <div className="mt-1.5">
                  <MarkdownView markdown={passage.ai_summary_md} />
                </div>
              ) : null}

              {passageAnnotations.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {passageAnnotations.map((a) => (
                    <AnnotationItem
                      key={a.id}
                      annotation={a}
                      qa={qaByAnnotation.get(a.id) ?? []}
                      aiEnabled={aiEnabled}
                    />
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

      <section className="rounded-lg border bg-card px-2.5 py-2">
        <h2 className="text-[13px] font-semibold tracking-tight">Whole-paper notes</h2>
        <p className="text-[11px] text-muted-foreground">
          Thoughts that don&apos;t belong to one passage.
        </p>
        {byPassage.paperLevel.length > 0 ? (
          <div className="mt-2 space-y-2">
            {byPassage.paperLevel.map((a) => (
              <AnnotationItem
                key={a.id}
                annotation={a}
                qa={qaByAnnotation.get(a.id) ?? []}
                aiEnabled={aiEnabled}
              />
            ))}
          </div>
        ) : null}
        <div className="mt-2">
          <AnnotationComposer paperId={paperId} passageId={null} />
        </div>
      </section>
    </div>
  );

  const notesPanel = <NotesPanel paperId={paperId} notes={notes} />;

  if (!mounted) {
    return (
      <div className="grid h-[calc(100dvh-11rem)] min-h-[480px] grid-cols-[1fr_2.35fr_1.25fr] gap-2 max-xl:grid-cols-1">
        <Skeleton className="h-full max-lg:hidden" />
        <Skeleton className="h-full max-lg:h-[70dvh]" />
        <Skeleton className="h-full max-lg:hidden" />
      </div>
    );
  }

  const viewer = pdfSrc ? (
    <PdfViewer
      ref={viewerRef}
      src={pdfSrc}
      paperId={paperId}
      toolbarExtra={makeFormulaTool()}
      onSelectionChange={handleSelection}
      highlights={pdfHighlights}
    />
  ) : null;

  return (
    <PdfNavProvider goToPage={goToPage}>
      {isDesktop ? (
        <DesktopWorkspace
          viewer={viewer}
          hasPdf={Boolean(pdfSrc)}
          notesPanel={notesPanel}
          assistantRail={assistantRail}
        />
      ) : (
        <MobileWorkspace viewer={viewer} notesPanel={notesPanel} assistantRail={assistantRail} />
      )}
      {pdfSrc ? (
        <SelectionActions
          paperId={paperId}
          selection={selection}
          aiEnabled={aiEnabled}
          onOpenChange={(open) => {
            composerOpenRef.current = open;
          }}
          onDone={() => setSelection(null)}
          onHighlightNote={setFocusHighlightId}
        />
      ) : null}
    </PdfNavProvider>
  );
}

const separatorClass =
  "w-1 shrink-0 rounded-full bg-transparent transition-colors data-[separator=hover]:bg-border data-[separator=focus]:bg-border data-[separator=active]:bg-ring/60";

const HIDDEN_PANELS_KEY = "ra:reading-hidden-panels:v1";

interface HiddenPanels {
  notes: boolean;
  rail: boolean;
}

function loadHiddenPanels(): HiddenPanels {
  const fallback: HiddenPanels = { notes: false, rail: false };
  try {
    const raw = window.localStorage.getItem(HIDDEN_PANELS_KEY);
    if (!raw) return fallback;
    const stored = JSON.parse(raw) as Partial<HiddenPanels>;
    return { notes: Boolean(stored.notes), rail: Boolean(stored.rail) };
  } catch {
    return fallback;
  }
}

function DesktopWorkspace({
  viewer,
  hasPdf,
  notesPanel,
  assistantRail,
}: {
  viewer: React.ReactNode;
  hasPdf: boolean;
  notesPanel: React.ReactNode;
  assistantRail: React.ReactNode;
}) {
  const notesRef = usePanelRef();
  const railRef = usePanelRef();
  // Own source of truth for "panel hidden" (persisted): content unmounts when
  // hidden, and the imperative collapse/expand keeps the layout in sync.
  // onResize covers the drag-to-collapse path.
  const [hidden, setHidden] = useState<HiddenPanels>(() => loadHiddenPanels());

  useEffect(() => {
    try {
      window.localStorage.setItem(HIDDEN_PANELS_KEY, JSON.stringify(hidden));
    } catch {
      // Best effort — layout preference only.
    }
  }, [hidden]);

  // Restore collapsed layout on mount for panels hidden in a previous visit.
  useEffect(() => {
    if (hidden.notes) notesRef.current?.collapse();
    if (hidden.rail) railRef.current?.collapse();
    // Run once after mount; later changes go through the toggle handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (
    ref: typeof notesRef,
    key: keyof HiddenPanels,
    label: string,
    OpenIcon: typeof PanelLeftOpen,
    CloseIcon: typeof PanelLeftClose
  ) => {
    const isHidden = hidden[key];
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground"
            aria-label={isHidden ? `Show ${label}` : `Hide ${label}`}
            aria-pressed={!isHidden}
            onClick={() => {
              setHidden((prev) => ({ ...prev, [key]: !isHidden }));
              if (isHidden) ref.current?.expand();
              else ref.current?.collapse();
            }}
          >
            {isHidden ? <OpenIcon className="size-4" /> : <CloseIcon className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isHidden ? `Show ${label}` : `Hide ${label}`}
        </TooltipContent>
      </Tooltip>
    );
  };

  const syncFromResize = (key: keyof HiddenPanels) => (size: { asPercentage: number }) => {
    const collapsed = size.asPercentage === 0;
    setHidden((prev) => (prev[key] === collapsed ? prev : { ...prev, [key]: collapsed }));
  };

  // Drag positions persist via the library's layout cache; hidden state has
  // its own key so content can unmount when a panel is closed.
  const { defaultLayout: storedLayout, onLayoutChanged } = useDefaultLayout({
    id: hasPdf ? LAYOUT_ID : `${LAYOUT_ID}:no-pdf`,
    storage: window.localStorage,
    onlySaveAfterUserInteractions: true,
    panelIds: hasPdf ? ["notes", "pdf", "rail"] : ["notes", "rail"],
  });

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-[520px] flex-col gap-1.5">
      <div className="flex items-center gap-1">
        {toggle(notesRef, "notes", "structured notes", PanelLeftOpen, PanelLeftClose)}
        <span className="text-[11px] text-muted-foreground">Notes</span>
        <span className="mx-auto" />
        <span className="text-[11px] text-muted-foreground">Assistant</span>
        {toggle(railRef, "rail", "assistant panel", PanelRightOpen, PanelRightClose)}
      </div>

      <Group
        orientation="horizontal"
        defaultLayout={storedLayout ?? initialLayout(hasPdf, hidden)}
        onLayoutChanged={onLayoutChanged}
        className="min-h-0 flex-1"
      >
        <Panel
          id="notes"
          collapsible
          defaultSize={hidden.notes ? "0%" : "22%"}
          minSize="18%"
          maxSize="34%"
          panelRef={notesRef}
          onResize={syncFromResize("notes")}
          className="h-full min-w-0 overflow-hidden"
        >
          {hidden.notes ? null : <div className="h-full overflow-y-auto pr-1">{notesPanel}</div>}
        </Panel>
        <Separator className={separatorClass} />
        {hasPdf ? (
          <>
            <Panel id="pdf" defaultSize="52%" minSize="40%" className="h-full min-w-0">
              {viewer}
            </Panel>
            <Separator className={separatorClass} />
          </>
        ) : null}
        <Panel
          id="rail"
          collapsible
          defaultSize={hidden.rail ? "0%" : hasPdf ? "26%" : "58%"}
          minSize={hasPdf ? "22%" : "34%"}
          maxSize={hasPdf ? "38%" : "82%"}
          panelRef={railRef}
          onResize={syncFromResize("rail")}
          className="h-full min-w-0 overflow-hidden"
        >
          {hidden.rail ? null : (
            <div className="h-full overflow-y-auto pl-1 pr-0.5">
              {!hasPdf ? (
                <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="size-3.5" /> No PDF source available — add a PDF URL via
                  “Edit metadata” to read side-by-side.
                </p>
              ) : null}
              {assistantRail}
            </div>
          )}
        </Panel>
      </Group>
    </div>
  );
}

/** First-visit pane split (no stored layout yet): hidden panels start at 0. */
function initialLayout(hasPdf: boolean, hidden: HiddenPanels): Record<string, number> {
  if (!hasPdf) {
    return { notes: hidden.notes ? 0 : 42, rail: hidden.rail ? 0 : 58 };
  }
  const notes = hidden.notes ? 0 : 22;
  const rail = hidden.rail ? 0 : 26;
  return { notes, pdf: 100 - notes - rail, rail };
}

function MobileWorkspace({
  viewer,
  notesPanel,
  assistantRail,
}: {
  viewer: React.ReactNode;
  notesPanel: React.ReactNode;
  assistantRail: React.ReactNode;
}) {
  return (
    <Tabs defaultValue={viewer ? "paper" : "assistant"}>
      <TabsList className="w-full">
        {viewer ? (
          <TabsTrigger value="paper" className="flex-1">
            Paper
          </TabsTrigger>
        ) : null}
        <TabsTrigger value="assistant" className="flex-1">
          Assistant
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex-1">
          Notes
        </TabsTrigger>
      </TabsList>
      {viewer ? (
        <TabsContent value="paper">
          <div className={cn("h-[calc(100dvh-14rem)] min-h-[420px]")}>{viewer}</div>
        </TabsContent>
      ) : null}
      <TabsContent value="assistant">{assistantRail}</TabsContent>
      <TabsContent value="notes">{notesPanel}</TabsContent>
    </Tabs>
  );
}
