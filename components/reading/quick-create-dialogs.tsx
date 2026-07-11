"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Compass, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { createConceptInline } from "@/actions/concepts";
import { createMisconceptionInline } from "@/actions/misconceptions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Create a concept without leaving reading mode; auto-links to the paper. */
export function QuickConceptDialog({ paperId }: { paperId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createConceptInline({
        name: form.get("name"),
        plain_definition_md: form.get("plain_definition_md") || null,
        paper_id: paperId,
      });
      if (result.ok) {
        toast.success("Concept created and linked");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to create concept");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7">
          <Compass className="size-3.5" /> New concept
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New concept (linked to this paper)</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="qc-name">Name *</Label>
            <Input id="qc-name" name="name" required maxLength={200} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qc-def">Plain-language definition</Label>
            <Textarea id="qc-def" name="plain_definition_md" rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Record a misconception without leaving reading mode; pre-linked to the paper. */
export function QuickMisconceptionDialog({ paperId }: { paperId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createMisconceptionInline({
        initial_belief_md: form.get("initial_belief_md"),
        corrected_understanding_md: form.get("corrected_understanding_md"),
        evidence_md: form.get("evidence_md") || null,
        paper_id: paperId,
        confidence: 3,
        can_explain_without_notes: false,
      });
      if (result.ok) {
        toast.success("Misconception recorded");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7">
          <Lightbulb className="size-3.5" /> Record misconception
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a misconception (linked to this paper)</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="qm-belief">I initially thought… *</Label>
            <Textarea id="qm-belief" name="initial_belief_md" required rows={2} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qm-correction">Corrected understanding *</Label>
            <Textarea id="qm-correction" name="corrected_understanding_md" required rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qm-evidence">Evidence</Label>
            <Textarea id="qm-evidence" name="evidence_md" rows={2} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Confidence and details can be refined later on the Misconceptions page.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
