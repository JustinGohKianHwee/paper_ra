"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createSynthesisNote } from "@/actions/synthesis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { defaultSynthesisTitle, periodStartFor } from "@/lib/templates/synthesis";
import type { SynthesisKind } from "@/lib/validation/enums";

export function NewSynthesisForm({ aiEnabled }: { aiEnabled: boolean }) {
  const [kind, setKind] = useState<SynthesisKind>("weekly");
  const [periodStart, setPeriodStart] = useState(() => periodStartFor("weekly", new Date()));
  const [title, setTitle] = useState(() =>
    defaultSynthesisTitle("weekly", periodStartFor("weekly", new Date()))
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onKindChange(next: SynthesisKind) {
    setKind(next);
    const start = periodStartFor(next, new Date());
    setPeriodStart(start);
    setTitle(defaultSynthesisTitle(next, start));
  }

  function submit(withAiDraft: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await createSynthesisNote(
        { kind, period_start: periodStart, title, body_md: "" },
        { withAiDraft }
      );
      if (result && !result.ok) {
        setError(result.error ?? "Failed to create note");
        toast.error(result.error ?? "Failed to create note");
      } else if (result?.notice) {
        toast.info(result.notice);
      }
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="synthesis-kind">Kind</Label>
          <Select value={kind} onValueChange={(v) => onKindChange(v as SynthesisKind)}>
            <SelectTrigger id="synthesis-kind" className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="synthesis-period">Period start</Label>
          <Input
            id="synthesis-period"
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="synthesis-title">Title</Label>
        <Input
          id="synthesis-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={300}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {aiEnabled ? (
          <Button type="button" onClick={() => submit(true)} disabled={pending}>
            <Sparkles className="size-4" />
            {pending ? "Working…" : "Draft with AI"}
          </Button>
        ) : null}
        <Button type="submit" variant={aiEnabled ? "outline" : "default"} disabled={pending}>
          {pending ? "Creating…" : "Start from blank template"}
        </Button>
      </div>
      {aiEnabled ? (
        <p className="text-[11px] text-muted-foreground">
          The AI draft is built only from this period&apos;s recorded activity (papers, sessions,
          notes, questions, misconceptions, concepts, experiments). You review and edit it before
          approving; the original draft is kept alongside your version.
        </p>
      ) : null}
    </form>
  );
}
