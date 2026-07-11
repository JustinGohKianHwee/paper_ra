"use client";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-6">
      <h2 className="text-base font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-prose">
        {error.message.includes("Supabase")
          ? error.message
          : "The page failed to load. Your data is safe — autosaved content is already in the database."}
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">Error reference: {error.digest}</p>
      ) : null}
      <Button size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
