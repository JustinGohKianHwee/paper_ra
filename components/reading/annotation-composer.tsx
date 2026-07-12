"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createAnnotation } from "@/actions/annotations";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AnnotationKind } from "@/lib/supabase/database.types";

const KINDS: { value: AnnotationKind; label: string; placeholder: string }[] = [
  { value: "note", label: "Note", placeholder: "Your interpretation of this part…" },
  { value: "question", label: "Question", placeholder: "What do you still not understand?" },
  {
    value: "correction",
    label: "Correction",
    placeholder: "What did you (or the summary) get wrong?",
  },
  { value: "idea", label: "Idea", placeholder: "Experiment idea, connection, application…" },
];

/** Inline annotation input attached to a passage (or the whole paper). */
export function AnnotationComposer({
  paperId,
  passageId,
  compactLabel = "Add note",
}: {
  paperId: string;
  passageId: string | null;
  compactLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AnnotationKind>("note");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await createAnnotation({
        paper_id: paperId,
        passage_id: passageId,
        kind,
        body_md: body,
      });
      if (result.ok) {
        setBody("");
        setOpen(false);
        toast.success("Saved");
        router.refresh();
      } else {
        toast.error(result.error ?? "Save failed");
      }
    });
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-1.5 text-xs text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3" /> {compactLabel}
      </Button>
    );
  }

  const placeholder = KINDS.find((k) => k.value === kind)?.placeholder;

  return (
    <div className="space-y-1.5 rounded-md border px-2.5 py-2">
      <div className="flex items-center gap-2">
        <Select value={kind} onValueChange={(v) => setKind(v as AnnotationKind)}>
          <SelectTrigger className="h-7 w-32" size="sm" aria-label="Annotation type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[10.5px] text-muted-foreground">Markdown supported</span>
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus
        className="font-mono text-xs leading-snug"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            if (body.trim()) save();
          }
        }}
      />
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-7" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" className="h-7" onClick={save} disabled={pending || !body.trim()}>
          {pending ? "Saving…" : "Save (Ctrl+Enter)"}
        </Button>
      </div>
    </div>
  );
}
