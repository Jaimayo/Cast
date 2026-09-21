import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AGE_ATTEST_COPY } from "@/lib/age-attest";
import {
  LANDING_BADGES,
  LANDING_BODY,
  LANDING_CHIP_LABELS,
  LANDING_CTA,
  LANDING_HEADLINE,
  LANDING_HERO_SRC,
  LANDING_LOGIN,
  LANDING_LOGIN_HREF,
  LANDING_VISUAL_ARIA,
  LANDING_VISUAL_CAPTION,
  LANDING_VISUAL_NAMES,
} from "@/lib/landing-copy";
import { PRIVACY_TOOLTIP_COPY } from "@/lib/privacy-copy";

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
    expect(LANDING_LOGIN).toBe("Log in");
    expect(LANDING_LOGIN_HREF).toBe("/invite?mode=signin");
    expect([...LANDING_CHIP_LABELS]).toEqual(["Pose", "Scene", "Lighting"]);
    expect(LANDING_VISUAL_NAMES).toBe("Jillian");
    expect(LANDING_VISUAL_CAPTION).toBe("Demo character");
    expect(LANDING_VISUAL_ARIA).toBe("Jillian · Demo character");
    expect(LANDING_VISUAL_NAMES).not.toBe("JILLIAN");
    expect(LANDING_VISUAL_ARIA).not.toMatch(/Mara|Iris|MARA · IRIS|Demo characters/i);
    expect(LANDING_HERO_SRC).toBe("/demo/landing/jillian-hero-3x4.jpg");
    expect(existsSync(resolve(process.cwd(), "public/demo/landing/jillian-hero-3x4.jpg"))).toBe(true);
  });

  it("renders those strings on the landing page and omits gallery / likeness marketing", () => {
    const page = readRepo("app/page.tsx");
    expect(page).toContain("Invite only");
    expect(page).toContain("Adults only");
    expect(page).toContain("Consistent characters");
    expect(page).toContain("Private studio for all your imaginations.");
    expect(page).toContain(
      "Cast is invite-only. Create a consistent fictional character, then direct stills with",
    );
    expect(page).toContain("Enter with invite");
    expect(page).toContain("Log in");
    expect(page).toContain("LANDING_LOGIN_HREF");
    expect(page).toContain("LandingHeroVisual");
    expect(page).toContain("Wordmark");
    expect(page).not.toMatch(/No public gallery/i);
    expect(page).not.toMatch(/real-person likeness/i);
    expect(page).not.toMatch(/Fictional characters/);
    expect(page).not.toMatch(/Private fictional studio for adults/);
    expect(page).not.toMatch(/\bPose\b/);
    expect(page).not.toMatch(/\bScene\b/);
    expect(page).not.toMatch(/\bLighting\b/);
    const layout = readRepo("app/layout.tsx");
    expect(layout).not.toMatch(/No public gallery/i);
    expect(layout).not.toMatch(/real-person likeness/i);
    expect(readRepo("app/invite/page.tsx")).not.toMatch(/No public gallery/i);
    expect(readRepo("components/invite-form.tsx")).not.toMatch(/No public gallery/i);
    expect(readRepo("components/invite-form.tsx")).not.toMatch(/real-person likeness/i);
  });

  it("paints a full-bleed Jillian hero with champagne-on-void overlay, not a card stack", () => {
    const visual = readRepo("components/landing-hero-visual.tsx");
    const page = readRepo("app/page.tsx");
    const css = readRepo("app/globals.css");
    expect(visual).toContain("LANDING_HERO_SRC");
    expect(visual).toContain("landing-hero-photo");
    expect(visual).toContain("landing-hero-scrim");
    expect(visual).toContain("LANDING_VISUAL_ARIA");
    expect(visual).toContain("LANDING_VISUAL_NAMES");
    expect(visual).not.toContain("LANDING_CHIP_LABELS");
    expect(visual).not.toContain("landing-visual-card");
    expect(visual).not.toContain("Iris");
    expect(visual).not.toContain("toUpperCase");
    expect(visual).not.toMatch(/No public gallery/i);
    expect(visual).not.toMatch(/\bPose\b/);
    expect(visual).not.toMatch(/\bScene\b/);
    expect(visual).not.toMatch(/\bLighting\b/);
    expect(page).toContain("landing-screen");
    expect(page).toContain("landing-login");
    expect(page).toContain("landing-cta");
    expect(page).not.toContain("landing-visual-card");
    expect(css).toContain(".landing-hero-photo");
    expect(css).toContain("object-fit: cover");
    expect(css).toContain("object-position: 68% 16%");
    expect(css).toContain("rgba(14, 14, 20, 0.92)");
    expect(css).toContain("#c4a574");
    expect(css).toContain("#0e0e14");
    expect(css).toContain(".btn.landing-cta");
    expect(css).toContain("background: var(--gold)");
    expect(css).not.toContain(".landing-visual-card");
    expect(css).not.toContain(".landing-chip");
    expect(css).not.toMatch(/#ff4|#e91|hotpink|deeppink|#ff007f|#ff1493|#ff69b4/i);
    expect(css).not.toMatch(/\.landing-visual-name\s*\{[^}]*text-transform:\s*uppercase/s);
  });

  it("does not change the locked 18+ attest copy", () => {
    expect(AGE_ATTEST_COPY).toBe("I confirm I am 18+.");
    expect(readRepo("lib/age-attest.ts")).toContain('export const AGE_ATTEST_COPY = "I confirm I am 18+.";');
    expect(readRepo("components/age-policy-attest.tsx")).toContain("AGE_ATTEST_COPY");
  });

  it("locks the in-app Privacy tooltip and omits gallery wording", () => {
    expect(PRIVACY_TOOLTIP_COPY).toBe("Generations stay private to your account.");
    expect(PRIVACY_TOOLTIP_COPY).not.toMatch(/No public gallery/i);
    const strip = readRepo("components/privacy-strip.tsx");
    expect(strip).toContain("PRIVACY_TOOLTIP_COPY");
    expect(strip).not.toMatch(/No public gallery/i);
    expect(readRepo("components/studio-chrome.tsx")).not.toMatch(/No public gallery/i);
    expect(readRepo("components/gate-header.tsx")).not.toMatch(/No public gallery/i);
  });
});
