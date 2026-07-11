"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createMisconception } from "@/actions/misconceptions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NONE = "__none__";

interface Props {
  papers: { id: string; title: string }[];
  concepts: { id: string; name: string }[];
  preselectedPaperId?: string;
}

export function NewMisconceptionForm({ papers, concepts, preselectedPaperId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const val = (k: string) => {
      const v = form.get(k);
      return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
    };
    const paperId = val("paper_id");
    const conceptId = val("concept_id");

    startTransition(async () => {
      const result = await createMisconception({
        initial_belief_md: val("initial_belief_md") ?? "",
        why_i_believed_md: val("why_i_believed_md"),
        corrected_understanding_md: val("corrected_understanding_md") ?? "",
        evidence_md: val("evidence_md"),
        paper_id: paperId === NONE ? null : paperId,
        concept_id: conceptId === NONE ? null : conceptId,
        corrected_on: val("corrected_on") ?? undefined,
        confidence: Number(val("confidence") ?? 3),
        can_explain_without_notes: form.get("can_explain_without_notes") === "on",
      });
      if (result && !result.ok) {
        setError(result.error ?? "Failed to save");
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="initial_belief_md">I initially thought… *</Label>
        <Textarea id="initial_belief_md" name="initial_belief_md" required rows={3} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="why_i_believed_md">Why I believed it</Label>
        <Textarea id="why_i_believed_md" name="why_i_believed_md" rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="corrected_understanding_md">Corrected understanding *</Label>
        <Textarea
          id="corrected_understanding_md"
          name="corrected_understanding_md"
          required
          rows={3}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="evidence_md">Evidence</Label>
        <Textarea
          id="evidence_md"
          name="evidence_md"
          rows={2}
          placeholder="Paper section, experiment, or reasoning that corrected you"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="paper_id">Linked paper</Label>
          <Select name="paper_id" defaultValue={preselectedPaperId ?? NONE}>
            <SelectTrigger id="paper_id" className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {papers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title.length > 60 ? `${p.title.slice(0, 60)}…` : p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="concept_id">Linked concept</Label>
          <Select name="concept_id" defaultValue={NONE}>
            <SelectTrigger id="concept_id" className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {concepts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="corrected_on">Date corrected</Label>
          <Input
            id="corrected_on"
            name="corrected_on"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confidence">Confidence in correction (1–5)</Label>
          <Select name="confidence" defaultValue="3">
            <SelectTrigger id="confidence" className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={n.toString()}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Label className="flex items-center gap-2 font-normal">
        <Checkbox name="can_explain_without_notes" />I can explain the correction without my notes
      </Label>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save misconception"}
      </Button>
    </form>
  );
}
