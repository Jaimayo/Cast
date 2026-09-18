import { describe, expect, it } from "vitest";
import { COMPOSER_CHIPS } from "@/lib/chips";
import { isLockedSoul, LOCK_SOUL_ID_FIRST, packDetailPath, requireLockedSoulForGenerate } from "@/lib/soul";

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

  it("rejects Generate for Draft/Training/Failed with Lock Soul ID first", () => {
    for (const status of ["draft", "training", "failed", ""]) {
      expect(() => requireLockedSoulForGenerate(status)).toThrow(LOCK_SOUL_ID_FIRST);
    }
    expect(() => requireLockedSoulForGenerate("locked")).not.toThrow();
    expect(() => requireLockedSoulForGenerate("ready")).not.toThrow();
  });

  it("points the lock CTA at pack detail", () => {
    expect(packDetailPath("pack-1")).toBe("/app/characters/pack-1");
    expect(packDetailPath()).toBe("/app/characters");
  });
});
