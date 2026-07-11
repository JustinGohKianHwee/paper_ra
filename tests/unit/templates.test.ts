import { describe, expect, it } from "vitest";
import {
  PAPER_SECTIONS,
  newPaperSectionRows,
  sectionHeading,
  sectionPosition,
} from "@/lib/templates/paper";
import {
  defaultSynthesisTitle,
  periodStartFor,
  synthesisTemplate,
} from "@/lib/templates/synthesis";

describe("paper template", () => {
  it("contains every required template section exactly once, in order", () => {
    const types = PAPER_SECTIONS.map((s) => s.type);
    expect(new Set(types).size).toBe(types.length);
    // Spot-check the required sections from the product spec.
    for (const required of [
      "thesis",
      "problem",
      "insufficiency",
      "architecture",
      "mechanism",
      "equations",
      "intuition",
      "why_it_works",
      "training_setup",
      "evaluation",
      "results",
      "production_evidence",
      "serving",
      "failure_modes",
      "segment_risks",
      "relevance_to_me",
      "implementation_mapping",
      "experiment_proposal",
      "misconceptions",
      "open_questions",
      "related_papers",
      "boss_explanation",
      "sources_to_verify",
    ]) {
      expect(types).toContain(required);
    }
    expect(types.indexOf("thesis")).toBeLessThan(types.indexOf("problem"));
    expect(types.indexOf("results")).toBeLessThan(types.indexOf("boss_explanation"));
  });

  it("scaffolds the experiment proposal with its sub-headings", () => {
    const rows = newPaperSectionRows();
    const proposal = rows.find((r) => r.section_type === "experiment_proposal");
    expect(proposal?.body_md).toContain("## Hypothesis");
    expect(proposal?.body_md).toContain("## Baseline");
    expect(proposal?.body_md).toContain("## Failure cases to inspect");
  });

  it("assigns stable positions matching template order", () => {
    const rows = newPaperSectionRows();
    expect(rows.map((r) => r.position)).toEqual(rows.map((_, i) => i));
    expect(sectionPosition("thesis")).toBe(PAPER_SECTIONS.findIndex((s) => s.type === "thesis"));
  });

  it("provides human headings", () => {
    expect(sectionHeading("thesis")).toBe("One-sentence thesis");
    expect(sectionHeading("boss_explanation")).toBe("Plain-language explanation");
  });
});

describe("synthesis template", () => {
  it("asks the required questions", () => {
    const weekly = synthesisTemplate("weekly");
    for (const q of [
      "What did I learn",
      "Which ideas connect across papers?",
      "What changed in my mental model?",
      "What would I change in a real system based on this?",
      "What should stay classical?",
      "What can move offline or nearline?",
      "What requires online validation?",
      "What assumptions remain untested?",
      "What should I read next?",
    ]) {
      expect(weekly).toContain(q);
    }
    expect(synthesisTemplate("monthly")).toContain("this month");
  });

  it("computes Monday for weekly periods", () => {
    // 2026-07-11 is a Saturday → week starts Monday 2026-07-06.
    expect(periodStartFor("weekly", new Date(2026, 6, 11))).toBe("2026-07-06");
    // A Monday maps to itself.
    expect(periodStartFor("weekly", new Date(2026, 6, 6))).toBe("2026-07-06");
    // Sunday belongs to the week starting the previous Monday.
    expect(periodStartFor("weekly", new Date(2026, 6, 12))).toBe("2026-07-06");
  });

  it("computes the first of the month for monthly periods", () => {
    expect(periodStartFor("monthly", new Date(2026, 6, 11))).toBe("2026-07-01");
  });

  it("builds readable default titles", () => {
    expect(defaultSynthesisTitle("weekly", "2026-07-06")).toBe("Week of 2026-07-06");
    expect(defaultSynthesisTitle("monthly", "2026-07-01")).toBe("Monthly synthesis — 2026-07");
  });
});
