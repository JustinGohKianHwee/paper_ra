import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ExplainedBadge } from "@/components/explained-badge";
import { KNOWLEDGE_OBJECTS } from "@/lib/knowledge-objects";
import {
  READING_STATUS_INFO,
  VERIFICATION_STATUS_INFO,
  experimentStatusLabel,
} from "@/lib/statuses";
import type { ExperimentStatus, ReadingStatus, VerificationStatus } from "@/lib/validation/enums";
import { cn } from "@/lib/utils";

export function ReadingStatusBadge({ status }: { status: ReadingStatus }) {
  const emphasis: Partial<Record<ReadingStatus, string>> = {
    deep_read: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
    implemented: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
    revisit: "border-amber-600/40 text-amber-700 dark:text-amber-400",
  };
  const info = READING_STATUS_INFO[status];
  return (
    <ExplainedBadge
      label={info.label}
      description={info.description}
      className={emphasis[status]}
    />
  );
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const verified = status === "primary_claims_verified";
  const warned = status === "metadata_only" || status === "secondary_summary_only";
  const info = VERIFICATION_STATUS_INFO[status];
  return (
    <ExplainedBadge
      label={info.label}
      description={info.description}
      className={cn(
        verified && "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
        warned && "border-amber-600/40 text-amber-700 dark:text-amber-400"
      )}
      warnIcon={warned}
    />
  );
}

/** Dormant feature — badge kept for existing experiment records. */
export function ExperimentStatusBadge({ status }: { status: ExperimentStatus }) {
  const emphasis: Partial<Record<ExperimentStatus, string>> = {
    running: "border-blue-600/40 text-blue-700 dark:text-blue-400",
    completed: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
    abandoned: "border-muted-foreground/40 text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("font-normal", emphasis[status])}>
      {experimentStatusLabel(status)}
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
  const style = KNOWLEDGE_OBJECTS.topic;
  const Icon = style.icon;
  return (
    <Link href={`/topics/${slug}`}>
      <Badge
        variant="outline"
        className={cn("gap-1 font-normal hover:bg-blue-500/10", style.badgeClass)}
      >
        <Icon className="size-3" aria-hidden />
        {name}
      </Badge>
    </Link>
  );
}

export function ConceptBadge({ name, slug }: { name: string; slug: string }) {
  const style = KNOWLEDGE_OBJECTS.concept;
  const Icon = style.icon;
  return (
    <Link href={`/concepts/${slug}`}>
      <Badge
        variant="outline"
        className={cn("gap-1 font-normal hover:bg-teal-500/10", style.badgeClass)}
      >
        <Icon className="size-3" aria-hidden />
        {name}
      </Badge>
    </Link>
  );
}

/** Small labelled badge for an annotation/knowledge-object kind. */
export function KindBadge({
  kind,
  className,
}: {
  kind: keyof typeof KNOWLEDGE_OBJECTS;
  className?: string;
}) {
  const style = KNOWLEDGE_OBJECTS[kind];
  const Icon = style.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-normal", style.badgeClass, className)}>
      <Icon className="size-3" aria-hidden />
      {style.label}
    </Badge>
  );
}
