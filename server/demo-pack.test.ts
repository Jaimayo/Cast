import { describe, expect, it } from "vitest";
import { DEMO_PACK_IDS, demoLibraryStills, demoRefsForPack } from "@/lib/demo-pack";
import { readDemoStillBytes } from "@/server/demo-pack";

describe("stub demo media bytes", () => {
  it("serves Jillian JPEGs instead of champagne SVG placeholders", async () => {
    const ref = demoRefsForPack(DEMO_PACK_IDS.jillian)[0]!;
    const still = demoLibraryStills()[0]!;
    const refBytes = await readDemoStillBytes(ref.id);
    const stillBytes = await readDemoStillBytes(still.id);
    expect(refBytes?.mimeType).toBe("image/jpeg");
    expect(stillBytes?.mimeType).toBe("image/jpeg");
    expect(refBytes?.body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))).toBe(true);
    expect(stillBytes?.body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))).toBe(true);
  });

  it("keeps Iris Draft tiles on the champagne placeholder fallback", async () => {
    const iris = demoRefsForPack(DEMO_PACK_IDS.iris)[0]!;
    const bytes = await readDemoStillBytes(iris.id);
    expect(bytes?.mimeType).toBe("image/svg+xml");
    expect(bytes?.body.toString("utf8")).toContain("Iris");
    expect(bytes?.body.toString("utf8")).toContain("FICTIONAL · PLACEHOLDER");
  });
});
