"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePaperMeta } from "@/actions/papers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type { PaperRow } from "@/lib/supabase/database.types";
import {
  READING_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  readingStatusValues,
  verificationStatusValues,
} from "@/lib/validation/enums";

export function PaperMetaDialog({ paper }: { paper: PaperRow }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const val = (k: string) => {
      const v = form.get(k);
      return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
    };

    startTransition(async () => {
      const result = await updatePaperMeta({
        id: paper.id,
        title: val("title") ?? paper.title,
        subtitle: val("subtitle"),
        authors: (val("authors") ?? "")
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        organisation: val("organisation"),
        year: val("year") ? Number(val("year")) : null,
        venue: val("venue"),
        arxiv_id: val("arxiv_id"),
        doi: val("doi"),
        canonical_url: val("canonical_url") ?? "",
        pdf_url: val("pdf_url") ?? "",
        abstract: val("abstract"),
        reading_status: (val("reading_status") ??
          paper.reading_status) as PaperRow["reading_status"],
        verification_status: (val("verification_status") ??
          paper.verification_status) as PaperRow["verification_status"],
        priority: Number(val("priority") ?? paper.priority),
        tiktok_shop_relevance: Number(val("tiktok_shop_relevance") ?? paper.tiktok_shop_relevance),
        team_relevance: Number(val("team_relevance") ?? paper.team_relevance),
        production_relevance: Number(val("production_relevance") ?? paper.production_relevance),
        production_evidence: val("production_evidence"),
        primary_source_verified: form.get("primary_source_verified") === "on",
        needs_revisit: form.get("needs_revisit") === "on",
        note_source: val("note_source"),
      });
      if (result.ok) {
        toast.success("Metadata saved");
        setOpen(false);
      } else {
        toast.error(result.error ?? "Save failed");
      }
    });
  }

  const ratingSelect = (name: string, label: string, value: number, max = 5, min = 0) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Select name={name} defaultValue={value.toString()}>
        <SelectTrigger id={name} className="w-full" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
            <SelectItem key={n} value={n.toString()}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit metadata
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Paper metadata</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={paper.title} required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input id="subtitle" name="subtitle" defaultValue={paper.subtitle ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="authors">Authors (comma-separated)</Label>
            <Input id="authors" name="authors" defaultValue={paper.authors.join(", ")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organisation">Organisation</Label>
            <Input id="organisation" name="organisation" defaultValue={paper.organisation ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venue">Venue</Label>
            <Input id="venue" name="venue" defaultValue={paper.venue ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="year">Year</Label>
            <Input id="year" name="year" type="number" defaultValue={paper.year ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="arxiv_id">arXiv ID</Label>
            <Input id="arxiv_id" name="arxiv_id" defaultValue={paper.arxiv_id ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doi">DOI</Label>
            <Input id="doi" name="doi" defaultValue={paper.doi ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="canonical_url">Canonical URL</Label>
            <Input
              id="canonical_url"
              name="canonical_url"
              type="url"
              defaultValue={paper.canonical_url ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pdf_url">PDF URL</Label>
            <Input id="pdf_url" name="pdf_url" type="url" defaultValue={paper.pdf_url ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note_source">Note source</Label>
            <Input
              id="note_source"
              name="note_source"
              defaultValue={paper.note_source ?? ""}
              placeholder="e.g. study guide name + page"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="abstract">Abstract</Label>
            <Textarea id="abstract" name="abstract" defaultValue={paper.abstract ?? ""} rows={4} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reading_status">Reading status</Label>
            <Select name="reading_status" defaultValue={paper.reading_status}>
              <SelectTrigger id="reading_status" className="w-full" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {readingStatusValues.map((s) => (
                  <SelectItem key={s} value={s}>
                    {READING_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="verification_status">Verification status</Label>
            <Select name="verification_status" defaultValue={paper.verification_status}>
              <SelectTrigger id="verification_status" className="w-full" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {verificationStatusValues.map((s) => (
                  <SelectItem key={s} value={s}>
                    {VERIFICATION_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ratingSelect("priority", "Priority (1–5)", paper.priority, 5, 1)}
          {ratingSelect(
            "tiktok_shop_relevance",
            "TikTok Shop relevance",
            paper.tiktok_shop_relevance
          )}
          {ratingSelect("team_relevance", "Team relevance", paper.team_relevance)}
          {ratingSelect("production_relevance", "Production relevance", paper.production_relevance)}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="production_evidence">Production evidence (short)</Label>
            <Textarea
              id="production_evidence"
              name="production_evidence"
              defaultValue={paper.production_evidence ?? ""}
              rows={2}
            />
          </div>

          <Label className="flex items-center gap-2 font-normal">
            <Checkbox
              name="primary_source_verified"
              defaultChecked={paper.primary_source_verified}
            />
            Primary source verified
          </Label>
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox name="needs_revisit" defaultChecked={paper.needs_revisit} />
            Needs revisit
          </Label>

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save metadata"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
