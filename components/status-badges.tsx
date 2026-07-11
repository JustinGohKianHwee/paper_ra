import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  EXPERIMENT_STATUS_LABELS,
  READING_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  type ExperimentStatus,
  type ReadingStatus,
  type VerificationStatus,
} from "@/lib/validation/enums";
import { cn } from "@/lib/utils";

export function ReadingStatusBadge({ status }: { status: ReadingStatus }) {
  const emphasis: Partial<Record<ReadingStatus, string>> = {
    deep_read: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
    implemented: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
    revisit: "border-amber-600/40 text-amber-700 dark:text-amber-400",
  };
  return (
    <Badge variant="outline" className={cn("font-normal", emphasis[status])}>
      {READING_STATUS_LABELS[status]}
    </Badge>
  );
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const verified = status === "primary_claims_verified";
  const warned = status === "metadata_only" || status === "secondary_summary_only";
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal gap-1",
        verified && "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
        warned && "border-amber-600/40 text-amber-700 dark:text-amber-400"
      )}
    >
      {warned ? <AlertTriangle className="size-3" aria-hidden /> : null}
      {VERIFICATION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ExperimentStatusBadge({ status }: { status: ExperimentStatus }) {
  const emphasis: Partial<Record<ExperimentStatus, string>> = {
    running: "border-blue-600/40 text-blue-700 dark:text-blue-400",
    completed: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
    abandoned: "border-muted-foreground/40 text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("font-normal", emphasis[status])}>
      {EXPERIMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Priority 1–5 rendered as filled dots (5 = read first). */
export function PriorityDots({ value, label = "Priority" }: { value: number; label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={`${label}: ${value}/5`}
      aria-label={`${label} ${value} of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            i <= value ? "bg-foreground/70" : "bg-muted-foreground/25"
          )}
        />
      ))}
    </span>
  );
}

export function TopicBadge({ name, slug }: { name: string; slug: string }) {
  return (
    <Link href={`/topics/${slug}`}>
      <Badge variant="secondary" className="font-normal hover:bg-secondary/70">
        {name}
      </Badge>
    </Link>
  );
}
