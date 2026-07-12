import { describe, expect, it } from "vitest";
import { normaliseMarkdownMath } from "@/lib/markdown/math";

describe("normaliseMarkdownMath", () => {
  it("converts LaTeX display and inline delimiters to remark-math delimiters", () => {
    expect(normaliseMarkdownMath(String.raw`\[x^2 + y^2\]`)).toBe("$$\nx^2 + y^2\n$$");
    expect(normaliseMarkdownMath(String.raw`Use \(x_i\) here.`)).toBe("Use $x_i$ here.");
  });

  it("wraps raw equation-section LaTeX as display math when requested", () => {
    expect(
      normaliseMarkdownMath(String.raw`\{ f,g \leftarrow \mathrm{Verifier}(r) \}`, {
        assumeDisplayMath: true,
      })
    ).toBe(String.raw`$$
\{ f,g \leftarrow \mathrm{Verifier}(r) \}
$$`);
  });

  it("does not wrap ordinary prose when display math is requested", () => {
    expect(normaliseMarkdownMath("This is explanatory prose.", { assumeDisplayMath: true })).toBe(
      "This is explanatory prose."
    );
  });
});
