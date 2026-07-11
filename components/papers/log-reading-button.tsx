"use client";

import { useState, useTransition } from "react";
import { BookOpenCheck } from "lucide-react";
import { toast } from "sonner";
import { logReadingSession } from "@/actions/papers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function LogReadingButton({ paperId }: { paperId: string }) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function log() {
    startTransition(async () => {
      const result = await logReadingSession({
        paper_id: paperId,
        minutes: minutes ? Number(minutes) : null,
        note: note || null,
      });
      if (result.ok) {
        toast.success("Reading session logged");
        setOpen(false);
        setMinutes("");
        setNote("");
      } else {
        toast.error(result.error ?? "Failed to log session");
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpenCheck className="size-4" /> Log reading
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2 p-3">
        <div className="space-y-1.5">
          <Label htmlFor="session-minutes">Minutes (optional)</Label>
          <Input
            id="session-minutes"
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="session-note">Note (optional)</Label>
          <Input
            id="session-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. read §3–4"
          />
        </div>
        <div className="flex justify-end">
          <Button size="sm" className="h-7" onClick={log} disabled={pending}>
            {pending ? "Logging…" : "Log session"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
