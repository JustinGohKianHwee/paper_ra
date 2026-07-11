import Link from "next/link";
import { MarkdownView } from "@/components/markdown-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MisconceptionRow } from "@/lib/supabase/database.types";

interface Props {
  record: MisconceptionRow;
  paper: { title: string; slug: string } | null;
  concept: { name: string; slug: string } | null;
}

export function MisconceptionCard({ record, paper, concept }: Props) {
  return (
    <Card id={record.id} className="scroll-mt-20 py-4">
      <CardContent className="space-y-3 px-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{record.corrected_on}</span>
          <Badge variant="outline" className="font-normal">
            confidence {record.confidence}/5
          </Badge>
          {record.can_explain_without_notes ? (
            <Badge
              variant="outline"
              className="font-normal border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
            >
              can explain without notes
            </Badge>
          ) : null}
          {paper ? (
            <Link
              href={`/papers/${paper.slug}`}
              className="hover:text-foreground underline underline-offset-4"
            >
              {paper.title}
            </Link>
          ) : null}
          {concept ? (
            <Link
              href={`/concepts/${concept.slug}`}
              className="hover:text-foreground underline underline-offset-4"
            >
              {concept.name}
            </Link>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border border-red-500/25 bg-red-500/5 px-3 py-2">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-red-700/80 dark:text-red-400/80">
              I initially thought
            </p>
            <MarkdownView markdown={record.initial_belief_md} />
          </div>
          <div className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-emerald-700/80 dark:text-emerald-400/80">
              Correction
            </p>
            <MarkdownView markdown={record.corrected_understanding_md} />
          </div>
        </div>

        {record.why_i_believed_md ? (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Why I believed it
            </p>
            <MarkdownView markdown={record.why_i_believed_md} />
          </div>
        ) : null}
        {record.evidence_md ? (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Evidence
            </p>
            <MarkdownView markdown={record.evidence_md} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
