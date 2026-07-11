import type { Metadata } from "next";
import { NewPaperForm } from "@/app/(app)/papers/new/manual/new-paper-form";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add paper manually" };

export default async function ManualNewPaperPage() {
  const supabase = await createClient();
  const { data: topics } = await supabase.from("topics").select("id, name").order("name");

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Add a paper manually</h1>
        <p className="text-sm text-muted-foreground">
          Creates the full structured reading template — every section is editable afterwards.
        </p>
      </div>
      <PrivacyReminder />
      <NewPaperForm topics={topics ?? []} />
    </div>
  );
}
