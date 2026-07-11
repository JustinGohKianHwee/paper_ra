"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { addPaperRelation, removePaperRelation } from "@/actions/papers";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RELATION_KIND_LABELS,
  relationKindValues,
  type RelationKind,
} from "@/lib/validation/enums";

export interface RelationDisplay {
  id: string;
  kind: RelationKind;
  direction: "out" | "in";
  otherTitle: string;
  otherSlug: string;
}

interface Props {
  paperId: string;
  relations: RelationDisplay[];
  candidates: { id: string; title: string }[];
}

export function RelationsEditor({ paperId, relations, candidates }: Props) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>("");
  const [kind, setKind] = useState<RelationKind>("builds_on");
  const [pending, startTransition] = useTransition();

  function add() {
    if (!target) return;
    startTransition(async () => {
      const result = await addPaperRelation({
        from_paper_id: paperId,
        to_paper_id: target,
        relation_kind: kind,
      });
      if (result.ok) {
        toast.success("Relation added");
        setOpen(false);
        setTarget("");
      } else {
        toast.error(result.error ?? "Failed to add relation");
      }
    });
  }

  function remove(relationId: string) {
    startTransition(async () => {
      const result = await removePaperRelation(relationId);
      if (!result.ok) toast.error(result.error ?? "Failed to remove relation");
    });
  }

  return (
    <div className="space-y-1.5">
      {relations.length > 0 ? (
        <ul className="space-y-1">
          {relations.map((r) => (
            <li key={`${r.id}-${r.direction}`} className="group flex items-center gap-2 text-sm">
              <span className="text-xs text-muted-foreground w-28 shrink-0">
                {r.direction === "out"
                  ? RELATION_KIND_LABELS[r.kind]
                  : `${RELATION_KIND_LABELS[r.kind]} (incoming)`}
              </span>
              <Link
                href={`/papers/${r.otherSlug}`}
                className="truncate hover:underline underline-offset-4"
              >
                {r.otherTitle}
              </Link>
              {r.direction === "out" ? (
                <button
                  type="button"
                  aria-label="Remove relation"
                  onClick={() => remove(r.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground italic">No linked papers yet.</p>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground">
            <Plus className="size-3" /> Link a paper
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-2 p-3">
          <Select value={kind} onValueChange={(v) => setKind(v as RelationKind)}>
            <SelectTrigger className="w-full" size="sm" aria-label="Relation kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {relationKindValues.map((k) => (
                <SelectItem key={k} value={k}>
                  {RELATION_KIND_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="w-full" size="sm" aria-label="Target paper">
              <SelectValue placeholder="Choose a paper…" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end">
            <Button size="sm" className="h-7" onClick={add} disabled={pending || !target}>
              {pending ? "Adding…" : "Add relation"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
