import { describe, expect, it } from "vitest";
import { COMPOSER_CHIPS } from "@/lib/chips";
import { CHIP_THUMB_SPECS, chipThumbSpec } from "@/lib/chip-visuals";
import { STARTER_PRESETS } from "@/lib/starters";

describe("chip placeholder thumbs", () => {
  it("covers every composer chip with a designed 1:1 abstract spec", () => {
    for (const family of Object.keys(COMPOSER_CHIPS) as Array<keyof typeof COMPOSER_CHIPS>) {
      for (const chip of COMPOSER_CHIPS[family]) {
        const spec = chipThumbSpec(chip.id, family, chip.label);
        expect(spec.id).toBe(chip.id);
        expect(spec.family).toBe(family);
        expect(spec.field).toMatch(/gradient/);
        expect(spec.mark).not.toMatch(/face|nude|body-photo/i);
      }
    }
  });

  it("covers generate-starter vibes as swatches / proportion marks, not portraits", () => {
    for (const preset of STARTER_PRESETS) {
      const spec = chipThumbSpec(preset.id);
      expect(spec.id).toBe(preset.id);
      expect(["swatch", "athletic", "hourglass", "lean", "solid"]).toContain(spec.mark);
    }
  });

  it("does not ship camera or Advanced families", () => {
    const families = new Set(CHIP_THUMB_SPECS.map((spec) => spec.family));
    expect(families.has("pose")).toBe(true);
    expect([...families].join(",")).not.toMatch(/camera|advanced/i);
  });
});
