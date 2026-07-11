import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { saveSynthesisBody } from "@/actions/synthesis";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { SectionEditor } from "@/components/section-editor";
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

export default async function SynthesisNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: note } = await supabase
    .from("synthesis_notes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!note) notFound();

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{note.title}</h1>
          <Badge variant="outline" className="font-normal">
            {note.kind}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Period starting {note.period_start}</p>
        <PrivacyReminder />
      </header>

      <SectionEditor
        heading="Synthesis"
        hint="Answer the template questions; delete the ones that do not apply."
        initialValue={note.body_md}
        lastEditedAt={note.updated_at}
        saveAction={saveSynthesisBody.bind(null, note.id)}
      />
    </div>
  );
}
