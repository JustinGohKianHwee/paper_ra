"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, Clock, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { decideCandidate } from "@/actions/radar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KNOWLEDGE_OBJECTS } from "@/lib/knowledge-objects";
import type { RadarCandidateRow } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

interface RelatedJson {
  topics?: string[];
  concepts?: string[];
  papers?: { title: string; slug: string }[];
  matched_terms?: string[];
}

/**
 * One recommendation. The card must make "why is this here" answerable at a
 * glance: score, explanation, and the topics/concepts/papers it connects to.
 * Accepting creates an honest metadata-only paper in the reading queue.
 */
export function CandidateCard({ candidate }: { candidate: RadarCandidateRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const related = (candidate.related_json ?? {}) as RelatedJson;

  function decide(decision: "accepted" | "dismissed" | "deferred") {
    startTransition(async () => {
      const result = await decideCandidate({ id: candidate.id, decision });
      if (result.ok) {
        if (decision === "accepted" && result.paperSlug) {
          toast.success("Added to your library and reading queue", {
            action: {
              label: "Open paper",
              onClick: () => router.push(`/papers/${result.paperSlug}`),
            },
          });
        }
        router.refresh();
      } else {
        toast.error(result.error ?? "Action failed");
      }
    });
  }

  const meta = [
    candidate.authors.slice(0, 3).join(", ") + (candidate.authors.length > 3 ? " et al." : ""),
    candidate.published_on,
    candidate.provider,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="rounded-lg border bg-card px-4 py-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className="text-sm font-medium leading-snug">{candidate.title}</h3>
          <p className="text-xs text-muted-foreground">{meta}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {candidate.query_context ? (
            <Badge variant="outline" className="font-normal text-[10px]">
              topic search
            </Badge>
          ) : null}
          <Badge
            variant="outline"
            className="font-normal tabular-nums"
            title="Deterministic relevance score against your library (0–100)"
          >
            {Math.round(Number(candidate.score ?? 0))}
          </Badge>
        </div>
      </div>

      {candidate.why_it_matters ? (
        <p className="mt-1.5 text-sm text-muted-foreground">{candidate.why_it_matters}</p>
      ) : null}

      {related.topics?.length || related.concepts?.length || related.papers?.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {(related.topics ?? []).map((t) => (
            <Badge
              key={t}
              variant="outline"
              className={cn("gap-1 font-normal text-[10px]", KNOWLEDGE_OBJECTS.topic.badgeClass)}
            >
              {t}
            </Badge>
          ))}
          {(related.concepts ?? []).map((c) => (
            <Badge
              key={c}
              variant="outline"
              className={cn("gap-1 font-normal text-[10px]", KNOWLEDGE_OBJECTS.concept.badgeClass)}
            >
              {c}
            </Badge>
          ))}
          {(related.papers ?? []).map((p) => (
            <Link
              key={p.slug}
              href={`/papers/${p.slug}`}
              className="text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              relates to: {p.title.slice(0, 60)}
              {p.title.length > 60 ? "…" : ""}
            </Link>
          ))}
        </div>
      ) : null}

      {candidate.abstract ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Abstract
          </summary>
          <p className="mt-1 text-sm text-muted-foreground">{candidate.abstract}</p>
        </details>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Button size="sm" className="h-7" onClick={() => decide("accepted")} disabled={pending}>
          <Check className="size-3.5" /> Accept into library
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          onClick={() => decide("deferred")}
          disabled={pending}
        >
          <Clock className="size-3.5" /> Later
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-muted-foreground"
          onClick={() => decide("dismissed")}
          disabled={pending}
        >
          <X className="size-3.5" /> Dismiss
        </Button>
        {candidate.url ? (
          <a
            href={candidate.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            View source <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
