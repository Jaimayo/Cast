import { describe, expect, it } from "vitest";
import { demoLibraryStills, demoRefsForPack, DEMO_PACK_IDS } from "@/lib/demo-pack";
import { demoPlaceholderSvg, placeholderHasFaceGeometry } from "@/lib/demo-placeholder";

describe("demo placeholder tiles", () => {
  it("renders champagne F1-mark tiles with fictional labels and no face geometry", () => {
    const still = demoRefsForPack(DEMO_PACK_IDS.iris)[0]!;
    const svg = demoPlaceholderSvg(still);
    expect(svg).toContain("Iris");
    expect(svg).toContain("FICTIONAL · PLACEHOLDER");
    expect(svg).toContain("#C4A574");
    expect(svg).toContain("#07070A");
    expect(placeholderHasFaceGeometry(svg)).toBe(false);
  });

  it("labels library tiles as demo stills, not portraits of a person", () => {
    const still = demoLibraryStills()[0]!;
    const svg = demoPlaceholderSvg(still);
    expect(svg).toContain("DEMO STILL");
    expect(svg).not.toMatch(/photoreal|photograph of|real face/i);
  });
});
