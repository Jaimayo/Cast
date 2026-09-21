import { describe, expect, it } from "vitest";
import { COMPOSER_CHIPS } from "@/lib/chips";
import {
  DEFAULT_STILL_ASPECT_ID,
  STILL_ASPECT_IDS,
  STILL_ASPECTS,
  composerHeroEmptyCopy,
  getStillAspect,
  isStillAspectId,
  stillAspectFromUnknown,
  stillGenerateSize,
  stillPixelSize,
} from "@/lib/still-aspect";

describe("still aspect (Composer Frame)", () => {
  it("defaults to 3:4 portrait and is not a prompt/camera family", () => {
    expect(DEFAULT_STILL_ASPECT_ID).toBe("3:4");
    expect(STILL_ASPECT_IDS).toEqual(["3:4", "1:1", "9:16", "16:9"]);
    expect(Object.keys(COMPOSER_CHIPS)).not.toContain("frame");
    expect(Object.keys(COMPOSER_CHIPS)).not.toContain("camera");
    const blob = JSON.stringify(STILL_ASPECTS).toLowerCase();
    expect(blob).not.toMatch(/dolly|orbit|crane|advanced/);
  });

  it("maps each frame to pixel size with longest side 1024", () => {
    expect(stillPixelSize("3:4")).toEqual({ width: 768, height: 1024 });
    expect(stillPixelSize("1:1")).toEqual({ width: 1024, height: 1024 });
    expect(stillPixelSize("9:16")).toEqual({ width: 576, height: 1024 });
    expect(stillPixelSize("16:9")).toEqual({ width: 1024, height: 576 });
    for (const aspect of STILL_ASPECTS) {
      expect(Math.max(aspect.width, aspect.height)).toBe(1024);
      expect(aspect.width % 8).toBe(0);
      expect(aspect.height % 8).toBe(0);
    }
  });

  it("coerces missing job input to 3:4 and ignores unknown values", () => {
    expect(stillAspectFromUnknown(undefined)).toBe("3:4");
    expect(stillAspectFromUnknown("")).toBe("3:4");
    expect(stillAspectFromUnknown("21:9")).toBe("3:4");
    expect(isStillAspectId("3:4")).toBe(true);
    expect(isStillAspectId("camera")).toBe(false);
    expect(stillGenerateSize({})).toEqual({ aspectRatio: "3:4", width: 768, height: 1024 });
    expect(stillGenerateSize({ aspectRatio: "16:9" })).toEqual({
      aspectRatio: "16:9",
      width: 1024,
      height: 576,
    });
    expect(getStillAspect("3:4").cssRatio).toBe("3 / 4");
    expect(getStillAspect("3:4").label).toBe("3:4 Portrait");
  });

  it("uses the locked empty-canvas line for every frame", () => {
    expect(composerHeroEmptyCopy(getStillAspect("3:4"))).toBe(
      "Compose a still with the chips, then Generate.",
    );
    expect(composerHeroEmptyCopy(getStillAspect("1:1"))).toBe(
      "Compose a still with the chips, then Generate.",
    );
  });
});
