import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Large Memory Network for Recommendation")).toBe(
      "large-memory-network-for-recommendation"
    );
  });

  it("strips punctuation and collapses separators", () => {
    expect(slugify("HSTU: Actions Speak Louder than Words!!")).toBe(
      "hstu-actions-speak-louder-than-words"
    );
    expect(slugify("From 128K   to    4M")).toBe("from-128k-to-4m");
  });

  it("strips diacritics", () => {
    expect(slugify("Café Récommendation")).toBe("cafe-recommendation");
  });

  it("never returns an empty slug", () => {
    expect(slugify("!!!")).toBe("untitled");
    expect(slugify("")).toBe("untitled");
  });

  it("caps length without trailing hyphen", () => {
    const slug = slugify("a".repeat(50) + " " + "b".repeat(60));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("returns base when free", () => {
    expect(uniqueSlug("longer", new Set())).toBe("longer");
  });

  it("appends increasing suffixes for collisions", () => {
    const taken = new Set(["longer", "longer-2"]);
    expect(uniqueSlug("longer", taken)).toBe("longer-3");
  });
});
