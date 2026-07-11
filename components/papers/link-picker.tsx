"use client";

import { useState, useTransition } from "react";
import { ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Option {
  id: string;
  name: string;
}

interface Props {
  label: string;
  options: Option[];
  selectedIds: string[];
  onSave: (ids: string[]) => Promise<{ ok: boolean; error?: string }>;
}

/** Multi-select for linking a paper to topics or concepts. */
export function LinkPicker({ label, options, selectedIds, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set(selectedIds));
  const [pending, startTransition] = useTransition();

  function toggle(id: string, checked: boolean) {
    const next = new Set(selection);
    if (checked) next.add(id);
    else next.delete(id);
    setSelection(next);
  }

  function save() {
    startTransition(async () => {
      const result = await onSave([...selection]);
      if (result.ok) {
        toast.success(`${label} updated`);
        setOpen(false);
      } else {
        toast.error(result.error ?? "Update failed");
      }
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setSelection(new Set(selectedIds));
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground">
          {label} <ChevronsUpDown className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {options.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing to link yet.</p>
          ) : (
            options.map((o) => (
              <Label key={o.id} className="flex items-center gap-2 py-0.5 font-normal text-sm">
                <Checkbox
                  checked={selection.has(o.id)}
                  onCheckedChange={(v) => toggle(o.id, v === true)}
                />
                {o.name}
              </Label>
            ))
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge variant="secondary" className="font-normal">
            {selection.size} selected
          </Badge>
          <Button size="sm" className="h-7" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
