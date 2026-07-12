import type { ReadingStatus } from "@/lib/validation/enums";

/**
 * Reading-depth buckets used by the Topics landscape. Pure and unit-tested.
 * Deliberately three coarse buckets — the landscape answers "how well do I
 * know this area", not "what exact status is each paper".
 */
export type DepthBucket = "deep" | "surface" | "unread";

export const DEPTH_LABELS: Record<DepthBucket, string> = {
  deep: "read deeply",
  surface: "surface knowledge",
  unread: "not read",
};

export function depthBucket(status: ReadingStatus): DepthBucket {
  switch (status) {
    case "deep_read":
    case "implemented":
      return "deep";
    case "skimmed":
    case "studied_through_guide":
    case "revisit":
      return "surface";
    case "to_read":
    case "queued":
      return "unread";
  }
}

export interface DepthSummary {
  deep: number;
  surface: number;
  unread: number;
  total: number;
}

export function summariseDepth(statuses: ReadingStatus[]): DepthSummary {
  const summary: DepthSummary = { deep: 0, surface: 0, unread: 0, total: statuses.length };
  for (const status of statuses) summary[depthBucket(status)]++;
  return summary;
}
