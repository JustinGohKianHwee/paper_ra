"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateExperimentMeta } from "@/actions/experiments";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ExperimentRow } from "@/lib/supabase/database.types";
import { EXPERIMENT_STATUS_LABELS, experimentStatusValues } from "@/lib/validation/enums";

export function ExperimentMetaDialog({ experiment }: { experiment: ExperimentRow }) {
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
      const result = await updateExperimentMeta({
        id: experiment.id,
        title: val("title") ?? experiment.title,
        repo_name: val("repo_name"),
        branch_ref: val("branch_ref"),
        dataset: val("dataset"),
        status: val("status") ?? experiment.status,
        happened_on: val("happened_on"),
        metrics_json: val("metrics_json"),
      });
      if (result.ok) {
        toast.success("Experiment updated");
        setOpen(false);
      } else {
        toast.error(result.error ?? "Update failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Experiment details</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="exp-title">Title</Label>
            <Input id="exp-title" name="title" defaultValue={experiment.title} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="exp-repo">Repository</Label>
              <Input id="exp-repo" name="repo_name" defaultValue={experiment.repo_name ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-branch">Branch / commit</Label>
              <Input id="exp-branch" name="branch_ref" defaultValue={experiment.branch_ref ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-dataset">Dataset</Label>
              <Input id="exp-dataset" name="dataset" defaultValue={experiment.dataset ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Date</Label>
              <Input
                id="exp-date"
                name="happened_on"
                type="date"
                defaultValue={experiment.happened_on ?? ""}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-status">Status</Label>
            <Select name="status" defaultValue={experiment.status}>
              <SelectTrigger id="exp-status" className="w-full" size="sm">
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
            <Label htmlFor="exp-metrics">Metrics JSON (optional)</Label>
            <Textarea
              id="exp-metrics"
              name="metrics_json"
              rows={4}
              className="font-mono text-xs"
              defaultValue={
                experiment.metrics_json ? JSON.stringify(experiment.metrics_json, null, 2) : ""
              }
              placeholder='{"auc": 0.79, "ndcg@10": 0.42}'
            />
          </div>
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
