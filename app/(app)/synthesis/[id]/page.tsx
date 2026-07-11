import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { saveSynthesisBody } from "@/actions/synthesis";
import { AiBadge } from "@/components/ai-badge";
import { MarkdownView } from "@/components/markdown-view";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { SectionEditor } from "@/components/section-editor";
import { ApproveSynthesisButton } from "@/app/(app)/synthesis/[id]/approve-button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("synthesis_notes")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  return { title: data?.title ?? "Synthesis" };
}

export default async function SynthesisNotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const supabase = await createClient();

  const { data: note } = await supabase
    .from("synthesis_notes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!note) notFound();

  const isUnreviewedDraft = Boolean(note.ai_draft_md) && !note.approved_at;

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{note.title}</h1>
          <Badge variant="outline" className="font-normal">
            {note.kind}
          </Badge>
          {note.ai_draft_md ? <AiBadge authorship={note.approved_at ? "ai_edited" : "ai"} /> : null}
          {note.approved_at ? (
            <Badge
              variant="outline"
              className="font-normal border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
            >
              approved {new Date(note.approved_at).toLocaleDateString()}
            </Badge>
          ) : null}
          <span className="ml-auto">
            <ApproveSynthesisButton noteId={note.id} approved={Boolean(note.approved_at)} />
          </span>
        </div>
        <p className="text-sm text-muted-foreground">Period starting {note.period_start}</p>
        {notice ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            AI draft skipped: {notice} Starting from the blank template instead.
          </p>
        ) : null}
        {isUnreviewedDraft ? (
          <p className="rounded-md border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-sm text-violet-800 dark:text-violet-300">
            This synthesis was drafted by AI from your recorded activity. Review it, edit anything
            that doesn&apos;t sound like you, then approve.
          </p>
        ) : null}
        <PrivacyReminder />
      </header>

      <SectionEditor
        heading="Synthesis"
        hint="Answer the template questions; delete the ones that do not apply."
        initialValue={note.body_md}
        lastEditedAt={note.updated_at}
        saveAction={saveSynthesisBody.bind(null, note.id)}
        authorship={note.ai_draft_md && note.body_md === note.ai_draft_md ? "ai" : "human"}
      />

      {note.ai_draft_md && note.body_md !== note.ai_draft_md ? (
        <details className="rounded-md border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Original AI draft (kept for reference)
          </summary>
          <div className="mt-2">
            <MarkdownView markdown={note.ai_draft_md} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
