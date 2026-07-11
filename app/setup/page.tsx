import type { Metadata } from "next";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Setup required" };

/**
 * Shown (via proxy redirect) whenever Supabase environment variables are
 * missing, so a misconfigured install fails with instructions, not a crash.
 */
export default function SetupPage() {
  if (getSupabaseEnv()) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">{APP_NAME} — setup required</h1>
        <p className="text-sm text-muted-foreground">
          Supabase is not configured, so the app cannot start. To fix this:
        </p>
        <ol className="list-decimal pl-5 text-sm space-y-2">
          <li>
            Copy{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">.env.example</code> to{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">.env.local</code>.
          </li>
          <li>
            Start the local stack with{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              npx supabase start
            </code>{" "}
            (requires Docker Desktop), or open your hosted Supabase project settings.
          </li>
          <li>
            Set{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            from the printed values.
          </li>
          <li>Restart the dev server.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Full instructions are in the README under “Local development”.
        </p>
      </div>
    </main>
  );
}
