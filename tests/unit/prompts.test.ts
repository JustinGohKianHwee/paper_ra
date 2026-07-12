import { describe, expect, it } from "vitest";
import {
  AI_NOTE_SECTIONS,
  MARKDOWN_MATH_RULE,
  NOTES_JSON_SCHEMA,
  UNTRUSTED_PREAMBLE,
  buildNotesPrompt,
  buildPassagesPrompt,
  buildQaPrompt,
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

  it("keeps grounded Q&A answers concise", () => {
    const { system } = buildQaPrompt({
      paperTitle: "T",
      question: "What is the mechanism?",
      contextPages: [{ pageNo: 1, content: "The mechanism is described here." }],
      passageIndex: "- Method (pp. 1-2)",
      priorThread: [],
    });
    expect(system).toContain("Keep answers concise");
    expect(system).toContain("180-300 words");
  });

  it("frames a selected passage as primary evidence in Q&A", () => {
    const withSelection = buildQaPrompt({
      paperTitle: "T",
      question: "Why is this different from ordinary self-attention?",
      contextPages: [{ pageNo: 5, content: "Some retrieved context." }],
      passageIndex: "- Method (pp. 4-6)",
      priorThread: [],
      primarySelection: { text: "candidate-aware attention weights the target item", page: 4 },
    });
    // The selection is presented as PRIMARY EVIDENCE with its page.
    expect(withSelection.user).toContain("PRIMARY EVIDENCE");
    expect(withSelection.user).toContain("candidate-aware attention weights the target item");
    expect(withSelection.user).toContain("p. 4");
    // The system prompt tells the model to treat it as the main subject.
    expect(withSelection.system).toContain("selected a specific passage");

    // Without a selection, none of that framing appears.
    const without = buildQaPrompt({
      paperTitle: "T",
      question: "What is the mechanism?",
      contextPages: [{ pageNo: 1, content: "ctx" }],
      passageIndex: "",
      priorThread: [],
    });
    expect(without.user).not.toContain("PRIMARY EVIDENCE");
    expect(without.system).not.toContain("selected a specific passage");
  });

  it("asks Markdown-producing prompts to format equations as KaTeX math", () => {
    const passages = buildPassagesPrompt({
      paperTitle: "T",
      chunkText: "Equation: y = Wx",
      chunkPageStart: 1,
      chunkPageEnd: 1,
      isFirstChunk: true,
    });
    const notes = buildNotesPrompt({
      paperTitle: "T",
      abstract: null,
      passageSummaries: "The paper defines y = Wx.",
    });
    const qa = buildQaPrompt({
      paperTitle: "T",
      question: "What is the equation?",
      contextPages: [{ pageNo: 1, content: "The paper defines y = Wx." }],
      passageIndex: "- Method (p. 1)",
      priorThread: [],
    });
    const synthesis = buildSynthesisPrompt({
      kind: "weekly",
      periodStart: "2026-07-06",
      activity: "Used $y = Wx$ in notes.",
      templateQuestions: "What equations mattered?",
    });

    for (const prompt of [passages, notes, qa, synthesis]) {
      expect(prompt.system).toContain(MARKDOWN_MATH_RULE);
      expect(prompt.system).toContain("KaTeX-compatible LaTeX");
      expect(prompt.system).toContain("display `$$...$$`");
    }
  });
});
