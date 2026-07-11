import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
      <h1 className="text-lg font-semibold tracking-tight">Not found</h1>
      <p className="text-sm text-muted-foreground">
        That page or record does not exist (or is not yours).
      </p>
      <Link href="/dashboard" className="text-sm underline underline-offset-4">
        Back to dashboard
      </Link>
    </main>
  );
}
