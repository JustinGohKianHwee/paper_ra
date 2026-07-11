/**
 * App-wide tunables. The app name is intentionally defined once so it can be
 * renamed later without touching feature code.
 */
export const APP_NAME = "Research Atlas";

export const APP_DESCRIPTION = "A private research notebook for recommender-systems and ML papers.";

/** Papers per week the dashboard measures reading sessions against. */
export const WEEKLY_READING_TARGET = 1;

/**
 * The persistent privacy reminder. Shown (unobtrusively) wherever notes are
 * written. Do not remove — see CLAUDE.md privacy rules.
 */
export const PRIVACY_REMINDER =
  "Public papers and personal learning only. Do not enter confidential TikTok / ByteDance information, internal metrics, proprietary model names, private code, screenshots, datasets, experiment results, or non-public architecture details.";
