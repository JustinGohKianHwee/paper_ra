import type { Metadata } from "next";
import { NewExperimentForm } from "@/app/(app)/experiments/new/new-experiment-form";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Record experiment" };

export default async function NewExperimentPage() {
  const supabase = await createClient();
  const [papersRes, conceptsRes] = await Promise.all([
    supabase.from("papers").select("id, title").order("title"),
    supabase.from("concepts").select("id, name").order("name"),
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Record an experiment</h1>
        <p className="text-sm text-muted-foreground">
          Personal repos and public datasets only. Detailed fields (results, segments, latency) are
          editable on the experiment page afterwards.
        </p>
      </div>
      <PrivacyReminder />
      <NewExperimentForm papers={papersRes.data ?? []} concepts={conceptsRes.data ?? []} />
    </div>
  );
}
