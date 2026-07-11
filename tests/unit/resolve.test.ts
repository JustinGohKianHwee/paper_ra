import { describe, expect, it } from "vitest";
import { parsePaperInput } from "@/lib/ai/resolve";

describe("parsePaperInput", () => {
  it("recognises arXiv URLs in abs/pdf/html forms", () => {
    expect(parsePaperInput("https://arxiv.org/abs/2505.04421")).toEqual({
      kind: "arxiv",
      arxivId: "2505.04421",
    });
    expect(parsePaperInput("https://arxiv.org/pdf/2505.04421v2.pdf")).toEqual({
      kind: "arxiv",
      arxivId: "2505.04421",
    });
    expect(parsePaperInput("https://www.arxiv.org/html/2402.17152")).toEqual({
      kind: "arxiv",
      arxivId: "2402.17152",
    });
  });

  it("recognises bare and prefixed arXiv ids", () => {
    expect(parsePaperInput("2505.04421")).toEqual({ kind: "arxiv", arxivId: "2505.04421" });
    expect(parsePaperInput("arXiv:2505.04421v3")).toEqual({
      kind: "arxiv",
      arxivId: "2505.04421",
    });
  });

  it("recognises DOIs bare, prefixed, and as URLs", () => {
    expect(parsePaperInput("10.1145/3580305.3599922")).toEqual({
      kind: "doi",
      doi: "10.1145/3580305.3599922",
    });
    expect(parsePaperInput("doi:10.48550/arXiv.2505.04421")).toEqual({
      kind: "doi",
      doi: "10.48550/arXiv.2505.04421",
    });
    expect(parsePaperInput("https://doi.org/10.1145/3580305")).toEqual({
      kind: "doi",
      doi: "10.1145/3580305",
    });
  });

  it("splits generic URLs into pdf and page URLs", () => {
    expect(parsePaperInput("https://example.com/papers/foo.pdf")).toEqual({
      kind: "pdf_url",
      url: "https://example.com/papers/foo.pdf",
    });
    expect(parsePaperInput("https://openreview.net/forum?id=abc")).toEqual({
      kind: "url",
      url: "https://openreview.net/forum?id=abc",
    });
  });

  it("falls back to title search", () => {
    expect(parsePaperInput("Attention Is All You Need")).toEqual({
      kind: "title",
      title: "Attention Is All You Need",
    });
  });
});
