import type { Metadata } from "next";
import Link from "next/link";
import { SmartAddForm } from "@/app/(app)/papers/new/smart-add-form";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { aiEnabled } from "@/lib/ai/client";
import { AI_DISCLOSURE } from "@/lib/config";

export const metadata: Metadata = { title: "Add paper" };

export default function NewPaperPage() {
  const ai = aiEnabled();
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Add a paper</h1>
        <p className="text-sm text-muted-foreground">
          Paste an arXiv link, DOI, paper URL, or title — or upload a PDF. Metadata is resolved
          automatically{ai ? ", then the paper is processed into a guided reading breakdown" : ""}.
        </p>
      </div>

      <PrivacyReminder />
      {ai ? (
        <p className="text-[11px] text-muted-foreground">{AI_DISCLOSURE}</p>
      ) : (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          AI processing is not configured (OPENAI_API_KEY missing) — papers are added with resolved
          metadata only.
        </p>
      )}

      <SmartAddForm aiEnabled={ai} />

      <p className="text-xs text-muted-foreground">
        Prefer to type everything yourself?{" "}
        <Link href="/papers/new/manual" className="underline underline-offset-4">
          Add manually
        </Link>
        .
      </p>
    </div>
  );
}
