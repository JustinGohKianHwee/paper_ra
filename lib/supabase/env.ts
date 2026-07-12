/**
 * Central place to read Supabase configuration so every entry point fails the
 * same, explicit way when the environment is not set up.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !rawKey) return null;
  // Normalise: strip surrounding whitespace and any trailing slash. supabase-js
  // builds `${url}/auth/v1/...`, so a trailing slash yields a `//` path that the
  // Supabase gateway rejects ("Invalid path specified in request URL"). This is
  // an easy env-var footgun (e.g. pasting the URL with a slash into Vercel).
  const url = rawUrl.trim().replace(/\/+$/, "");
  const anonKey = rawKey.trim();
  return { url, anonKey };
}

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "(run `npx supabase start` to get local values), then restart the dev server."
    );
  }
  return env;
}
