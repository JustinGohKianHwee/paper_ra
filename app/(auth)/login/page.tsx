import type { Metadata } from "next";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">
            A private research notebook. Sign in to continue.
          </p>
        </div>
        <LoginForm next={next} />
        <p className="text-xs text-muted-foreground text-center text-balance">
          For public papers and personal learning only — never store confidential work information
          here.
        </p>
      </div>
    </main>
  );
}
