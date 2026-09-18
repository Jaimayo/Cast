import { describe, expect, it } from "vitest";
import { COMPOSER_CHIPS } from "@/lib/chips";
import { isLockedSoul } from "@/lib/soul";

describe("composer chip families", () => {
  it("exposes Character-adjacent families only — no camera or Advanced", () => {
    expect(Object.keys(COMPOSER_CHIPS)).toEqual(["pose", "outfit", "scene", "lighting", "body"]);
    const blob = JSON.stringify(COMPOSER_CHIPS).toLowerCase();
    expect(blob).not.toMatch(/camera|dolly|orbit|crane|advanced/);
  });
});

describe("Soul ID lock", () => {
  it("treats locked and ready as Generate-eligible", () => {
    expect(isLockedSoul("locked")).toBe(true);
    expect(isLockedSoul("ready")).toBe(true);
    expect(isLockedSoul("draft")).toBe(false);
    expect(isLockedSoul("training")).toBe(false);
    expect(isLockedSoul("failed")).toBe(false);
  });
});
