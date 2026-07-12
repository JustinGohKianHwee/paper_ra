"use client";

/* eslint-disable @next/next/no-img-element -- Formula screenshots are ephemeral data URLs. */

import { useRef, useState, useTransition } from "react";
import {
  Clipboard,
  ClipboardPaste,
  Copy,
  ImagePlus,
  Loader2,
  ScanLine,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { recognizeFormula, type FormulaOcrResult } from "@/actions/formula-ocr";
import { MarkdownView } from "@/components/markdown-view";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Selection {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DragState {
  x: number;
  y: number;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

function selectionFromPoints(start: DragState, end: DragState): Selection {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  };
}

export function FormulaOcrDialog({ aiEnabled }: { aiEnabled: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [open, setOpen] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dragStart, setDragStart] = useState<DragState | null>(null);
  const [result, setResult] = useState<FormulaOcrResult | null>(null);
  const [pending, startTransition] = useTransition();

  function setImage(dataUrl: string) {
    setImageDataUrl(dataUrl);
    setSelection(null);
    setResult(null);
  }

  async function copyText(text: string, label = "Copied") {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Copy failed");
    }
  }

  async function pasteImage() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        setImage(await readFileAsDataUrl(new File([blob], "clipboard-image", { type: blob.type })));
        return;
      }
      toast.error("Clipboard has no image");
    } catch {
      toast.error("Paste with Ctrl+V, or upload a screenshot");
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    setImage(await readFileAsDataUrl(file));
  }

  function pointFromEvent(event: React.PointerEvent<HTMLDivElement>): DragState {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100),
    };
  }

  async function croppedImageDataUrl(): Promise<string | null> {
    const image = imageRef.current;
    if (!imageDataUrl || !image) return null;
    if (!selection || selection.w < 2 || selection.h < 2) return imageDataUrl;

    const sx = Math.round((selection.x / 100) * image.naturalWidth);
    const sy = Math.round((selection.y / 100) * image.naturalHeight);
    const sw = Math.max(1, Math.round((selection.w / 100) * image.naturalWidth));
    const sh = Math.max(1, Math.round((selection.h / 100) * image.naturalHeight));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvas.toDataURL("image/png");
  }

  function runOcr() {
    startTransition(async () => {
      const dataUrl = await croppedImageDataUrl();
      if (!dataUrl) {
        toast.error("Add a formula image first");
        return;
      }
      const response = await recognizeFormula({ image_data_url: dataUrl });
      if (!response.ok || !response.result) {
        toast.error(response.error ?? "Formula OCR failed");
        return;
      }
      setResult(response.result);
      if (response.result.confidence === "low") {
        toast.warning("OCR confidence is low. Check the symbols before using it.");
      } else {
        toast.success("Formula converted");
      }
    });
  }

  const canRun = aiEnabled && Boolean(imageDataUrl) && !pending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
          <ScanLine className="size-3.5" />
          Formula OCR
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90dvh] gap-4 overflow-hidden p-4 sm:max-w-5xl"
        onPaste={(event) => {
          const file = Array.from(event.clipboardData.files).find((f) =>
            f.type.startsWith("image/")
          );
          if (file) {
            event.preventDefault();
            void handleUpload(file);
          }
        }}
      >
        <DialogHeader className="pr-8">
          <DialogTitle>Formula OCR</DialogTitle>
          <DialogDescription>
            Paste or upload an equation screenshot, then copy the KaTeX-ready result.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="min-h-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="secondary" size="sm" onClick={pasteImage} disabled={pending}>
                <ClipboardPaste className="size-4" />
                Paste
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={pending}
              >
                <Upload className="size-4" />
                Upload
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => void handleUpload(event.target.files?.[0])}
              />
              <Button className="ml-auto" size="sm" onClick={runOcr} disabled={!canRun}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ScanLine className="size-4" />
                )}
                Convert
              </Button>
            </div>

            <div className="relative flex h-[min(56dvh,520px)] min-h-[260px] items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
              {imageDataUrl ? (
                <div className="relative max-h-full max-w-full select-none">
                  <img
                    ref={imageRef}
                    src={imageDataUrl}
                    alt="Formula screenshot"
                    className="block max-h-[min(56dvh,520px)] max-w-full object-contain"
                    draggable={false}
                  />
                  <div
                    className="absolute inset-0 cursor-crosshair"
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      const point = pointFromEvent(event);
                      setDragStart(point);
                      setSelection({ ...point, w: 0, h: 0 });
                    }}
                    onPointerMove={(event) => {
                      if (!dragStart) return;
                      setSelection(selectionFromPoints(dragStart, pointFromEvent(event)));
                    }}
                    onPointerUp={(event) => {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                      setDragStart(null);
                    }}
                  >
                    {selection ? (
                      <div
                        className="absolute border border-violet-300 bg-violet-500/15 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]"
                        style={{
                          left: `${selection.x}%`,
                          top: `${selection.y}%`,
                          width: `${selection.w}%`,
                          height: `${selection.h}%`,
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                  <ImagePlus className="size-8" />
                  <span>Paste or upload a formula screenshot</span>
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 space-y-2">
            <div className="rounded-lg border bg-card p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold tracking-tight">LaTeX</h3>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Copy LaTeX"
                    disabled={!result}
                    onClick={() => result && void copyText(result.latex, "LaTeX copied")}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Copy display math"
                    disabled={!result}
                    onClick={() =>
                      result && void copyText(result.display_md, "Display math copied")
                    }
                  >
                    <Clipboard className="size-3.5" />
                  </Button>
                </div>
              </div>
              <Textarea
                readOnly
                value={result?.latex ?? ""}
                placeholder="Converted LaTeX appears here"
                className="min-h-28 resize-none font-mono text-xs leading-snug"
              />
            </div>

            <div className="rounded-lg border bg-card p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold tracking-tight">Preview</h3>
                {result ? (
                  <span className="text-[11px] text-muted-foreground">
                    {result.confidence} confidence
                  </span>
                ) : null}
              </div>
              <div className="min-h-24 overflow-x-auto rounded-md bg-muted/30 p-2">
                {result ? (
                  <MarkdownView markdown={result.display_md} />
                ) : (
                  <p className="text-xs text-muted-foreground">KaTeX preview appears here</p>
                )}
              </div>
              {result?.warnings.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-700 dark:text-amber-300">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
