"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CircleStop, Play, Timer } from "lucide-react";
import { toast } from "sonner";
import { endSession, startSession, type SessionInfo } from "@/actions/sessions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ReadingStatus } from "@/lib/supabase/database.types";
import { READING_STATUS_LABELS, readingStatusValues } from "@/lib/validation/enums";

function formatElapsed(startedAt: string, now: number): string {
  const totalSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

const KEEP = "__keep__";

/**
 * Explicit reading-session workflow: begin/resume on entering reading mode,
 * always-visible elapsed timer, and an End-session dialog that logs duration
 * and captures a takeaway + what to continue next time. No manual timers.
 */
export function SessionBar({
  paperId,
  activeSession,
  currentStatus,
  openQuestionCount,
}: {
  paperId: string;
  activeSession: SessionInfo | null;
  currentStatus: ReadingStatus;
  openQuestionCount: number;
}) {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(
    activeSession && activeSession.paper_id === paperId ? activeSession : null
  );
  const [now, setNow] = useState(() => Date.now());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session]);

  function begin() {
    startTransition(async () => {
      const result = await startSession(paperId);
      if (result.ok && result.session) {
        setSession(result.session);
        toast.success("Reading session started");
      } else {
        toast.error(result.error ?? "Could not start session");
      }
    });
  }

  function finish(formData: FormData) {
    if (!session) return;
    const takeaway = (formData.get("takeaway") as string)?.trim() || null;
    const continueNext = (formData.get("continue") as string)?.trim() || null;
    const statusRaw = formData.get("reading_status") as string;
    startTransition(async () => {
      const result = await endSession({
        session_id: session.id,
        takeaway_md: takeaway,
        continue_md: continueNext,
        reading_status: statusRaw && statusRaw !== KEEP ? statusRaw : null,
      });
      if (result.ok) {
        setDialogOpen(false);
        setSession(null);
        toast.success(`Session logged — ${result.minutes} min`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not end session");
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
        {session ? (
          <>
            <Timer className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <span className="text-sm font-medium tabular-nums" aria-live="off">
              {formatElapsed(session.started_at, now)}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              reading session in progress
            </span>
            <Button
              size="sm"
              variant="destructive"
              className="ml-auto h-7"
              onClick={() => setDialogOpen(true)}
            >
              <CircleStop className="size-3.5" /> End session
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">
              Start a session to track this reading — it logs itself when you end it.
            </span>
            <Button size="sm" className="ml-auto h-7" onClick={begin} disabled={pending}>
              <Play className="size-3.5" /> Start session
            </Button>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>End reading session</DialogTitle>
          </DialogHeader>
          {session ? (
            <form action={finish} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {formatElapsed(session.started_at, now)} logged automatically.
                {openQuestionCount > 0
                  ? ` You still have ${openQuestionCount} unresolved question${openQuestionCount === 1 ? "" : "s"} on this paper.`
                  : ""}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="session-takeaway">Main takeaway (optional)</Label>
                <Textarea
                  id="session-takeaway"
                  name="takeaway"
                  rows={3}
                  placeholder="What did you actually learn or decide this session?"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="session-continue">Continue next time (optional)</Label>
                <Textarea
                  id="session-continue"
                  name="continue"
                  rows={2}
                  placeholder="e.g. resume at §4, check the ablation table"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="session-status">Update reading status (optional)</Label>
                <Select name="reading_status" defaultValue={KEEP}>
                  <SelectTrigger id="session-status" className="w-full" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={KEEP}>
                      Keep “{READING_STATUS_LABELS[currentStatus]}”
                    </SelectItem>
                    {readingStatusValues.map((s) => (
                      <SelectItem key={s} value={s}>
                        {READING_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Keep reading
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "End session"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
