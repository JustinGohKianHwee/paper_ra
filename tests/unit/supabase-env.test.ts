import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseEnv } from "@/lib/supabase/env";

describe("getSupabaseEnv normalisation", () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  afterEach(() => {
    if (url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    if (key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;
  });

  it("strips a trailing slash so the gateway path stays valid", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co/";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    expect(getSupabaseEnv()?.url).toBe("https://abc.supabase.co");
  });

  it("trims whitespace around pasted values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "  https://abc.supabase.co  ";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "  anon\n";
    const env = getSupabaseEnv();
    expect(env?.url).toBe("https://abc.supabase.co");
    expect(env?.anonKey).toBe("anon");
  });

  it("returns null when unconfigured", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(getSupabaseEnv()).toBeNull();
  });
});
