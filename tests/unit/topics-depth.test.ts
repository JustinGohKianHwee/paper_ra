import { describe, expect, it } from "vitest";
import { depthBucket, summariseDepth } from "@/lib/topics/depth";
import { readingStatusValues } from "@/lib/validation/enums";

describe("depthBucket", () => {
  it("maps every reading status to exactly one bucket", () => {
    for (const status of readingStatusValues) {
      expect(["deep", "surface", "unread"]).toContain(depthBucket(status));
    }
  });

  it("treats guide-study as surface knowledge, never deep", () => {
    expect(depthBucket("studied_through_guide")).toBe("surface");
    expect(depthBucket("deep_read")).toBe("deep");
    expect(depthBucket("implemented")).toBe("deep");
  });
});

describe("summariseDepth", () => {
  it("counts buckets and total", () => {
    expect(summariseDepth(["deep_read", "implemented", "skimmed", "to_read", "queued"])).toEqual({
      deep: 2,
      surface: 1,
      unread: 2,
      total: 5,
    });
  });

  it("handles an empty topic", () => {
    expect(summariseDepth([])).toEqual({ deep: 0, surface: 0, unread: 0, total: 0 });
  });
});
