import type { Metadata } from "next";
import { NewMisconceptionForm } from "@/app/(app)/misconceptions/new/new-misconception-form";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Record misconception" };

export default async function NewMisconceptionPage({
  searchParams,
}: {
  searchParams: Promise<{ paper?: string }>;
}) {
  const { paper: preselectedPaperId } = await searchParams;
  const supabase = await createClient();
  const [papersRes, conceptsRes] = await Promise.all([
    supabase.from("papers").select("id, title").order("title"),
    supabase.from("concepts").select("id, name").order("name"),
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Record a misconception</h1>
        <p className="text-sm text-muted-foreground">
          Be specific about the wrong belief — future-you needs to recognise the trap.
        </p>
      </div>
      <PrivacyReminder />
      <NewMisconceptionForm
        papers={papersRes.data ?? []}
        concepts={conceptsRes.data ?? []}
        preselectedPaperId={preselectedPaperId}
      />
    </div>
  );
}
