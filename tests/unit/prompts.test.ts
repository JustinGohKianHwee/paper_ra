import { describe, expect, it } from "vitest";
import {
  AI_NOTE_SECTIONS,
  NOTES_JSON_SCHEMA,
  UNTRUSTED_PREAMBLE,
  buildNotesPrompt,
  buildPassagesPrompt,
  buildSuggestionsPrompt,
  buildSynthesisPrompt,
} from "@/lib/ai/prompts";
import { PAPER_SECTIONS } from "@/lib/templates/paper";

describe("prompt builders", () => {
  it("always frames document text as untrusted", () => {
    const passages = buildPassagesPrompt({
      paperTitle: "T",
      chunkText: "body",
      chunkPageStart: 1,
      chunkPageEnd: 3,
      isFirstChunk: true,
    });
    const notes = buildNotesPrompt({ paperTitle: "T", abstract: null, passageSummaries: "s" });
    const suggestions = buildSuggestionsPrompt({
      paperTitle: "T",
      abstract: null,
      summary: "",
      existingTopics: [],
      existingConcepts: [],
    });
    const synthesis = buildSynthesisPrompt({
      kind: "weekly",
      periodStart: "2026-07-06",
      activity: "a",
      templateQuestions: "q",
    });
    for (const prompt of [passages, notes, suggestions, synthesis]) {
      expect(prompt.system).toContain(UNTRUSTED_PREAMBLE);
    }
  });

  it("tells the passage model which pages the chunk covers", () => {
    const { user } = buildPassagesPrompt({
      paperTitle: "My Paper",
      chunkText: "[page 4]\ntext",
      chunkPageStart: 4,
      chunkPageEnd: 9,
      isFirstChunk: false,
    });
    expect(user).toContain("pages 4–9");
    expect(user).toContain("BEGIN UNTRUSTED DOCUMENT TEXT");
  });

  it("only drafts sections that exist in the paper template, never personal ones", () => {
    const templateTypes = new Set(PAPER_SECTIONS.map((s) => s.type));
    for (const section of AI_NOTE_SECTIONS) {
      expect(templateTypes.has(section), section).toBe(true);
    }
    // Personal reasoning sections must remain human-only.
    for (const personal of [
      "relevance_to_me",
      "misconceptions",
      "open_questions",
      "implementation_mapping",
      "experiment_proposal",
    ]) {
      expect(AI_NOTE_SECTIONS).not.toContain(personal);
    }
  });

  it("keeps the notes JSON schema in sync with AI_NOTE_SECTIONS", () => {
    expect(Object.keys(NOTES_JSON_SCHEMA.properties)).toEqual([...AI_NOTE_SECTIONS]);
    expect(NOTES_JSON_SCHEMA.required).toEqual([...AI_NOTE_SECTIONS]);
  });

  it("passes existing topic and concept names to the suggestion model", () => {
    const { user } = buildSuggestionsPrompt({
      paperTitle: "T",
      abstract: "A",
      summary: "S",
      existingTopics: ["Cold Start", "Calibration"],
      existingConcepts: ["Memory banks"],
    });
    expect(user).toContain("Cold Start; Calibration");
    expect(user).toContain("Memory banks");
  });
});
