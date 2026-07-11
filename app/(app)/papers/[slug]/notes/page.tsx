import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { saveSection } from "@/actions/notes";
import { RelationsEditor, type RelationDisplay } from "@/components/papers/relations-editor";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { SectionEditor } from "@/components/section-editor";
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
  return { title: data ? `Notes: ${data.title}` : "Structured notes" };
}

export default async function PaperNotesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: paper } = await supabase.from("papers").select("*").eq("slug", slug).maybeSingle();
  if (!paper) notFound();

  const [notesRes, relationsOutRes, relationsInRes, allPapersRes] = await Promise.all([
    supabase.from("paper_notes").select("*").eq("paper_id", paper.id).order("position"),
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
  ]);

  const notes = new Map<string, PaperNoteRow>(
    ((notesRes.data ?? []) as PaperNoteRow[]).map((n) => [n.section_type, n])
  );

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

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/papers/${paper.slug}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to paper
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
            {paper.title} — structured notes
          </h1>
          <Link
            href={`/papers/${paper.slug}/read`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            <BookOpen className="size-3.5" /> Reading mode
          </Link>
        </div>
        <VerificationCallout status={paper.verification_status} noteSource={paper.note_source} />
        <PrivacyReminder />
      </header>

      <Separator />

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
                authorship={note?.authorship ?? "human"}
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
            </div>
          );
        })}
      </div>
    </article>
  );
}
