import type { Metadata } from "next";
import { NewSynthesisForm } from "@/app/(app)/synthesis/new/new-synthesis-form";
import { PrivacyReminder } from "@/components/privacy-reminder";

export const metadata: Metadata = { title: "New synthesis note" };

export default function NewSynthesisPage() {
  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">New synthesis note</h1>
        <p className="text-sm text-muted-foreground">
          The note is created from the synthesis template — edit it on the next screen.
        </p>
      </div>
      <PrivacyReminder />
      <NewSynthesisForm />
    </div>
  );
}
