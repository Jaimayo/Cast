import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AGE_ATTEST_COPY } from "@/lib/age-attest";
import { demoBadgeLabel, demoPackThumbAlt, getDemoPack, DEMO_PACK_IDS } from "@/lib/demo-pack";
import {
  LANDING_CHIP_LABELS,
  LANDING_VISUAL_ARIA,
  LANDING_VISUAL_CAPTION,
  LANDING_VISUAL_NAMES,
} from "@/lib/landing-copy";
import { SOUL_BADGE_LOCKED, SOUL_BADGE_UNLOCKED } from "@/lib/soul";

function readRepo(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Jillian branding-canonical captions", () => {
  it("locks Jillian demo copy in title case and omits it from the landing first screen", () => {
    expect(LANDING_VISUAL_NAMES).toBe("Jillian");
    expect(LANDING_VISUAL_CAPTION).toBe("Demo character");
    expect(LANDING_VISUAL_ARIA).toBe("Jillian · Demo character");
    expect(LANDING_VISUAL_NAMES).not.toBe("JILLIAN");
    expect(`${LANDING_VISUAL_NAMES} · ${LANDING_VISUAL_CAPTION}`).not.toMatch(/Mara|Iris|Demo characters/i);
    const visual = readRepo("components/landing-hero-visual.tsx");
    expect(visual).toContain("LANDING_VISUAL_ARIA");
    expect(visual).not.toContain("LANDING_VISUAL_NAMES");
    expect(visual).not.toContain("LANDING_VISUAL_CAPTION");
    expect(visual).not.toContain("LANDING_CHIP_LABELS");
    expect(visual).not.toContain("landing-credit");
    expect(readRepo("app/page.tsx")).not.toMatch(/Jillian|Demo character/);
  });

  it("keeps Pose / Scene / Lighting as Create chip families, not landing chrome", () => {
    expect([...LANDING_CHIP_LABELS]).toEqual(["Pose", "Scene", "Lighting"]);
    const rail = readRepo("components/chip-rail.tsx");
    expect(rail).toContain('title="Pose"');
    expect(rail).toContain('title="Scene"');
    expect(rail).toContain('title="Lighting"');
    expect(readRepo("app/page.tsx")).not.toMatch(/\bPose\b/);
    expect(readRepo("components/landing-hero-visual.tsx")).not.toMatch(/\bLighting\b/);
  });

  it("locks roster / pack chrome for Jillian Locked and Iris Draft", () => {
    const jillian = getDemoPack(DEMO_PACK_IDS.jillian)!;
    const iris = getDemoPack(DEMO_PACK_IDS.iris)!;
    expect(jillian.name).toBe("Jillian");
    expect(demoBadgeLabel(jillian.demoState)).toBe("Demo");
    expect(demoPackThumbAlt(jillian)).toBe("Jillian (demo)");
    expect(SOUL_BADGE_LOCKED).toBe("Soul ID");
    expect(demoBadgeLabel(iris.demoState)).toBe("Draft");
    expect(demoBadgeLabel(iris.demoState)).not.toMatch(/demo/i);
    expect(demoPackThumbAlt(iris)).toBe("Iris (draft)");
    const roster = readRepo("components/character-roster.tsx");
    expect(roster).toContain("Use in Create");
    expect(roster).toContain("demoPackThumbAlt");
    expect(roster).toContain("demoBadgeLabel");
    expect(readRepo("components/soul-badge.tsx")).toContain("SOUL_BADGE_LOCKED");
    expect(readRepo("components/soul-badge.tsx")).not.toMatch(/Soul:/);
    expect(SOUL_BADGE_UNLOCKED).toBe("No Soul ID");
  });

  it("does not reopen age copy", () => {
    expect(AGE_ATTEST_COPY).toBe("I confirm I am 18+.");
  });
});
