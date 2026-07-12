"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ExternalLink,
  FileText,
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
import {
  QuickConceptDialog,
  QuickMisconceptionDialog,
} from "@/components/reading/quick-create-dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  PaperAnnotationRow,
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
  aiEnabled: boolean;
}

const LAYOUT_ID = "ra:reading-layout:v4";
const ZOOM_OPTIONS = [
  { value: "fit", label: "Fit width" },
  { value: "100", label: "100%" },
  { value: "125", label: "125%" },
  { value: "150", label: "150%" },
  { value: "175", label: "175%" },
  { value: "200", label: "200%" },
] as const;

interface PdfState {
  page: number;
  zoom: string;
}

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

function loadPdfState(paperId: string): PdfState {
  const fallback: PdfState = { page: 1, zoom: "fit" };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`ra:pdf-state:${paperId}`);
    if (!raw) return fallback;
    const stored = JSON.parse(raw) as Partial<PdfState>;
    return {
      page: typeof stored.page === "number" && stored.page >= 1 ? stored.page : fallback.page,
      zoom: typeof stored.zoom === "string" ? stored.zoom : fallback.zoom,
    };
  } catch {
    // Corrupt local state — defaults are fine.
    return fallback;
  }
}

export function ReadingWorkspace({
  paperId,
  pdfSrc,
  passages,
  annotations,
  qa,
  notes,
  aiEnabled,
}: Props) {
  const mounted = useMounted();
  const isDesktop = useIsDesktop();

  // PDF viewer state, persisted per paper. Lazy init is safe: nothing below
  // renders PDF state until after mount (the skeleton is shown server-side).
  const [pdf, setPdf] = useState<PdfState>(() => loadPdfState(paperId));
  const [pdfNonce, setPdfNonce] = useState(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(`ra:pdf-state:${paperId}`, JSON.stringify(pdf));
    } catch {
      // Storage full/blocked — reading state is a nicety, not critical.
    }
  }, [pdf, paperId]);

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
    setPdf((prev) => ({ ...prev, page: passage.page_start! }));
    // Changing only the src fragment doesn't reload the viewer; nonce forces it.
    setPdfNonce((n) => n + 1);
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

  if (!isDesktop) {
    return (
      <MobileWorkspace
        pdfSrc={pdfSrc}
        pdf={pdf}
        pdfNonce={pdfNonce}
        notesPanel={notesPanel}
        assistantRail={assistantRail}
        formulaTool={makeFormulaTool()}
      />
    );
  }

  return (
    <DesktopWorkspace
      pdfSrc={pdfSrc}
      pdf={pdf}
      setPdf={setPdf}
      bumpNonce={() => setPdfNonce((n) => n + 1)}
      pdfNonce={pdfNonce}
      notesPanel={notesPanel}
      assistantRail={assistantRail}
      formulaTool={makeFormulaTool()}
    />
  );
}

function pdfUrl(pdfSrc: string, pdf: PdfState): string {
  // pagemode=none keeps the viewer's thumbnail sidebar closed (pdf.js);
  // Chromium's viewer has no sidebar and ignores unknown params.
  const zoomPart = pdf.zoom === "fit" ? "zoom=page-width" : `zoom=${pdf.zoom}`;
  return `${pdfSrc}#page=${pdf.page}&pagemode=none&${zoomPart}`;
}

function PdfPane({
  pdfSrc,
  pdf,
  setPdf,
  bumpNonce,
  pdfNonce,
  formulaTool,
}: {
  pdfSrc: string;
  pdf: PdfState;
  setPdf?: React.Dispatch<React.SetStateAction<PdfState>>;
  bumpNonce?: () => void;
  pdfNonce: number;
  formulaTool?: React.ReactNode;
}) {
  const [pageDraft, setPageDraft] = useState(String(pdf.page));
  // Adjust-during-render: keep the draft in sync when the page changes
  // externally (e.g. a passage jump) without an effect.
  const [prevPage, setPrevPage] = useState(pdf.page);
  if (prevPage !== pdf.page) {
    setPrevPage(pdf.page);
    setPageDraft(String(pdf.page));
  }

  function commitPage() {
    const n = Number.parseInt(pageDraft, 10);
    if (setPdf && Number.isFinite(n) && n >= 1) {
      setPdf((prev) => ({ ...prev, page: n }));
      bumpNonce?.();
    } else {
      setPageDraft(String(pdf.page));
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-2 py-1">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-[11px] text-muted-foreground max-sm:hidden">Primary paper</span>
        {setPdf ? (
          <>
            <label className="ml-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              p.
              <Input
                value={pageDraft}
                onChange={(e) => setPageDraft(e.target.value)}
                onBlur={commitPage}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitPage();
                }}
                inputMode="numeric"
                aria-label="Jump to page"
                className="h-6 w-12 px-1.5 text-center text-xs"
              />
            </label>
            <Select
              value={pdf.zoom}
              onValueChange={(zoom) => {
                setPdf((prev) => ({ ...prev, zoom }));
                bumpNonce?.();
              }}
            >
              <SelectTrigger
                size="sm"
                aria-label="Zoom"
                className="h-6 w-28 border-none bg-transparent px-1.5 text-xs shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZOOM_OPTIONS.map((z) => (
                  <SelectItem key={z.value} value={z.value}>
                    {z.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : null}
        {formulaTool ? <div className="ml-1">{formulaTool}</div> : null}
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
        key={`${pdf.page}-${pdf.zoom}-${pdfNonce}`}
        src={pdfUrl(pdfSrc, pdf)}
        title="Paper PDF"
        className="h-full w-full flex-1 bg-neutral-100 dark:bg-neutral-900"
      />
    </div>
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
  pdfSrc,
  pdf,
  setPdf,
  bumpNonce,
  pdfNonce,
  notesPanel,
  assistantRail,
  formulaTool,
}: {
  pdfSrc: string | null;
  pdf: PdfState;
  setPdf: React.Dispatch<React.SetStateAction<PdfState>>;
  bumpNonce: () => void;
  pdfNonce: number;
  notesPanel: React.ReactNode;
  assistantRail: React.ReactNode;
  formulaTool: React.ReactNode;
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
    id: pdfSrc ? LAYOUT_ID : `${LAYOUT_ID}:no-pdf`,
    storage: window.localStorage,
    onlySaveAfterUserInteractions: true,
    panelIds: pdfSrc ? ["notes", "pdf", "rail"] : ["notes", "rail"],
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
        defaultLayout={storedLayout ?? initialLayout(pdfSrc, hidden)}
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
        {pdfSrc ? (
          <>
            <Panel id="pdf" defaultSize="52%" minSize="40%" className="h-full min-w-0">
              <PdfPane
                pdfSrc={pdfSrc}
                pdf={pdf}
                setPdf={setPdf}
                bumpNonce={bumpNonce}
                pdfNonce={pdfNonce}
                formulaTool={formulaTool}
              />
            </Panel>
            <Separator className={separatorClass} />
          </>
        ) : null}
        <Panel
          id="rail"
          collapsible
          defaultSize={hidden.rail ? "0%" : pdfSrc ? "26%" : "58%"}
          minSize={pdfSrc ? "22%" : "34%"}
          maxSize={pdfSrc ? "38%" : "82%"}
          panelRef={railRef}
          onResize={syncFromResize("rail")}
          className="h-full min-w-0 overflow-hidden"
        >
          {hidden.rail ? null : (
            <div className="h-full overflow-y-auto pl-1 pr-0.5">
              {!pdfSrc ? (
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
function initialLayout(pdfSrc: string | null, hidden: HiddenPanels): Record<string, number> {
  if (!pdfSrc) {
    return { notes: hidden.notes ? 0 : 42, rail: hidden.rail ? 0 : 58 };
  }
  const notes = hidden.notes ? 0 : 22;
  const rail = hidden.rail ? 0 : 26;
  return { notes, pdf: 100 - notes - rail, rail };
}

function MobileWorkspace({
  pdfSrc,
  pdf,
  pdfNonce,
  notesPanel,
  assistantRail,
  formulaTool,
}: {
  pdfSrc: string | null;
  pdf: PdfState;
  pdfNonce: number;
  notesPanel: React.ReactNode;
  assistantRail: React.ReactNode;
  formulaTool: React.ReactNode;
}) {
  return (
    <Tabs defaultValue={pdfSrc ? "paper" : "assistant"}>
      <TabsList className="w-full">
        {pdfSrc ? (
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
      {pdfSrc ? (
        <TabsContent value="paper">
          <div className={cn("h-[calc(100dvh-14rem)] min-h-[420px]")}>
            <PdfPane pdfSrc={pdfSrc} pdf={pdf} pdfNonce={pdfNonce} formulaTool={formulaTool} />
          </div>
        </TabsContent>
      ) : null}
      <TabsContent value="assistant">{assistantRail}</TabsContent>
      <TabsContent value="notes">{notesPanel}</TabsContent>
    </Tabs>
  );
}
