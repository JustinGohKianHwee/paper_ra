"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { decideSuggestion } from "@/actions/suggestions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaperSuggestionRow } from "@/lib/supabase/database.types";

interface Payload {
  name?: string;
  value?: number;
  rationale?: string;
}

const KIND_LABELS: Record<string, string> = {
  topic: "Topic",
  concept: "Concept",
  priority: "Priority",
  relevance: "Relevance",
};

function describe(suggestion: PaperSuggestionRow): { label: string; rationale?: string } {
  const payload = (suggestion.payload ?? {}) as Payload;
  switch (suggestion.kind) {
    case "topic":
    case "concept":
      return { label: payload.name ?? "(unnamed)", rationale: payload.rationale };
    case "priority":
      return { label: `Priority ${payload.value}/5`, rationale: payload.rationale };
    case "relevance":
      return { label: `Relevance ${payload.value}/5`, rationale: payload.rationale };
    default:
      return { label: suggestion.kind };
  }
}

/**
 * Review queue for AI proposals. Nothing is applied until accepted; every
 * decision is stored on the suggestion row for auditing.
 */
export function SuggestionsPanel({ suggestions }: { suggestions: PaperSuggestionRow[] }) {
  // Derive from props (which update on router.refresh) minus locally-decided
  // ids — state initialised from props would go stale after refreshes.
  const [decidedIds, setDecidedIds] = useState<ReadonlySet<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const items = suggestions.filter((s) => !decidedIds.has(s.id));
  if (items.length === 0) return null;

  function decide(id: string, decision: "accepted" | "rejected") {
    setPendingId(id);
    startTransition(async () => {
      const result = await decideSuggestion(id, decision);
      setPendingId(null);
      if (result.ok) {
        setDecidedIds((prev) => new Set([...prev, id]));
        if (decision === "accepted") toast.success("Suggestion applied");
      } else {
        toast.error(result.error ?? "Failed to apply suggestion");
      }
    });
  }

  return (
    <Card className="border-violet-500/30 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
          AI suggestions to review
          <span className="text-xs font-normal text-muted-foreground">
            — nothing is applied until you accept it
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4">
        {items.map((s) => {
          const { label, rationale } = describe(s);
          return (
            <div key={s.id} className="flex items-start gap-2 text-sm">
              <Badge variant="outline" className="w-20 shrink-0 justify-center font-normal">
                {KIND_LABELS[s.kind] ?? s.kind}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{label}</p>
                {rationale ? (
                  <p className="text-xs text-muted-foreground leading-snug">{rationale}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  disabled={pendingId === s.id}
                  onClick={() => decide(s.id, "accepted")}
                  aria-label={`Accept ${label}`}
                >
                  <Check className="size-3.5" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-muted-foreground"
                  disabled={pendingId === s.id}
                  onClick={() => decide(s.id, "rejected")}
                  aria-label={`Reject ${label}`}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
