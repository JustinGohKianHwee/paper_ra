import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ExternalLink, NotebookPen } from "lucide-react";
import { setPaperConcepts, setPaperTopics } from "@/actions/papers";
import { AiBadge } from "@/components/ai-badge";
import { MarkdownView } from "@/components/markdown-view";
import { LinkPicker } from "@/components/papers/link-picker";
import { PaperMetaDialog } from "@/components/papers/paper-meta-dialog";
import { ProcessingBanner } from "@/components/papers/processing-banner";
import { SuggestionsPanel } from "@/components/papers/suggestions-panel";
import { ANNOTATION_KIND_LABELS } from "@/components/reading/annotation-item";
import {
  ExperimentStatusBadge,
  PriorityDots,
  ReadingStatusBadge,
  TopicBadge,
  VerificationBadge,
} from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { VerificationCallout } from "@/components/verification-callout";
import { hasRealContent } from "@/lib/papers/queries";
import type { PaperNoteRow } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { PAPER_SECTIONS } from "@/lib/templates/paper";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("papers").select("title").eq("slug", slug).maybeSingle();
  return { title: data?.title ?? "Paper" };
}

export default async function PaperViewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: paper } = await supabase.from("papers").select("*").eq("slug", slug).maybeSingle();
  if (!paper) notFound();

  const [
    notesRes,
    passagesRes,
    annotationsRes,
    suggestionsRes,
    topicsRes,
    conceptsRes,
    paperTopicsRes,
    paperConceptsRes,
    relationsOutRes,
    relationsInRes,
    experimentsRes,
    misconceptionsRes,
    sourcesRes,
  ] = await Promise.all([
    supabase.from("paper_notes").select("*").eq("paper_id", paper.id).order("position"),
    supabase.from("paper_passages").select("*").eq("paper_id", paper.id).order("position"),
    supabase.from("paper_annotations").select("*").eq("paper_id", paper.id).order("created_at"),
    supabase
      .from("paper_suggestions")
      .select("*")
      .eq("paper_id", paper.id)
      .eq("status", "proposed")
      .order("created_at"),
    supabase.from("topics").select("id, name, slug").order("name"),
    supabase.from("concepts").select("id, name, slug").order("name"),
    supabase.from("paper_topics").select("topic_id").eq("paper_id", paper.id),
    supabase.from("paper_concepts").select("concept_id").eq("paper_id", paper.id),
    supabase
      .from("paper_relations")
      .select("id, relation_kind, papers!paper_relations_to_paper_id_fkey(title, slug)")
      .eq("from_paper_id", paper.id),
    supabase
      .from("paper_relations")
      .select("id, relation_kind, papers!paper_relations_from_paper_id_fkey(title, slug)")
      .eq("to_paper_id", paper.id),
    supabase
      .from("experiment_papers")
      .select("experiments(id, title, slug, status)")
      .eq("paper_id", paper.id),
    supabase
      .from("misconception_corrections")
      .select("id, initial_belief_md, corrected_understanding_md, corrected_on")
      .eq("paper_id", paper.id)
      .order("corrected_on", { ascending: false }),
    supabase.from("sources").select("*").eq("paper_id", paper.id).order("created_at"),
  ]);

  const notes = ((notesRes.data ?? []) as PaperNoteRow[]).filter((n) => hasRealContent(n.body_md));
  const notesByType = new Map(notes.map((n) => [n.section_type as string, n]));
  const passages = passagesRes.data ?? [];
  const annotations = annotationsRes.data ?? [];
  const annotationsByPassage = new Map<string | null, typeof annotations>();
  for (const a of annotations) {
    const key = a.passage_id ?? null;
    annotationsByPassage.set(key, [...(annotationsByPassage.get(key) ?? []), a]);
  }

  const selectedTopicIds = (paperTopicsRes.data ?? []).map((t) => t.topic_id);
  const selectedConceptIds = (paperConceptsRes.data ?? []).map((c) => c.concept_id);
  const topics = topicsRes.data ?? [];
  const concepts = conceptsRes.data ?? [];
  const linkedTopics = topics.filter((t) => selectedTopicIds.includes(t.id));
  const linkedConcepts = concepts.filter((c) => selectedConceptIds.includes(c.id));

  const experiments = (experimentsRes.data ?? [])
    .map(
      (e) =>
        e.experiments as unknown as {
          id: string;
          title: string;
          slug: string;
          status: string;
        } | null
    )
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const metaLine = [
    paper.organisation,
    paper.year?.toString(),
    paper.venue,
    paper.authors.length > 0
      ? paper.authors.slice(0, 4).join(", ") + (paper.authors.length > 4 ? " et al." : "")
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const summaryNote = notesByType.get("summary");
  const renderedSections = PAPER_SECTIONS.filter(
    (s) => s.type !== "summary" && notesByType.has(s.type)
  );

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight leading-tight">{paper.title}</h1>
            {paper.subtitle ? <p className="text-muted-foreground">{paper.subtitle}</p> : null}
            <p className="text-sm text-muted-foreground">{metaLine}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              {paper.arxiv_id ? (
                <a
                  href={paper.canonical_url ?? `https://arxiv.org/abs/${paper.arxiv_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground underline underline-offset-4"
                >
                  arXiv:{paper.arxiv_id} <ExternalLink className="size-3" />
                </a>
              ) : paper.canonical_url ? (
                <a
                  href={paper.canonical_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground underline underline-offset-4"
                >
                  Source <ExternalLink className="size-3" />
                </a>
              ) : null}
              {paper.doi ? <span>DOI: {paper.doi}</span> : null}
              {paper.note_source ? <span>Notes from: {paper.note_source}</span> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild size="sm">
              <Link href={`/papers/${paper.slug}/read`}>
                <BookOpen className="size-4" /> Read
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/papers/${paper.slug}/notes`}>
                <NotebookPen className="size-4" /> Structured notes
              </Link>
            </Button>
            <PaperMetaDialog paper={paper} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <ReadingStatusBadge status={paper.reading_status} />
          <VerificationBadge status={paper.verification_status} />
          <PriorityDots value={paper.priority} />
          {paper.relevance > 0 ? (
            <Badge variant="secondary" className="font-normal">
              Relevance {paper.relevance}/5
            </Badge>
          ) : null}
          {paper.needs_revisit ? (
            <Badge
              variant="outline"
              className="font-normal border-amber-600/40 text-amber-700 dark:text-amber-400"
            >
              Needs revisit
            </Badge>
          ) : null}
        </div>

        {paper.relevance_note ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Why it matters to me: </span>
            {paper.relevance_note}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          {linkedTopics.map((t) => (
            <TopicBadge key={t.id} name={t.name} slug={t.slug} />
          ))}
          <LinkPicker
            label="Topics"
            options={topics}
            selectedIds={selectedTopicIds}
            onSave={setPaperTopics.bind(null, paper.id)}
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
            options={concepts}
            selectedIds={selectedConceptIds}
            onSave={setPaperConcepts.bind(null, paper.id)}
          />
        </div>

        <ProcessingBanner
          paperId={paper.id}
          initialStatus={paper.processing_status}
          initialError={paper.processing_error}
        />
        <SuggestionsPanel suggestions={suggestionsRes.data ?? []} />
        <VerificationCallout status={paper.verification_status} noteSource={paper.note_source} />
      </header>

      <Separator />

      {/* Summary */}
      {summaryNote ? (
        <section className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Summary</h2>
            <AiBadge authorship={summaryNote.authorship} />
          </div>
          <MarkdownView markdown={summaryNote.body_md} />
        </section>
      ) : null}

      {/* Paper breakdown with annotations */}
      {passages.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">Paper breakdown</h2>
          <div className="space-y-3">
            {passages.map((p) => {
              const passageAnnotations = annotationsByPassage.get(p.id) ?? [];
              return (
                <div key={p.id} className="rounded-lg border px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-sm font-medium">{p.title}</h3>
                    <span className="text-[11px] text-muted-foreground">
                      {p.anchor}
                      {p.page_start
                        ? ` · pp. ${p.page_start}${p.page_end && p.page_end !== p.page_start ? `–${p.page_end}` : ""}`
                        : ""}
                    </span>
                    <AiBadge className="ml-auto" />
                  </div>
                  <div className="mt-1">
                    <MarkdownView markdown={p.ai_summary_md} />
                  </div>
                  {passageAnnotations.length > 0 ? (
                    <div className="mt-2 space-y-2 border-t pt-2">
                      {passageAnnotations.map((a) => (
                        <div key={a.id} className="text-sm">
                          <span className="mr-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {ANNOTATION_KIND_LABELS[a.kind] ?? a.kind}
                            {a.kind === "question" && !a.resolved ? " · open" : ""}
                          </span>
                          <MarkdownView markdown={a.body_md} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Whole-paper annotations */}
      {(annotationsByPassage.get(null) ?? []).length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Reading notes (whole paper)</h2>
          <div className="space-y-2">
            {(annotationsByPassage.get(null) ?? []).map((a) => (
              <div key={a.id} className="rounded-md border px-3 py-2 text-sm">
                <span className="mr-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {ANNOTATION_KIND_LABELS[a.kind] ?? a.kind}
                </span>
                <MarkdownView markdown={a.body_md} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Structured notes, rendered */}
      {renderedSections.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-tight">Structured notes</h2>
          {renderedSections.map((section) => {
            const note = notesByType.get(section.type)!;
            return (
              <div key={section.type} className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-[13px] font-medium text-muted-foreground">
                    {section.heading}
                  </h3>
                  <AiBadge authorship={note.authorship} />
                </div>
                <MarkdownView markdown={note.body_md} />
              </div>
            );
          })}
        </section>
      ) : passages.length === 0 ? (
        <div className="rounded-md border border-dashed px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing recorded yet.{" "}
            <Link href={`/papers/${paper.slug}/read`} className="underline underline-offset-4">
              Open reading mode
            </Link>{" "}
            to study this paper.
          </p>
        </div>
      ) : null}

      {/* Misconceptions */}
      {(misconceptionsRes.data ?? []).length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Misconceptions corrected here</h2>
          <ul className="space-y-1.5">
            {(misconceptionsRes.data ?? []).map((m) => (
              <li key={m.id} className="text-sm">
                <Link
                  href={`/misconceptions#${m.id}`}
                  className="hover:underline underline-offset-4"
                >
                  {m.initial_belief_md.replace(/[#*`>]/g, "").slice(0, 100)}
                  {m.initial_belief_md.length > 100 ? "…" : ""}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground">{m.corrected_on}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Experiments */}
      {experiments.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Experiments</h2>
          <ul className="space-y-1">
            {experiments.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-sm">
                <Link
                  href={`/experiments/${e.slug}`}
                  className="hover:underline underline-offset-4"
                >
                  {e.title}
                </Link>
                <ExperimentStatusBadge
                  status={e.status as Parameters<typeof ExperimentStatusBadge>[0]["status"]}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Related papers */}
      {(relationsOutRes.data ?? []).length + (relationsInRes.data ?? []).length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Related papers</h2>
          <ul className="space-y-1 text-sm">
            {(relationsOutRes.data ?? []).map((r) => {
              const other = r.papers as unknown as { title: string; slug: string } | null;
              return other ? (
                <li key={r.id}>
                  <span className="mr-2 text-xs text-muted-foreground">
                    {r.relation_kind.replace(/_/g, " ")}
                  </span>
                  <Link
                    href={`/papers/${other.slug}`}
                    className="hover:underline underline-offset-4"
                  >
                    {other.title}
                  </Link>
                </li>
              ) : null;
            })}
            {(relationsInRes.data ?? []).map((r) => {
              const other = r.papers as unknown as { title: string; slug: string } | null;
              return other ? (
                <li key={r.id}>
                  <span className="mr-2 text-xs text-muted-foreground">
                    {r.relation_kind.replace(/_/g, " ")} (incoming)
                  </span>
                  <Link
                    href={`/papers/${other.slug}`}
                    className="hover:underline underline-offset-4"
                  >
                    {other.title}
                  </Link>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      ) : null}

      {/* Sources */}
      {(sourcesRes.data ?? []).length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Sources and citations</h2>
          <ul className="space-y-1.5">
            {(sourcesRes.data ?? []).map((s) => (
              <li key={s.id} className="text-sm">
                <span className="font-medium">{s.source_name}</span>
                {s.locator ? <span className="text-muted-foreground"> — {s.locator}</span> : null}
                {s.needs_verification ? (
                  <Badge
                    variant="outline"
                    className="ml-2 font-normal border-amber-600/40 text-amber-700 dark:text-amber-400"
                  >
                    needs verification
                  </Badge>
                ) : null}
                {s.quote_or_claim ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.quote_or_claim}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
