import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, NotebookPen } from "lucide-react";
import { getActiveSession } from "@/actions/sessions";
import { ProcessingBanner } from "@/components/papers/processing-banner";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { ReadingWorkspace } from "@/components/reading/reading-workspace";
import { SessionBar } from "@/components/reading/session-bar";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("papers").select("title").eq("slug", slug).maybeSingle();
  return { title: data ? `Reading: ${data.title}` : "Reading" };
}

export default async function ReadingModePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: paper } = await supabase.from("papers").select("*").eq("slug", slug).maybeSingle();
  if (!paper) notFound();

  const [passagesRes, annotationsRes, activeSession] = await Promise.all([
    supabase.from("paper_passages").select("*").eq("paper_id", paper.id).order("position"),
    supabase.from("paper_annotations").select("*").eq("paper_id", paper.id).order("created_at"),
    getActiveSession(),
  ]);

  const annotations = annotationsRes.data ?? [];
  const openQuestions = annotations.filter((a) => a.kind === "question" && !a.resolved).length;

  const hasPdfSource = Boolean(
    paper.pdf_url || paper.arxiv_id || paper.source_input?.startsWith("storage:")
  );
  const pdfSrc = hasPdfSource ? `/api/papers/${paper.id}/pdf` : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/papers/${paper.slug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to paper
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
          {paper.title}
        </h1>
        <Link
          href={`/papers/${paper.slug}/notes`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          <NotebookPen className="size-3.5" /> Structured notes
        </Link>
      </div>

      <SessionBar
        paperId={paper.id}
        activeSession={activeSession}
        currentStatus={paper.reading_status}
        openQuestionCount={openQuestions}
      />

      <ProcessingBanner
        paperId={paper.id}
        initialStatus={paper.processing_status}
        initialError={paper.processing_error}
      />

      <PrivacyReminder />

      <ReadingWorkspace
        paperId={paper.id}
        pdfSrc={pdfSrc}
        passages={passagesRes.data ?? []}
        annotations={annotations}
      />
    </div>
  );
}
