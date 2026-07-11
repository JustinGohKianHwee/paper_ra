"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createConcept } from "@/actions/concepts";
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

export function NewConceptDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createConcept({
        name: form.get("name"),
        plain_definition_md: form.get("plain_definition_md") || null,
      });
      if (result && !result.ok) {
        toast.error(result.error ?? "Failed to create concept");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Add concept
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New concept</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="concept-name">Name *</Label>
            <Input
              id="concept-name"
              name="name"
              required
              maxLength={200}
              placeholder="e.g. KV-cache compression"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="concept-def">Plain-language definition</Label>
            <Textarea
              id="concept-def"
              name="plain_definition_md"
              rows={3}
              placeholder="One or two sentences — the rest is editable on the concept page."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create concept"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
