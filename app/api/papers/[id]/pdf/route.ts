import { NextResponse, type NextRequest } from "next/server";
import { safeFetch } from "@/lib/ai/safe-fetch";
import { createClient } from "@/lib/supabase/server";

/**
 * Same-origin PDF proxy for the split-screen reader. External hosts often
 * forbid framing; serving through our origin lets the browser's PDF viewer
 * render inline. Outbound fetches go through safeFetch (SSRF-guarded).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: paper } = await supabase
    .from("papers")
    .select("pdf_url, arxiv_id, source_input")
    .eq("id", id)
    .maybeSingle();
  if (!paper) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    // Uploaded attachment
    if (paper.source_input?.startsWith("storage:")) {
      const path = paper.source_input.slice("storage:".length);
      const { data, error } = await supabase.storage.from("paper-attachments").download(path);
      if (error || !data) throw new Error(error?.message ?? "Attachment not found");
      return new NextResponse(data, {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": "inline",
          "cache-control": "private, max-age=3600",
        },
      });
    }

    const url =
      paper.pdf_url ?? (paper.arxiv_id ? `https://arxiv.org/pdf/${paper.arxiv_id}` : null);
    if (!url) return NextResponse.json({ error: "No PDF source" }, { status: 404 });

    const upstream = await safeFetch(url, {
      accept: "application/pdf",
      allowedContentTypes: ["application/pdf", "application/octet-stream", "binary/octet-stream"],
    });
    return new NextResponse(upstream.body, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": "inline",
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
