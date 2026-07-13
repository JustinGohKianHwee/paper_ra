# Screenshots

The main `README.md` currently renders **labelled `.svg` placeholders** (generated, committed)
so the gallery isn't full of broken images. Replace each one with a real capture from a
running instance (`npm run dev`, seeded library).

**How to swap a placeholder for a real screenshot:**

1. Capture the shot described below and save it here as **`<name>.png`** (same base name as
   the placeholder — e.g. `reading-workspace.png`).
2. In `README.md`, change that image's link from `<name>.svg` to `<name>.png`.
3. Optionally delete the now-unused `<name>.svg` placeholder.

## What to capture

| Filename (`.png`)       | What to capture                                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reading-workspace.png` | Reading mode (`/papers/[slug]/read`) with all three panes: structured notes (left), the PDF (centre), the assistant rail (right). Show a passage summary and an annotation/Q&A.          |
| `highlight-note.png`    | The PDF with a visible amber **highlight** on a passage, and the assistant rail's highlight card showing its open note composer (the "Note" flow). Ideally include the selection toolbar. |
| `selection-ask.png`     | A text selection in the PDF with the floating **Ask / Highlight / Note** toolbar, or a grounded answer in the rail showing its cited pages.                                              |
| `add-paper-ai.png`      | `/papers/new` after resolving a paper — the metadata preview and/or the **AI suggestions** review panel with accept/reject chips for topics & concepts.                                  |
| `paper-view.png`        | View mode (`/papers/[slug]`): the clean read-only record — header, passage breakdown with AI summaries, notes, relations, sources.                                                       |
| `dashboard.png`         | The dashboard (`/dashboard`): the stat strip, the 14-day activity bars, and the primary work cards.                                                                                      |
| `radar.png`             | Research Radar (`/radar`) after a refresh: a few candidate cards with their "why it matters" explanations.                                                                               |
| `synthesis.png`         | `/synthesis/new` or a synthesis record: the AI-drafted body (labelled AI draft) in the editor, with the approve action.                                                                  |
| `formula-ocr.png`       | The Formula OCR dialog: a cropped equation screenshot on one side and the recognised KaTeX / `$$…$$` Markdown output on the other.                                                        |
| `search-command.png`    | The `Ctrl+K` command palette / global search open, with results spanning papers, notes/questions, and concepts.                                                                          |

## Guidance

- Use a wide viewport (≥ 1440px) so the three-pane workspace isn't collapsed to tabs.
- Prefer light mode for legibility on the README, or capture both and suffix `-dark`.
- Crop to the app content (no OS chrome). PNG, roughly 1600px wide is plenty (the
  placeholders are 1600×1000, i.e. 16:10 — matching that keeps the gallery tidy).
- Do not include any confidential material — use the seeded public papers only.

The placeholders are static SVGs with no scripts, safe to render on GitHub.
