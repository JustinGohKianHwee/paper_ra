import { describe, expect, it } from "vitest";
import { sanitizeExtractedPageText } from "@/lib/ai/text-sanitize";

describe("sanitizeExtractedPageText", () => {
  it("removes NUL characters that hosted Postgres rejects through JSON", () => {
    expect(sanitizeExtractedPageText("B\u0000E\u0000R\u0000T")).toBe("BERT");
  });

  it("preserves normal whitespace but replaces other control characters", () => {
    expect(sanitizeExtractedPageText("line 1\nline\t2\u0007end")).toBe("line 1\nline\t2 end");
  });
});
