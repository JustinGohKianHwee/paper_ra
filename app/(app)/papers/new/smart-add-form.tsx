"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { FileUp, Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createSmartPaper, resolveSmartInput } from "@/actions/smart-add";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { ResolvedMetadata } from "@/lib/ai/resolve";

type Step = "input" | "preview";

interface Draft {
  raw_input: string;
  title: string;
  authors: string; // comma-separated for editing
  abstract: string;
  year: string;
  venue: string;
  arxiv_id: string;
  doi: string;
  canonical_url: string;
  pdf_url: string;
  storage_path: string | null;
}

const EMPTY_DRAFT: Draft = {
  raw_input: "",
  title: "",
  authors: "",
  abstract: "",
  year: "",
  venue: "",
  arxiv_id: "",
  doi: "",
  canonical_url: "",
  pdf_url: "",
  storage_path: null,
};

function draftFromMetadata(raw: string, m: ResolvedMetadata | null): Draft {
  return {
    ...EMPTY_DRAFT,
    raw_input: raw,
    title: m?.title ?? "",
    authors: m?.authors.join(", ") ?? "",
    abstract: m?.abstract ?? "",
    year: m?.year?.toString() ?? "",
    venue: m?.venue ?? "",
    arxiv_id: m?.arxivId ?? "",
    doi: m?.doi ?? "",
    canonical_url: m?.canonicalUrl ?? "",
    pdf_url: m?.pdfUrl ?? "",
  };
}

export function SmartAddForm({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [raw, setRaw] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function resolve() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await resolveSmartInput(raw);
      if (!result.ok) {
        setError(result.error ?? "Could not read that input");
        return;
      }
      if (!result.metadata) {
        setNotice(
          result.error
            ? `Lookup failed (${result.error}). Fill in the details manually below.`
            : "No metadata found for that input — fill in what you know below."
        );
      }
      setDraft(draftFromMetadata(raw.trim(), result.metadata ?? null));
      setStep("preview");
    });
  }

  async function onFileChosen(file: File) {
    setError(null);
    setNotice(null);
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError("PDF is larger than 30 MB.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const path = `${user.id}/uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("paper-attachments")
        .upload(path, file, { contentType: "application/pdf" });
      if (uploadError) throw new Error(uploadError.message);
      setDraft({
        ...EMPTY_DRAFT,
        raw_input: `upload:${file.name}`,
        title: file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " "),
        storage_path: path,
      });
      setNotice("PDF uploaded. Check the title, then add — processing reads the full text.");
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createSmartPaper({
        raw_input: draft.raw_input,
        title: draft.title,
        authors: draft.authors
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        abstract: draft.abstract || null,
        year: draft.year ? Number(draft.year) : null,
        venue: draft.venue || null,
        arxiv_id: draft.arxiv_id || null,
        doi: draft.doi || null,
        canonical_url: draft.canonical_url || null,
        pdf_url: draft.pdf_url || null,
        storage_path: draft.storage_path,
      });
      if (!result.ok || !result.slug) {
        setError(result.error ?? "Failed to add paper");
        toast.error(result.error ?? "Failed to add paper");
        return;
      }
      toast.success(aiEnabled ? "Paper added — processing starts now" : "Paper added");
      router.push(`/papers/${result.slug}`);
    });
  }

  if (step === "input") {
    return (
      <div className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            resolve();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="https://arxiv.org/abs/2505.04421 · 10.1145/… · paper title"
            aria-label="Paper reference"
            autoFocus
            className="h-10"
          />
          <Button type="submit" disabled={pending || raw.trim().length < 3} className="h-10">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Look up
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileUp className="size-4" />
            )}
            Upload a PDF instead
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFileChosen(file);
            }}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

        <div className="space-y-1.5">
          <Label htmlFor="sa-title">Title *</Label>
          <Input
            id="sa-title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sa-authors">Authors (comma-separated)</Label>
          <Input
            id="sa-authors"
            value={draft.authors}
            onChange={(e) => setDraft({ ...draft, authors: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="sa-year">Year</Label>
            <Input
              id="sa-year"
              value={draft.year}
              onChange={(e) => setDraft({ ...draft, year: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-venue">Venue</Label>
            <Input
              id="sa-venue"
              value={draft.venue}
              onChange={(e) => setDraft({ ...draft, venue: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-arxiv">arXiv ID</Label>
            <Input
              id="sa-arxiv"
              value={draft.arxiv_id}
              onChange={(e) => setDraft({ ...draft, arxiv_id: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-doi">DOI</Label>
            <Input
              id="sa-doi"
              value={draft.doi}
              onChange={(e) => setDraft({ ...draft, doi: e.target.value })}
            />
          </div>
        </div>
        {draft.abstract ? (
          <div className="space-y-1.5">
            <Label htmlFor="sa-abstract">Abstract</Label>
            <Textarea
              id="sa-abstract"
              value={draft.abstract}
              onChange={(e) => setDraft({ ...draft, abstract: e.target.value })}
              rows={5}
            />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => setStep("input")}>
            Back
          </Button>
          <Button onClick={create} disabled={pending || !draft.title.trim()}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {aiEnabled ? "Add & process" : "Add to library"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
