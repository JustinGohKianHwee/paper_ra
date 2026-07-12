import { describe, expect, it } from "vitest";
import {
  READING_STATUS_INFO,
  READING_STATUS_OPTIONS,
  VERIFICATION_STATUS_INFO,
  VERIFICATION_STATUS_OPTIONS,
} from "@/lib/statuses";
import {
  READING_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  readingStatusValues,
  verificationStatusValues,
} from "@/lib/validation/enums";

describe("status registry (single source of truth)", () => {
  it("covers every reading status with a label and a real explanation", () => {
    for (const value of readingStatusValues) {
      const info = READING_STATUS_INFO[value];
      expect(info.value).toBe(value);
      expect(info.label).toBe(READING_STATUS_LABELS[value]);
      expect(info.description.length).toBeGreaterThan(30);
    }
  });

  it("covers every verification status with a label and a real explanation", () => {
    for (const value of verificationStatusValues) {
      const info = VERIFICATION_STATUS_INFO[value];
      expect(info.value).toBe(value);
      expect(info.label).toBe(VERIFICATION_STATUS_LABELS[value]);
      expect(info.description.length).toBeGreaterThan(30);
    }
  });

  it("keeps explanations distinct — no copy-paste drift", () => {
    const all = [
      ...Object.values(READING_STATUS_INFO).map((i) => i.description),
      ...Object.values(VERIFICATION_STATUS_INFO).map((i) => i.description),
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  it("orders option lists like the enum definitions (stable form ordering)", () => {
    expect(READING_STATUS_OPTIONS.map((o) => o.value)).toEqual([...readingStatusValues]);
    expect(VERIFICATION_STATUS_OPTIONS.map((o) => o.value)).toEqual([...verificationStatusValues]);
  });

  it("keeps the honesty distinction explicit in the guide-status explanation", () => {
    expect(READING_STATUS_INFO.studied_through_guide.description.toLowerCase()).toContain(
      "not the paper itself"
    );
    expect(VERIFICATION_STATUS_INFO.primary_claims_verified.description.toLowerCase()).toContain(
      "never automatically"
    );
  });
});
