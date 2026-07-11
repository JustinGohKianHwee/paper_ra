/**
 * App-wide tunables. The app name is intentionally defined once so it can be
 * renamed later without touching feature code.
 */
export const APP_NAME = "Research Atlas";

export const APP_DESCRIPTION = "A private, AI-assisted notebook for studying research papers.";

/** Papers per week the dashboard measures reading sessions against. */
export const WEEKLY_READING_TARGET = 1;

/**
 * The persistent privacy reminder. Shown (unobtrusively) wherever notes are
 * written. Do not remove — see CLAUDE.md privacy rules.
 */
export const PRIVACY_REMINDER =
  "Public papers and personal learning only. Do not enter confidential employer information: internal metrics, proprietary model or project names, private code, screenshots, datasets, experiment results, or non-public architecture details.";

/**
 * Disclosure shown wherever document content is submitted for AI processing.
 * Do not remove — users must know their input leaves the machine.
 */
export const AI_DISCLOSURE =
  "Paper text and metadata are sent to OpenAI for processing. Only use publicly available papers.";
