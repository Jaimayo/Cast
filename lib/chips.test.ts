import { describe, expect, it } from "vitest";
import { COMPOSER_CHIPS, type ChipFamily } from "@/lib/chips";

const FAMILIES: ChipFamily[] = ["pose", "outfit", "scene", "lighting", "body"];

describe("composer chip catalog", () => {
  it("seeds 6–12 visual options per family with unique ids", () => {
    const ids = new Set<string>();
    for (const family of FAMILIES) {
      const chips = COMPOSER_CHIPS[family];
      expect(chips.length).toBeGreaterThanOrEqual(6);
      expect(chips.length).toBeLessThanOrEqual(12);
      for (const chip of chips) {
        expect(chip.family).toBe(family);
        expect(chip.label.length).toBeGreaterThan(0);
        expect(chip.fragment.length).toBeGreaterThan(0);
        expect(ids.has(chip.id)).toBe(false);
        ids.add(chip.id);
      }
    }
  });
});
