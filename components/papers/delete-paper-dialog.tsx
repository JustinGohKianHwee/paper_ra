"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deletePaperForever,
  relatedRecordCounts,
  restorePaper,
  trashPaper,
} from "@/actions/papers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Soft-delete flow. The dialog spells out exactly what happens to related
 * records so "delete" is never a surprise: everything attached to the paper
 * is hidden with it (and restorable), while shared knowledge survives.
 */
export function TrashPaperButton({ paperId, title }: { paperId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await trashPaper(paperId);
      if (result.ok) {
        toast.success("Moved to trash", {
          description: "Restore it any time from Papers → Trash.",
        });
        router.push("/papers");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not move to trash");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          aria-label="Move paper to trash"
        >
          <Trash2 className="size-4" /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move “{title}” to trash?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 pt-1 text-sm">
              <p>
                The paper leaves your library, search, dashboard, and Radar. Nothing is destroyed
                yet — restore it any time from{" "}
                <span className="font-medium text-foreground">Papers → Trash</span>.
              </p>
              <p>
                <span className="font-medium text-foreground">Hidden with it:</span> AI passage
                summaries, structured notes, reading annotations and questions, Q&amp;A answers,
                reading sessions, sources, suggestions, and paper relationships.
              </p>
              <p>
                <span className="font-medium text-foreground">Kept in your knowledge base:</span>{" "}
                topics, concepts, and misconception records stay — they belong to you, not the
                paper.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? "Moving…" : "Move to trash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RestorePaperButton({ paperId }: { paperId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await restorePaper(paperId);
          if (result.ok) {
            toast.success("Paper restored");
            router.refresh();
          } else {
            toast.error(result.error ?? "Restore failed");
          }
        })
      }
    >
      <ArchiveRestore className="size-4" /> {pending ? "Restoring…" : "Restore"}
    </Button>
  );
}

const COUNT_LABELS: Record<string, string> = {
  notes: "structured note sections",
  passages: "AI passage summaries",
  annotations: "reading annotations",
  qa: "Q&A exchanges",
  sessions: "reading sessions",
  sources: "source citations",
  suggestions: "AI suggestions",
  relations: "paper relationships",
};

export function DeleteForeverButton({ paperId, title }: { paperId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    relatedRecordCounts(paperId).then((c) => {
      if (!cancelled) setCounts(c);
    });
    return () => {
      cancelled = true;
    };
  }, [open, paperId]);

  function confirm() {
    startTransition(async () => {
      const result = await deletePaperForever(paperId);
      if (result.ok) {
        toast.success("Paper permanently deleted");
        router.refresh();
      } else {
        toast.error(result.error ?? "Delete failed");
      }
    });
  }

  const doomed = Object.entries(counts ?? {}).filter(
    ([key, n]) => key !== "misconceptions" && n > 0
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
          <Trash2 className="size-4" /> Delete forever
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Permanently delete “{title}”?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 pt-1 text-sm">
              <p className="font-medium text-destructive">This cannot be undone.</p>
              {counts === null ? (
                <p>Counting related records…</p>
              ) : (
                <>
                  {doomed.length > 0 ? (
                    <div>
                      <p>Deleted with the paper:</p>
                      <ul className="mt-1 list-disc pl-5">
                        {doomed.map(([key, n]) => (
                          <li key={key}>
                            {n} {COUNT_LABELS[key] ?? key}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p>No notes or activity are attached to this paper.</p>
                  )}
                  {counts.misconceptions > 0 ? (
                    <p>
                      {counts.misconceptions} misconception record
                      {counts.misconceptions === 1 ? "" : "s"} will be kept, with the paper link
                      cleared.
                    </p>
                  ) : null}
                  <p>Topics and concepts are never deleted with a paper.</p>
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={pending || counts === null}>
            {pending ? "Deleting…" : "Delete forever"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
