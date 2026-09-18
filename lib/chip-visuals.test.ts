import { describe, expect, it } from "vitest";
import { chipSwatch, emptyCatalogCopy } from "@/lib/chip-visuals";

describe("chip visuals", () => {
  it("returns a dark luxury swatch pair", () => {
    const swatch = chipSwatch("pose", "standing-neutral");
    expect(swatch.from).toMatch(/^hsl\(/);
    expect(swatch.to).toMatch(/^hsl\(/);
  });

  it("keeps empty-catalog copy non-explicit", () => {
    expect(emptyCatalogCopy("outfit")).toBe("Outfit pack coming");
  });
});
