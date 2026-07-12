import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { saveConceptField, type ConceptField } from "@/actions/concepts";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { SectionEditor } from "@/components/section-editor";
import { ReadingStatusBadge } from "@/components/status-badges";
import { Separator } from "@/components/ui/separator";
import { KNOWLEDGE_OBJECTS } from "@/lib/knowledge-objects";
import { createClient } from "@/lib/supabase/server";
import type { ReadingStatus } from "@/lib/validation/enums";
import { cn } from "@/lib/utils";

const conceptStyle = KNOWLEDGE_OBJECTS.concept;
const ConceptIcon = conceptStyle.icon;

/**
 * Reference-entry structure: definition first, then mechanism, behaviour,
 * and personal notes — like a textbook glossary entry you keep improving.
 */
const REFERENCE_GROUPS: {
  label: string;
  fields: { field: ConceptField; heading: string; hint: string }[];
}[] = [
  {
    label: "Definition",
    fields: [
      {
        field: "plain_definition_md",
        heading: "Plain-language definition",
        hint: "Explain it to a colleague outside ML.",
      },
      {
        field: "technical_definition_md",
        heading: "Technical definition",
        hint: "The precise version, with the terms of art.",
      },
    ],
  },
  {
    label: "Mechanism",
    fields: [
      {
        field: "equation_md",
        heading: "Equation or pseudocode",
        hint: "KaTeX ($$ … $$) or a fenced code block.",
      },
      {
        field: "why_it_helps_md",
        heading: "Why it helps / applications",
        hint: "The property it exploits; when it beats the alternative.",
      },
    ],
  },
  {
    label: "Behaviour",
    fields: [
      {
        field: "failure_modes_md",
        heading: "Failure modes",
        hint: "Where it breaks, degrades, or gets misapplied.",
      },
    ],
  },
  {
    label: "My notes",
    fields: [
      {
        field: "my_implementations_md",
        heading: "My implementations",
        hint: "Personal repos/branches only — never internal code.",
      },
      {
        field: "misconceptions_md",
        heading: "Misconceptions I had",
        hint: "What you got wrong about it; also record big ones as Misconception entries.",
      },
    ],
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("concepts").select("name").eq("slug", slug).maybeSingle();
  return { title: data?.name ?? "Concept" };
}

export default async function ConceptPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: concept } = await supabase
    .from("concepts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!concept) notFound();

  const [paperLinks, misconceptions] = await Promise.all([
    supabase
      .from("paper_concepts")
      .select("papers(id, title, slug, reading_status, deleted_at)")
      .eq("concept_id", concept.id),
    supabase
      .from("misconception_corrections")
      .select("id, initial_belief_md, corrected_on")
      .eq("concept_id", concept.id)
      .order("corrected_on", { ascending: false }),
  ]);

  const papers = (paperLinks.data ?? [])
    .map(
      (l) =>
        l.papers as unknown as {
          id: string;
          title: string;
          slug: string;
          reading_status: ReadingStatus;
          deleted_at: string | null;
        } | null
    )
    .filter((p): p is NonNullable<typeof p> => p !== null && !p.deleted_at)
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-start gap-2.5">
          <ConceptIcon className={cn("mt-1 size-5 shrink-0", conceptStyle.textClass)} aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{concept.name}</h1>
            <p className="text-sm text-muted-foreground">
              Technical reference entry · used in {papers.length} paper
              {papers.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <PrivacyReminder />
      </header>

      <div className="space-y-6">
        {REFERENCE_GROUPS.map((group) => (
          <section key={group.label} className="space-y-4">
            <h2
              className={cn(
                "border-b pb-1 text-xs font-semibold uppercase tracking-wide",
                conceptStyle.textClass
              )}
            >
              {group.label}
            </h2>
            {group.fields.map(({ field, heading, hint }) => (
              <SectionEditor
                key={field}
                heading={heading}
                hint={hint}
                initialValue={(concept[field] as string | null) ?? ""}
                lastEditedAt={concept.updated_at}
                saveAction={saveConceptField.bind(null, concept.id, field)}
                collapsible
              />
            ))}
          </section>
        ))}
      </div>

      <Separator />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-tight">Papers using this concept</h2>
        {papers.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            None linked yet — link concepts from a paper page.
          </p>
        ) : (
          <ul className="divide-y">
            {papers.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <Link
                  href={`/papers/${p.slug}`}
                  className="min-w-0 truncate text-sm hover:underline underline-offset-4"
                >
                  {p.title}
                </Link>
                <span className="ml-auto shrink-0">
                  <ReadingStatusBadge status={p.reading_status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(misconceptions.data ?? []).length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Linked misconception records</h2>
          <ul className="space-y-1">
            {(misconceptions.data ?? []).map((m) => (
              <li key={m.id} className="text-sm">
                <Link
                  href={`/misconceptions#${m.id}`}
                  className="hover:underline underline-offset-4"
                >
                  {m.initial_belief_md.replace(/[#*`>]/g, "").slice(0, 110)}
                  {m.initial_belief_md.length > 110 ? "…" : ""}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground">{m.corrected_on}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
