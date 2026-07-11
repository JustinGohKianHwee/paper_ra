import type { Metadata } from "next";
import { NewPaperForm } from "@/app/(app)/papers/new/new-paper-form";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add paper" };

export default async function NewPaperPage() {
  const supabase = await createClient();
  const { data: topics } = await supabase.from("topics").select("id, name").order("name");

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Add a paper</h1>
        <p className="text-sm text-muted-foreground">
          Creates the full structured reading template — every section is editable on the paper page
          afterwards.
        </p>
      </div>
      <PrivacyReminder />
      <NewPaperForm topics={topics ?? []} />
    </div>
  );
}
