"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProcessingStatus } from "@/lib/supabase/database.types";

const ACTIVE: ProcessingStatus[] = [
  "queued",
  "fetching",
  "extracting",
  "summarising",
  "suggesting",
];

const STAGE_LABELS: Record<ProcessingStatus, string> = {
  none: "",
  queued: "Queued for processing…",
  fetching: "Fetching metadata…",
  extracting: "Extracting the paper text…",
  summarising: "Reading the paper and drafting summaries…",
  suggesting: "Suggesting topics, concepts, and priority…",
  done: "Processing complete",
  failed: "Processing failed",
};

/**
 * Drives AI processing from the paper page: kicks off the run when the paper
 * is queued, polls status, refreshes the page when done, and offers retry on
 * failure. The POST uses keepalive so navigating away doesn't cancel the run.
 */
export function ProcessingBanner({
  paperId,
  initialStatus,
  initialError,
}: {
  paperId: string;
  initialStatus: ProcessingStatus;
  initialError: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ProcessingStatus>(initialStatus);
  const [error, setError] = useState<string | null>(initialError);
  const startedRef = useRef(false);

  const start = useCallback(() => {
    setError(null);
    setStatus("queued");
    fetch(`/api/papers/${paperId}/process`, { method: "POST", keepalive: true }).catch(() => {
      // Result is picked up by polling either way.
    });
  }, [paperId]);

  // Auto-start exactly once when the paper arrives queued.
  useEffect(() => {
    if (initialStatus === "queued" && !startedRef.current) {
      startedRef.current = true;
      start();
    }
  }, [initialStatus, start]);

  // Poll while active.
  useEffect(() => {
    if (!ACTIVE.includes(status)) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/papers/${paperId}/process`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          processing_status: ProcessingStatus;
          processing_error: string | null;
        };
        setStatus(data.processing_status);
        setError(data.processing_error);
        if (data.processing_status === "done") {
          router.refresh();
        }
      } catch {
        // transient poll failure — keep polling
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [status, paperId, router]);

  if (status === "none" || status === "done") return null;

  if (status === "failed") {
    return (
      <div
        role="alert"
        className="flex items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
      >
        <div>
          <p className="font-medium">AI processing failed</p>
          {error ? <p className="mt-0.5 text-xs text-muted-foreground">{error}</p> : null}
          <p className="mt-0.5 text-xs text-muted-foreground">
            Completed stages are kept — retrying resumes where it stopped.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={start}>
          <RefreshCw className="size-3.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-md border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-sm text-violet-800 dark:text-violet-300"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <Sparkles className="size-3.5" aria-hidden />
      <span>{STAGE_LABELS[status]}</span>
      <span className="ml-auto text-xs opacity-70">
        You can keep working — this runs server-side.
      </span>
    </div>
  );
}
