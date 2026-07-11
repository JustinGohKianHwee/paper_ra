"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createExperiment } from "@/actions/experiments";
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
import {
  EXPERIMENT_STATUS_LABELS,
  experimentStatusValues,
  type ExperimentStatus,
} from "@/lib/validation/enums";

interface Props {
  papers: { id: string; title: string }[];
  concepts: { id: string; name: string }[];
}

export function NewExperimentForm({ papers, concepts }: Props) {
  const [pending, startTransition] = useTransition();
  const [paperIds, setPaperIds] = useState<Set<string>>(new Set());
  const [conceptIds, setConceptIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const val = (k: string) => {
      const v = form.get(k);
      return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
    };

    startTransition(async () => {
      const result = await createExperiment({
        title: val("title") ?? "",
        repo_name: val("repo_name"),
        branch_ref: val("branch_ref"),
        research_question: val("research_question"),
        hypothesis: val("hypothesis"),
        baseline: val("baseline"),
        treatment: val("treatment"),
        dataset: val("dataset"),
        status: (val("status") ?? "proposed") as ExperimentStatus,
        happened_on: val("happened_on"),
        metrics_json: null,
        paper_ids: [...paperIds],
        concept_ids: [...conceptIds],
      });
      if (result && !result.ok) {
        setError(result.error ?? "Failed to create experiment");
        toast.error(result.error ?? "Failed to create experiment");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" required maxLength={300} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="repo_name">Repository</Label>
          <Input id="repo_name" name="repo_name" placeholder="personal repo name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="branch_ref">Branch / commit</Label>
          <Input id="branch_ref" name="branch_ref" placeholder="branch or short SHA" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="research_question">Research question</Label>
        <Textarea id="research_question" name="research_question" rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hypothesis">Hypothesis</Label>
        <Textarea id="hypothesis" name="hypothesis" rows={2} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="baseline">Baseline</Label>
          <Textarea id="baseline" name="baseline" rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="treatment">Treatment</Label>
          <Textarea id="treatment" name="treatment" rows={2} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="dataset">Dataset</Label>
          <Input id="dataset" name="dataset" placeholder="public dataset name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue="proposed">
            <SelectTrigger id="status" className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {experimentStatusValues.map((s) => (
                <SelectItem key={s} value={s}>
                  {EXPERIMENT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="happened_on">Date</Label>
          <Input id="happened_on" name="happened_on" type="date" />
        </div>
      </div>

      {papers.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Linked papers</legend>
          <div className="grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {papers.map((p) => (
              <Label key={p.id} className="flex items-center gap-2 font-normal text-sm">
                <Checkbox
                  checked={paperIds.has(p.id)}
                  onCheckedChange={(v) => {
                    const next = new Set(paperIds);
                    if (v === true) next.add(p.id);
                    else next.delete(p.id);
                    setPaperIds(next);
                  }}
                />
                <span className="truncate">{p.title}</span>
              </Label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {concepts.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Linked concepts</legend>
          <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {concepts.map((c) => (
              <Label key={c.id} className="flex items-center gap-2 font-normal text-sm">
                <Checkbox
                  checked={conceptIds.has(c.id)}
                  onCheckedChange={(v) => {
                    const next = new Set(conceptIds);
                    if (v === true) next.add(c.id);
                    else next.delete(c.id);
                    setConceptIds(next);
                  }}
                />
                <span className="truncate">{c.name}</span>
              </Label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Record experiment"}
      </Button>
    </form>
  );
}
