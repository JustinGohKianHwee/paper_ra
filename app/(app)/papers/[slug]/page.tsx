import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { saveSection } from "@/actions/notes";
import { setPaperConcepts, setPaperTopics } from "@/actions/papers";
import { LinkPicker } from "@/components/papers/link-picker";
import { LogReadingButton } from "@/components/papers/log-reading-button";
import { PaperMetaDialog } from "@/components/papers/paper-meta-dialog";
import { RelationsEditor, type RelationDisplay } from "@/components/papers/relations-editor";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { SectionEditor } from "@/components/section-editor";
import {
  ExperimentStatusBadge,
  PriorityDots,
  ReadingStatusBadge,
  TopicBadge,
  VerificationBadge,
} from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VerificationCallout } from "@/components/verification-callout";
import type { PaperNoteRow, RelationKind } from "@/lib/supabase/database.types";
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

export default async function PaperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: paper } = await supabase.from("papers").select("*").eq("slug", slug).maybeSingle();
  if (!paper) notFound();

  const [
    notesRes,
    topicsRes,
    conceptsRes,
    paperTopicsRes,
    paperConceptsRes,
    relationsOutRes,
    relationsInRes,
    allPapersRes,
    experimentsRes,
    misconceptionsRes,
    sourcesRes,
  ] = await Promise.all([
    supabase.from("paper_notes").select("*").eq("paper_id", paper.id).order("position"),
    supabase.from("topics").select("id, name, slug").order("name"),
    supabase.from("concepts").select("id, name, slug").order("name"),
    supabase.from("paper_topics").select("topic_id").eq("paper_id", paper.id),
    supabase.from("paper_concepts").select("concept_id").eq("paper_id", paper.id),
    supabase
      .from("paper_relations")
      .select(
        "id, relation_kind, to_paper_id, papers!paper_relations_to_paper_id_fkey(title, slug)"
      )
      .eq("from_paper_id", paper.id),
    supabase
      .from("paper_relations")
      .select(
        "id, relation_kind, from_paper_id, papers!paper_relations_from_paper_id_fkey(title, slug)"
      )
      .eq("to_paper_id", paper.id),
    supabase.from("papers").select("id, title").neq("id", paper.id).order("title"),
    supabase
      .from("experiment_papers")
      .select("experiments(id, title, slug, status)")
      .eq("paper_id", paper.id),
    supabase
      .from("misconception_corrections")
      .select("id, initial_belief_md, corrected_on")
      .eq("paper_id", paper.id)
      .order("corrected_on", { ascending: false }),
    supabase.from("sources").select("*").eq("paper_id", paper.id).order("created_at"),
  ]);

  const notes = new Map<string, PaperNoteRow>(
    ((notesRes.data ?? []) as PaperNoteRow[]).map((n) => [n.section_type, n])
  );
  const selectedTopicIds = (paperTopicsRes.data ?? []).map((t) => t.topic_id);
  const selectedConceptIds = (paperConceptsRes.data ?? []).map((c) => c.concept_id);
  const topics = topicsRes.data ?? [];
  const concepts = conceptsRes.data ?? [];
  const linkedTopics = topics.filter((t) => selectedTopicIds.includes(t.id));
  const linkedConcepts = concepts.filter((c) => selectedConceptIds.includes(c.id));

  const relations: RelationDisplay[] = [
    ...(relationsOutRes.data ?? []).map((r) => {
      const other = r.papers as unknown as { title: string; slug: string } | null;
      return {
        id: r.id,
        kind: r.relation_kind as RelationKind,
        direction: "out" as const,
        otherTitle: other?.title ?? "Unknown paper",
        otherSlug: other?.slug ?? "",
      };
    }),
    ...(relationsInRes.data ?? []).map((r) => {
      const other = r.papers as unknown as { title: string; slug: string } | null;
      return {
        id: r.id,
        kind: r.relation_kind as RelationKind,
        direction: "in" as const,
        otherTitle: other?.title ?? "Unknown paper",
        otherSlug: other?.slug ?? "",
      };
    }),
  ];

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

  const setTopicsAction = setPaperTopics.bind(null, paper.id);
  const setConceptsAction = setPaperConcepts.bind(null, paper.id);

  return (
    <article className="space-y-6">
      {/* 1. Metadata */}
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
            <LogReadingButton paperId={paper.id} />
            <PaperMetaDialog paper={paper} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <ReadingStatusBadge status={paper.reading_status} />
          <VerificationBadge status={paper.verification_status} />
          <PriorityDots value={paper.priority} />
          {paper.tiktok_shop_relevance >= 4 ? (
            <Badge variant="secondary" className="font-normal">
              TikTok Shop relevance {paper.tiktok_shop_relevance}/5
            </Badge>
          ) : null}
          {paper.team_relevance >= 4 ? (
            <Badge variant="secondary" className="font-normal">
              Team relevance {paper.team_relevance}/5
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

        <div className="flex flex-wrap items-center gap-1.5">
          {linkedTopics.map((t) => (
            <TopicBadge key={t.id} name={t.name} slug={t.slug} />
          ))}
          <LinkPicker
            label="Topics"
            options={topics}
            selectedIds={selectedTopicIds}
            onSave={setTopicsAction}
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
            onSave={setConceptsAction}
          />
        </div>

        <VerificationCallout status={paper.verification_status} noteSource={paper.note_source} />
        <PrivacyReminder />
      </header>

      <Separator />

      {/* Structured sections (each independently editable, autosaving) */}
      <div className="space-y-6">
        {PAPER_SECTIONS.map((section) => {
          const note = notes.get(section.type);
          const boundSave = saveSection.bind(null, paper.id, section.type);
          return (
            <div key={section.type}>
              <SectionEditor
                heading={section.heading}
                hint={section.hint}
                headingId={`section-${section.type}`}
                initialValue={note?.body_md ?? section.scaffold ?? ""}
                lastEditedAt={note?.updated_at ?? null}
                saveAction={boundSave}
                collapsible
              />
              {section.type === "related_papers" ? (
                <div className="mt-3">
                  <RelationsEditor
                    paperId={paper.id}
                    relations={relations}
                    candidates={allPapersRes.data ?? []}
                  />
                </div>
              ) : null}
              {section.type === "experiment_proposal" && experiments.length > 0 ? (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Linked experiments</p>
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
                </div>
              ) : null}
              {section.type === "misconceptions" && (misconceptionsRes.data ?? []).length > 0 ? (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Linked misconception records
                  </p>
                  <ul className="space-y-1">
                    {(misconceptionsRes.data ?? []).map((m) => (
                      <li key={m.id} className="text-sm">
                        <Link
                          href={`/misconceptions#${m.id}`}
                          className="hover:underline underline-offset-4"
                        >
                          {m.initial_belief_md.replace(/[#*`>]/g, "").slice(0, 90)}
                          {m.initial_belief_md.length > 90 ? "…" : ""}
                        </Link>
                        <span className="ml-2 text-xs text-muted-foreground">{m.corrected_on}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {section.type === "sources_to_verify" && (sourcesRes.data ?? []).length > 0 ? (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Recorded sources</p>
                  <ul className="space-y-1.5">
                    {(sourcesRes.data ?? []).map((s) => (
                      <li key={s.id} className="text-sm">
                        <span className="font-medium">{s.source_name}</span>
                        {s.locator ? (
                          <span className="text-muted-foreground"> — {s.locator}</span>
                        ) : null}
                        {s.needs_verification ? (
                          <Badge
                            variant="outline"
                            className="ml-2 font-normal border-amber-600/40 text-amber-700 dark:text-amber-400"
                          >
                            needs verification
                          </Badge>
                        ) : null}
                        {s.quote_or_claim ? (
                          <p className="text-xs text-muted-foreground mt-0.5">{s.quote_or_claim}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}
