import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  saveExperimentField,
  setExperimentConcepts,
  setExperimentPapers,
  type ExperimentField,
} from "@/actions/experiments";
import { ExperimentMetaDialog } from "@/components/experiments/experiment-meta-dialog";
import { LinkPicker } from "@/components/papers/link-picker";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { SectionEditor } from "@/components/section-editor";
import { ExperimentStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";

const EXPERIMENT_SECTIONS: { field: ExperimentField; heading: string; hint: string }[] = [
  {
    field: "research_question",
    heading: "Research question",
    hint: "What are you trying to find out?",
  },
  { field: "hypothesis", heading: "Hypothesis", hint: "What you expect and why." },
  { field: "baseline", heading: "Baseline", hint: "The comparison point." },
  { field: "treatment", heading: "Treatment", hint: "What changes relative to the baseline." },
  { field: "dataset", heading: "Dataset", hint: "Public datasets only." },
  { field: "parameters_md", heading: "Parameters", hint: "Hyperparameters, configs, seeds." },
  {
    field: "metrics_md",
    heading: "Metrics",
    hint: "What you measure and why. Markdown tables work well.",
  },
  { field: "results_md", heading: "Results", hint: "What actually happened. Tables + numbers." },
  {
    field: "segment_results_md",
    heading: "Segment results",
    hint: "Sparse users, cold items, session types — who wins, who regresses?",
  },
  {
    field: "latency_memory_md",
    heading: "Latency and memory",
    hint: "Throughput, p95, VRAM — the serving story.",
  },
  {
    field: "interpretation_md",
    heading: "Interpretation",
    hint: "What the results mean; alternative explanations.",
  },
  {
    field: "failure_cases_md",
    heading: "Failure cases",
    hint: "Concrete examples the treatment got wrong.",
  },
  {
    field: "next_experiment_md",
    heading: "Next experiment",
    hint: "What this result makes you want to try next.",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("experiments")
    .select("title")
    .eq("slug", slug)
    .maybeSingle();
  return { title: data?.title ?? "Experiment" };
}

export default async function ExperimentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: experiment } = await supabase
    .from("experiments")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!experiment) notFound();

  const [papersRes, conceptsRes, paperLinksRes, conceptLinksRes] = await Promise.all([
    supabase.from("papers").select("id, title, slug").order("title"),
    supabase.from("concepts").select("id, name, slug").order("name"),
    supabase.from("experiment_papers").select("paper_id").eq("experiment_id", experiment.id),
    supabase.from("experiment_concepts").select("concept_id").eq("experiment_id", experiment.id),
  ]);

  const papers = papersRes.data ?? [];
  const concepts = conceptsRes.data ?? [];
  const linkedPaperIds = (paperLinksRes.data ?? []).map((l) => l.paper_id);
  const linkedConceptIds = (conceptLinksRes.data ?? []).map((l) => l.concept_id);
  const linkedPapers = papers.filter((p) => linkedPaperIds.includes(p.id));
  const linkedConcepts = concepts.filter((c) => linkedConceptIds.includes(c.id));

  const metaLine = [experiment.repo_name, experiment.branch_ref, experiment.happened_on]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight leading-tight">
              {experiment.title}
            </h1>
            {metaLine ? <p className="text-sm text-muted-foreground">{metaLine}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ExperimentStatusBadge status={experiment.status} />
            <ExperimentMetaDialog experiment={experiment} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {linkedPapers.map((p) => (
            <Link key={p.id} href={`/papers/${p.slug}`}>
              <Badge variant="secondary" className="font-normal hover:bg-secondary/70">
                {p.title.length > 40 ? `${p.title.slice(0, 40)}…` : p.title}
              </Badge>
            </Link>
          ))}
          <LinkPicker
            label="Papers"
            options={papers.map((p) => ({ id: p.id, name: p.title }))}
            selectedIds={linkedPaperIds}
            onSave={setExperimentPapers.bind(null, experiment.id)}
          />
          <Separator orientation="vertical" className="h-4" />
          {linkedConcepts.map((c) => (
            <Link key={c.id} href={`/concepts/${c.slug}`}>
              <Badge variant="outline" className="font-normal hover:bg-accent">
                {c.name}
              </Badge>
            </Link>
          ))}
          <LinkPicker
            label="Concepts"
            options={concepts.map((c) => ({ id: c.id, name: c.name }))}
            selectedIds={linkedConceptIds}
            onSave={setExperimentConcepts.bind(null, experiment.id)}
          />
        </div>

        <PrivacyReminder />
      </header>

      <Separator />

      {experiment.metrics_json ? (
        <section className="space-y-1.5">
          <h2 className="text-sm font-semibold tracking-tight">Metrics (JSON)</h2>
          <pre className="overflow-x-auto rounded-md bg-neutral-900 px-3 py-2 text-[13px] text-neutral-100">
            {JSON.stringify(experiment.metrics_json, null, 2)}
          </pre>
        </section>
      ) : null}

      <div className="space-y-6">
        {EXPERIMENT_SECTIONS.map(({ field, heading, hint }) => (
          <SectionEditor
            key={field}
            heading={heading}
            hint={hint}
            initialValue={(experiment[field] as string | null) ?? ""}
            lastEditedAt={experiment.updated_at}
            saveAction={saveExperimentField.bind(null, experiment.id, field)}
            collapsible
          />
        ))}
      </div>
    </div>
  );
}
