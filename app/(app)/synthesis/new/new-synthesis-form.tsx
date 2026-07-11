"use client";

import { useState, useTransition } from "react";
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

export function NewSynthesisForm() {
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

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSynthesisNote({
        kind,
        period_start: periodStart,
        title,
        body_md: "",
      });
      if (result && !result.ok) {
        setError(result.error ?? "Failed to create note");
        toast.error(result.error ?? "Failed to create note");
      }
    });
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

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create from template"}
      </Button>
    </form>
  );
}
