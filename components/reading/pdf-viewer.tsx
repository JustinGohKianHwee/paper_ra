"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { AlertTriangle, ExternalLink, FileText, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Load the pdf.js worker from our own origin (vendored by
// scripts/setup-pdf-worker.mjs), never a CDN — keeps the app local-first.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/** A user text selection resolved to a page + the exact selected text. */
export interface PdfSelectionEvent {
  page: number;
  text: string;
  /** Viewport-relative anchor rect for positioning a floating toolbar. */
  rect: { top: number; left: number; width: number; height: number };
}

export interface PdfViewerHandle {
  /** Scroll a 1-based page into view without reloading the document. */
  goToPage: (page: number) => void;
}

interface PdfViewerProps {
  src: string;
  paperId: string;
  /** Optional toolbar slot (e.g. the formula-OCR tool). */
  toolbarExtra?: React.ReactNode;
  /** Fires on a settled text selection inside the document (null clears it). */
  onSelectionChange?: (selection: PdfSelectionEvent | null) => void;
  ref?: React.Ref<PdfViewerHandle>;
}

const GAP = 12; // px between pages
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.2;
/** Mount this many pages on each side of the current one (rest stay as light placeholders). */
const RENDER_WINDOW = 1;

interface PdfState {
  page: number;
  zoom: number;
}

function loadState(paperId: string): PdfState {
  const fallback: PdfState = { page: 1, zoom: 1 };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`ra:pdf-state:${paperId}`);
    if (!raw) return fallback;
    const s = JSON.parse(raw) as Partial<PdfState>;
    return {
      page: typeof s.page === "number" && s.page >= 1 ? Math.floor(s.page) : 1,
      zoom: typeof s.zoom === "number" && s.zoom >= ZOOM_MIN && s.zoom <= ZOOM_MAX ? s.zoom : 1,
    };
  } catch {
    return fallback;
  }
}

/**
 * pdf.js-based document viewer. The document loads once; pages are rendered
 * lazily around the viewport (so a 60-page paper never mounts 60 canvases),
 * page jumps scroll without recreating the viewer, and the text layer is
 * selectable so selections can drive research actions. Fit-to-width layout
 * assumes uniform page dimensions (true for essentially all papers); mixed
 * page sizes would only affect placeholder spacing, not correctness.
 */
export function PdfViewer({ src, paperId, toolbarExtra, onSelectionChange, ref }: PdfViewerProps) {
  const initial = useMemo(() => loadState(paperId), [paperId]);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(initial.zoom);
  const [currentPage, setCurrentPage] = useState(initial.page);
  const [aspect, setAspect] = useState<number | null>(null); // height / width of page 1
  const [containerWidth, setContainerWidth] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pageDraft, setPageDraft] = useState(String(initial.page));

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  const pendingJumpRef = useRef<number | null>(initial.page > 1 ? initial.page : null);
  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const file = useMemo(() => ({ url: src }), [src]);
  const pageWidth = containerWidth > 0 ? containerWidth * zoom : 0;
  const slotHeight = aspect && pageWidth ? aspect * pageWidth + GAP : 820 * zoom + GAP;

  // Keep the page-number input in sync when the page changes elsewhere.
  const [prevPage, setPrevPage] = useState(currentPage);
  if (prevPage !== currentPage) {
    setPrevPage(currentPage);
    setPageDraft(String(currentPage));
  }

  // --- container width (fit-to-width + reflow on panel resize) ---------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth - 24); // padding allowance
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- scroll -> current page (throttled with rAF) ---------------------------
  const onScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollRef.current;
      if (!el || slotHeight <= 0) return;
      const page = Math.min(numPages || 1, Math.max(1, Math.floor(el.scrollTop / slotHeight) + 1));
      setCurrentPage((p) => (p === page ? p : page));
    });
  }, [numPages, slotHeight]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  const scrollToPage = useCallback(
    (page: number) => {
      const el = scrollRef.current;
      if (!el || numPages === 0) {
        pendingJumpRef.current = page;
        return;
      }
      const target = Math.min(numPages, Math.max(1, Math.round(page)));
      el.scrollTo({ top: (target - 1) * slotHeight, behavior: "smooth" });
      setCurrentPage(target);
    },
    [numPages, slotHeight]
  );

  useImperativeHandle(ref, () => ({ goToPage: scrollToPage }), [scrollToPage]);

  // Keep the current page pinned when the layout reflows (zoom change, panel
  // resize) so the reader never loses their place. Skips while a jump is
  // pending so it doesn't fight the resume-to-page logic.
  useLayoutEffect(() => {
    if (pendingJumpRef.current !== null || slotHeight <= 0) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = (currentPageRef.current - 1) * slotHeight;
    // Intentionally only re-anchors on metric changes, not on scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, containerWidth, aspect]);

  // Once dimensions are known, honour a persisted/pending jump (e.g. resume page).
  useEffect(() => {
    if (status !== "ready" || aspect === null || pendingJumpRef.current === null) return;
    const el = scrollRef.current;
    if (!el) return;
    const page = pendingJumpRef.current;
    pendingJumpRef.current = null;
    el.scrollTop = (Math.max(1, page) - 1) * slotHeight; // instant on first render
  }, [status, aspect, slotHeight]);

  // --- persist page + zoom (debounced) ---------------------------------------
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(
          `ra:pdf-state:${paperId}`,
          JSON.stringify({ page: currentPage, zoom })
        );
      } catch {
        // storage unavailable — reading state is a nicety
      }
    }, 400);
    return () => clearTimeout(t);
  }, [currentPage, zoom, paperId]);

  // --- text selection -> research action -------------------------------------
  // Emit a settled selection on pointer-up (avoids mid-drag jitter); emit null
  // when the selection collapses so a floating toolbar can dismiss itself. The
  // consumer decides whether to honour `null` (e.g. it ignores it while a
  // selection-driven composer is open).
  useEffect(() => {
    if (!onSelectionChange) return;
    const scroller = scrollRef.current;
    if (!scroller) return;

    function resolve(): PdfSelectionEvent | null {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);
      const content = contentRef.current;
      if (!content || !content.contains(range.commonAncestorContainer)) return null;
      const text = sel.toString().trim();
      if (text.length < 2) return null;
      let node: Node | null = range.startContainer;
      let pageEl: HTMLElement | null = null;
      while (node && node !== content) {
        if (node instanceof HTMLElement && node.dataset.pageNumber) {
          pageEl = node;
          break;
        }
        node = node.parentNode;
      }
      const page = pageEl ? Number(pageEl.dataset.pageNumber) : currentPageRef.current;
      const rect = range.getBoundingClientRect();
      return {
        page,
        text,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      };
    }

    function onPointerUp() {
      // Defer so the browser has finalised the selection.
      window.setTimeout(() => onSelectionChange?.(resolve()), 0);
    }
    function onSelectionClear() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) onSelectionChange?.(null);
    }

    scroller.addEventListener("mouseup", onPointerUp);
    document.addEventListener("selectionchange", onSelectionClear);
    return () => {
      scroller.removeEventListener("mouseup", onPointerUp);
      document.removeEventListener("selectionchange", onSelectionClear);
    };
  }, [onSelectionChange]);

  const clampZoom = (z: number) =>
    Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));

  function commitPageDraft() {
    const n = Number.parseInt(pageDraft, 10);
    if (Number.isFinite(n) && n >= 1) scrollToPage(n);
    else setPageDraft(String(currentPage));
  }

  const renderedPages = useMemo(() => {
    const set = new Set<number>();
    for (let p = currentPage - RENDER_WINDOW; p <= currentPage + RENDER_WINDOW; p++) {
      if (p >= 1 && p <= numPages) set.add(p);
    }
    return set;
  }, [currentPage, numPages]);

  return (
    <div
      data-testid="pdf-viewer"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border"
    >
      {/* toolbar */}
      <div className="flex items-center gap-2 border-b bg-muted/40 px-2 py-1">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-[11px] text-muted-foreground max-sm:hidden">Primary paper</span>
        <label className="ml-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          p.
          <Input
            value={pageDraft}
            onChange={(e) => setPageDraft(e.target.value)}
            onBlur={commitPageDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPageDraft();
            }}
            inputMode="numeric"
            aria-label="Go to page"
            className="h-6 w-11 px-1.5 text-center text-xs"
          />
          <span className="tabular-nums">/ {numPages || "—"}</span>
        </label>
        <div className="ml-1 flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            disabled={zoom <= ZOOM_MIN}
          >
            <Minus className="size-3.5" />
          </Button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="min-w-10 text-center text-[11px] tabular-nums text-muted-foreground hover:text-foreground"
            title="Reset to fit width"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            disabled={zoom >= ZOOM_MAX}
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
        {toolbarExtra}
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Open in tab <ExternalLink className="size-3" />
        </a>
      </div>

      {/* document */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="relative flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-900"
      >
        <Document
          file={file}
          onLoadSuccess={(doc) => {
            setNumPages(doc.numPages);
            setStatus("ready");
          }}
          onLoadError={(err) => {
            setStatus("error");
            setErrorMsg(err?.message ?? "Could not load the PDF.");
          }}
          loading={<ViewerMessage icon="spinner" text="Loading paper…" />}
          error={
            <ViewerMessage
              icon="error"
              text={errorMsg ?? "Could not load the PDF. The source may be unavailable."}
            />
          }
          noData={<ViewerMessage icon="error" text="No PDF source for this paper." />}
          className="mx-auto flex flex-col items-center py-3"
        >
          <div ref={contentRef} className="flex flex-col items-center" style={{ gap: GAP }}>
            {Array.from({ length: numPages }, (_, i) => {
              const pageNumber = i + 1;
              const mounted = renderedPages.has(pageNumber);
              return (
                <div
                  key={pageNumber}
                  ref={(el) => {
                    if (el) slotRefs.current.set(pageNumber, el);
                    else slotRefs.current.delete(pageNumber);
                  }}
                  data-page-number={pageNumber}
                  className="relative bg-white shadow-sm dark:bg-neutral-800"
                  style={{
                    width: pageWidth || undefined,
                    height: mounted ? undefined : Math.max(0, slotHeight - GAP),
                  }}
                >
                  {mounted && pageWidth > 0 ? (
                    <Page
                      pageNumber={pageNumber}
                      width={pageWidth}
                      renderAnnotationLayer={false}
                      onLoadSuccess={(page) => {
                        if (pageNumber === 1 && aspect === null) {
                          const w = page.originalWidth || page.width;
                          const h = page.originalHeight || page.height;
                          if (w && h) setAspect(h / w);
                        }
                      }}
                      loading={
                        <div
                          className="flex items-center justify-center text-muted-foreground"
                          style={{ height: Math.max(0, slotHeight - GAP) }}
                        >
                          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                        </div>
                      }
                    />
                  ) : (
                    <div className="absolute right-2 top-2 text-[10px] text-muted-foreground/60">
                      {pageNumber}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Document>
      </div>
    </div>
  );
}

function ViewerMessage({ icon, text }: { icon: "spinner" | "error"; text: string }) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
      {icon === "spinner" ? (
        <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
      ) : (
        <AlertTriangle className="size-5 text-amber-500" aria-hidden />
      )}
      <p>{text}</p>
    </div>
  );
}
