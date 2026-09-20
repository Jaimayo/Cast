import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AGE_ATTEST_COPY } from "@/lib/age-attest";
import {
  LANDING_BADGES,
  LANDING_BODY,
  LANDING_CHIP_LABELS,
  LANDING_CTA,
  LANDING_HEADLINE,
  LANDING_VISUAL_CAPTION,
  LANDING_VISUAL_NAMES,
} from "@/lib/landing-copy";

function readRepo(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Stage 1 landing copy", () => {
  it("locks the exact badge / headline / body / CTA strings", () => {
    expect([...LANDING_BADGES]).toEqual(["Invite only", "Adults only", "Consistent characters"]);
    expect(LANDING_HEADLINE).toBe("Private studio for all your imaginations.");
    expect(LANDING_BODY).toBe(
      "Cast is invite-only. Create a consistent fictional character, then direct stills with structured chips.",
    );
    expect(LANDING_CTA).toBe("Enter with invite");
    expect([...LANDING_CHIP_LABELS]).toEqual(["Pose", "Scene", "Lighting"]);
    expect(LANDING_VISUAL_NAMES).toBe("Mara · Iris");
    expect(LANDING_VISUAL_CAPTION).toBe("Demo characters");
  });

  it("renders those strings on the landing page and omits gallery / likeness marketing", () => {
    const page = readRepo("app/page.tsx");
    expect(page).toContain("LANDING_BADGES");
    expect(page).toContain("LANDING_HEADLINE");
    expect(page).toContain("LANDING_BODY");
    expect(page).toContain("LANDING_CTA");
    expect(page).toContain("LandingHeroVisual");
    expect(page).not.toMatch(/No public gallery/i);
    expect(page).not.toMatch(/real-person likeness/i);
    expect(page).not.toMatch(/Fictional characters/);
    expect(page).not.toMatch(/Private fictional studio for adults/);
    const layout = readRepo("app/layout.tsx");
    expect(layout).not.toMatch(/No public gallery/i);
    expect(layout).not.toMatch(/real-person likeness/i);
    expect(readRepo("app/invite/page.tsx")).not.toMatch(/No public gallery/i);
    expect(readRepo("components/invite-form.tsx")).not.toMatch(/No public gallery/i);
    expect(readRepo("components/invite-form.tsx")).not.toMatch(/real-person likeness/i);
  });

  it("does not change the locked 18+ attest copy", () => {
    expect(AGE_ATTEST_COPY).toBe("I confirm I am 18+.");
    expect(readRepo("lib/age-attest.ts")).toContain('export const AGE_ATTEST_COPY = "I confirm I am 18+.";');
    expect(readRepo("components/age-policy-attest.tsx")).toContain("AGE_ATTEST_COPY");
  });
});
