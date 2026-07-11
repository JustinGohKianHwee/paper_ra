import { NextResponse, type NextRequest } from "next/server";
import { aiEnabled } from "@/lib/ai/client";
import { RateLimitError, runPaperPipeline } from "@/lib/ai/pipeline";
import { createClient } from "@/lib/supabase/server";

// The pipeline makes several LLM calls for long papers.
export const maxDuration = 300;

/** Kick off (or resume) AI processing for a paper. RLS scopes everything. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!aiEnabled()) {
    return NextResponse.json(
      { error: "AI processing is not configured (OPENAI_API_KEY missing)." },
      { status: 503 }
    );
  }

  try {
    const result = await runPaperPipeline(supabase, user.id, id);
    return NextResponse.json(result, { status: result.status === "failed" ? 502 : 200 });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    const message = error instanceof Error ? error.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Lightweight status poll for the processing banner. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: paper } = await supabase
    .from("papers")
    .select("processing_status, processing_error, processed_at")
    .eq("id", id)
    .maybeSingle();
  if (!paper) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(paper);
}
