"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createPaper } from "@/actions/papers";
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
import { ReadingStatusItems } from "@/components/status-select";
import { type ReadingStatus } from "@/lib/validation/enums";

export function NewPaperForm({ topics }: { topics: { id: string; name: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
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
      const result = await createPaper({
        title: val("title") ?? "",
        subtitle: val("subtitle"),
        authors: (val("authors") ?? "")
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        organisation: val("organisation"),
        year: val("year") ? Number(val("year")) : null,
        venue: val("venue"),
        arxiv_id: val("arxiv_id"),
        doi: null,
        canonical_url: val("canonical_url") ?? "",
        pdf_url: "",
        abstract: val("abstract"),
        reading_status: (val("reading_status") ?? "to_read") as ReadingStatus,
        verification_status: "metadata_only",
        priority: Number(val("priority") ?? 3),
        visibility: "private",
        relevance: Number(val("relevance") ?? 0),
        relevance_note: null,
        production_relevance: 0,
        production_evidence: null,
        needs_revisit: false,
        note_source: null,
        topic_ids: [...selectedTopics],
        concept_ids: [],
      });
      // createPaper redirects on success; a return value means failure.
      if (result && !result.ok) {
        setError(result.error ?? "Failed to create paper");
        toast.error(result.error ?? "Failed to create paper");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" required maxLength={300} placeholder="Paper title" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input id="subtitle" name="subtitle" maxLength={300} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="authors">Authors (comma-separated)</Label>
        <Input id="authors" name="authors" placeholder="First Author, Second Author" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="organisation">Organisation</Label>
          <Input id="organisation" name="organisation" placeholder="e.g. DeepMind" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="year">Year</Label>
          <Input id="year" name="year" type="number" min={1950} max={2100} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="venue">Venue</Label>
          <Input id="venue" name="venue" placeholder="e.g. arXiv, KDD" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="arxiv_id">arXiv ID</Label>
          <Input id="arxiv_id" name="arxiv_id" placeholder="2505.04421" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="canonical_url">Canonical URL</Label>
        <Input
          id="canonical_url"
          name="canonical_url"
          type="url"
          placeholder="https://arxiv.org/abs/…"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="abstract">Abstract</Label>
        <Textarea id="abstract" name="abstract" rows={4} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="reading_status">Reading status</Label>
          <Select name="reading_status" defaultValue="to_read">
            <SelectTrigger id="reading_status" className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <ReadingStatusItems />
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priority">Priority (1–5)</Label>
          <Select name="priority" defaultValue="3">
            <SelectTrigger id="priority" className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((p) => (
                <SelectItem key={p} value={p.toString()}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="relevance">Relevance to me (0–5)</Label>
          <Select name="relevance" defaultValue="0">
            <SelectTrigger id="relevance" className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4, 5].map((p) => (
                <SelectItem key={p} value={p.toString()}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {topics.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Topics</legend>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {topics.map((t) => (
              <Label key={t.id} className="flex items-center gap-2 font-normal text-sm">
                <Checkbox
                  checked={selectedTopics.has(t.id)}
                  onCheckedChange={(v) => {
                    const next = new Set(selectedTopics);
                    if (v === true) next.add(t.id);
                    else next.delete(t.id);
                    setSelectedTopics(next);
                  }}
                />
                {t.name}
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
        {pending ? "Creating…" : "Create paper"}
      </Button>
    </form>
  );
}
