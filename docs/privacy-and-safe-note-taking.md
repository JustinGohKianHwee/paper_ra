# Privacy and safe note-taking

This notebook exists to study **public research papers** and record **personal
learning**. It must never hold confidential employer information.

## The rule

> Do not enter confidential TikTok / ByteDance information, internal metrics,
> proprietary model names, private code, screenshots, datasets, experiment results,
> architecture details, or other non-public work information.

This reminder is rendered persistently (but unobtrusively) in every editor
(`components/privacy-reminder.tsx`, text in `lib/config.ts` → `PRIVACY_REMINDER`).
Do not remove it.

## What is safe to record

- Content of public papers, arXiv preprints, public blog posts, and conference talks.
- Your own reasoning about them: misconceptions, corrections, open questions,
  boss-facing explanations.
- Experiments run in **personal repositories on public datasets** (the experiments
  form asks for repo/branch — personal repos only).
- Generic engineering judgement ("long-history models can regress sparse users") that
  does not describe any specific internal system.

## What is not safe

- Internal metric values, dashboards, or experiment outcomes — even paraphrased.
- Internal system/model/project codenames, architecture diagrams, or configs.
- Screenshots of anything on an internal machine.
- Mapping a paper to _specific internal systems_ in identifying detail. The
  "TikTok Shop relevance" section is for public-information reasoning only.

When in doubt, leave it out — write the public-paper version of the thought.

## How the app enforces private-by-default

- Every content table carries `visibility` defaulting to `'private'`, and **no public
  route exists** in the MVP.
- Row-level security restricts every row to its owner; even the full-text search
  function runs with the caller's permissions (SECURITY INVOKER).
- A future public export may only ever include records explicitly marked
  `publishable`, and must be reviewed field-by-field before shipping — the schema
  default means a forgotten filter exposes nothing.
- No analytics or third-party data sinks; attachments live in a private storage
  bucket with owner-only policies.

## Provenance honesty (related discipline)

Seeded and guide-derived notes are marked `secondary_summary_only` with
`needs_verification` source rows; exact numbers must be verified against the primary
paper before being cited externally. Never present unverified claims as your own
verified knowledge — the verification badges exist so that future-you can trust
past-you.
