import Link from "next/link";
import { AlertTriangle, FlaskConical, HelpCircle } from "lucide-react";
import {
  PriorityDots,
  ReadingStatusBadge,
  TopicBadge,
  VerificationBadge,
} from "@/components/status-badges";
import { READING_STATUS_LABELS } from "@/lib/validation/enums";
import type { PaperLibraryItem } from "@/lib/papers/filters";

function PaperMetaLine({ paper }: { paper: PaperLibraryItem }) {
  const parts = [
    paper.organisation,
    paper.year?.toString(),
    paper.venue,
    paper.arxiv_id ? `arXiv:${paper.arxiv_id}` : null,
  ].filter(Boolean);
  return <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>;
}

export function PaperListDetailed({ papers }: { papers: PaperLibraryItem[] }) {
  return (
    <ul className="divide-y">
      {papers.map((p) => (
        <li key={p.id} className="py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href={`/papers/${p.slug}`}
                className="font-medium leading-snug hover:underline underline-offset-4"
              >
                {p.title}
              </Link>
              {p.subtitle ? (
                <p className="text-sm text-muted-foreground leading-snug">{p.subtitle}</p>
              ) : null}
              <div className="mt-1">
                <PaperMetaLine paper={p} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <ReadingStatusBadge status={p.reading_status} />
                <VerificationBadge status={p.verification_status} />
                {p.topics.map((t) => (
                  <TopicBadge key={t.slug} name={t.name} slug={t.slug} />
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
              <PriorityDots value={p.priority} />
              <div className="flex items-center gap-2 text-muted-foreground">
                {p.has_open_questions ? (
                  <span title="Has open questions">
                    <HelpCircle className="size-3.5" aria-label="Has open questions" />
                  </span>
                ) : null}
                {p.experiment_count > 0 ? (
                  <span
                    className="flex items-center gap-0.5 text-xs"
                    title={`${p.experiment_count} experiment(s)`}
                  >
                    <FlaskConical className="size-3.5" aria-hidden />
                    {p.experiment_count}
                  </span>
                ) : null}
                {p.needs_revisit ? (
                  <span title="Needs revisit">
                    <AlertTriangle
                      className="size-3.5 text-amber-600 dark:text-amber-400"
                      aria-label="Needs revisit"
                    />
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PaperListCompact({ papers }: { papers: PaperLibraryItem[] }) {
  return (
    <ul className="divide-y">
      {papers.map((p) => (
        <li key={p.id} className="flex items-center gap-3 py-1.5">
          <PriorityDots value={p.priority} />
          <Link
            href={`/papers/${p.slug}`}
            className="min-w-0 truncate text-sm hover:underline underline-offset-4"
          >
            {p.title}
          </Link>
          <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            {p.year ?? ""}
            <span className="hidden sm:inline">{READING_STATUS_LABELS[p.reading_status]}</span>
            {p.verification_status === "secondary_summary_only" ||
            p.verification_status === "metadata_only" ? (
              <AlertTriangle
                className="size-3 text-amber-600 dark:text-amber-400"
                aria-label="Not verified against primary source"
              />
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
