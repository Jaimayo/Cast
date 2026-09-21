import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AGE_ATTEST_COPY } from "@/lib/age-attest";
import { GENERATE_REASON_POSE, GENERATE_LABEL_IDLE } from "@/lib/generate-affordances";
import { LOCK_SOUL_ID_FIRST } from "@/lib/soul";
import { composerHeroEmptyCopy, getStillAspect } from "@/lib/still-aspect";
import {
  ANIMATE_LATER_BADGE,
  ANIMATE_LATER_HELPER,
  ANIMATE_LATER_LABEL,
  CHARACTER_REQUIRED_BODY,
  CHARACTER_REQUIRED_CTA,
  CHARACTER_REQUIRED_HREF,
  CHARACTER_REQUIRED_TITLE,
  COMPOSER_EMPTY_CANVAS_COPY,
  GENERATE_LABEL,
  PACK_PRIMARY_CTA,
  ROSTER_CREATE_ARIA,
  ROSTER_CREATE_CTA,
  ROSTER_CREATE_HELPER,
  ROSTER_CREATE_HREF,
} from "@/lib/studio-copy";

function readRepo(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("studio high-end copy lock (rev 2)", () => {
  it("locks §4 Create / Pack / roster strings", () => {
    expect(COMPOSER_EMPTY_CANVAS_COPY).toBe("Compose a still with the chips, then Generate.");
    expect(PACK_PRIMARY_CTA).toBe("Use in Create");
    expect(ROSTER_CREATE_CTA).toBe("Create character pack");
    expect(ROSTER_CREATE_HELPER).toBe("Lock a Soul ID to generate stills.");
    expect(ROSTER_CREATE_ARIA).toBe("Create character pack");
    expect(ROSTER_CREATE_HREF).toBe("/app/characters/new");
    expect(composerHeroEmptyCopy(getStillAspect("3:4"))).toBe(COMPOSER_EMPTY_CANVAS_COPY);
    expect(composerHeroEmptyCopy(getStillAspect("1:1"))).toBe(COMPOSER_EMPTY_CANVAS_COPY);
  });

  it("keeps CharacterRequiredEmpty and Generate / Animate later strings", () => {
    expect(CHARACTER_REQUIRED_TITLE).toBe("Lock a character to create");
    expect(CHARACTER_REQUIRED_BODY).toBe("Composer needs a Locked Soul ID.");
    expect(CHARACTER_REQUIRED_CTA).toBe("Go to Characters");
    expect(CHARACTER_REQUIRED_HREF).toBe("/app/characters");
    expect(LOCK_SOUL_ID_FIRST).toBe("Lock Soul ID first");
    expect(GENERATE_LABEL).toBe("Generate");
    expect(GENERATE_LABEL_IDLE).toBe("Generate");
    expect(GENERATE_REASON_POSE).toBe("Choose a pose to generate.");
    expect(ANIMATE_LATER_LABEL).toBe("Animate later");
    expect(ANIMATE_LATER_BADGE).toBe("Phase 1.5");
    expect(ANIMATE_LATER_HELPER).toBe("Short clips come in Phase 1.5 — stills first.");
  });

  it("does not reopen age copy", () => {
    expect(AGE_ATTEST_COPY).toBe("I confirm I am 18+.");
  });

  it("wires Create empty canvas, filled Use in Create, and roster create tile", () => {
    const hero = readRepo("components/hero-canvas.tsx");
    expect(hero).toContain("COMPOSER_EMPTY_CANVAS_COPY");
    expect(hero).toContain("CHARACTER_REQUIRED_TITLE");
    expect(hero).toContain("CHARACTER_REQUIRED_BODY");
    expect(hero).toContain("CHARACTER_REQUIRED_CTA");
    expect(hero).not.toContain("Your still appears here.");
    expect(hero).not.toContain("Hero Frame ·");

    const generate = readRepo("components/generate-button.tsx");
    expect(generate).toContain("ANIMATE_LATER_LABEL");
    expect(generate).toContain("ANIMATE_LATER_BADGE");
    expect(generate).toContain("generate-btn");

    const packCta = readRepo("components/pack-primary-cta.tsx");
    expect(packCta).toContain("PACK_PRIMARY_CTA");
    expect(packCta).toContain("pack-primary-cta");
    expect(packCta).not.toMatch(/Use in\s*\/\s*Create/);

    const roster = readRepo("components/character-roster.tsx");
    expect(roster).toContain("RosterCreateTile");
    expect(roster).toContain("PackPrimaryCta");
    expect(roster).not.toMatch(/>Empty</);
    expect(roster).not.toContain("New Character Pack");
    expect(readRepo("components/roster-create-tile.tsx")).not.toMatch(/EMPTY/);
    expect(readRepo("components/roster-create-tile.tsx")).toContain("ROSTER_CREATE_CTA");
    expect(readRepo("components/roster-create-tile.tsx")).toContain("ROSTER_CREATE_HELPER");

    const pack = readRepo("components/pack-status-panel.tsx");
    expect(pack).toContain("PackPrimaryCta");
    expect(pack).toContain("pack-identity");

    const shell = readRepo("components/composer-shell.tsx");
    expect(shell).toContain("ComposerActionBar");
    expect(shell).toContain("demoJobId");
    expect(shell).toContain("composer-history-strip");

    const css = readRepo("app/globals.css");
    expect(css).toContain(".pack-primary-cta");
    expect(css).toContain("color: #0a0a0c");
    expect(css).toContain(".roster-create-tile");
    expect(css).toContain(".composer-action-bar");
    expect(css).toContain(".hero-frame.is-empty");
  });

  it("leaves landing AM-hero composition alone", () => {
    const page = readRepo("app/page.tsx");
    const visual = readRepo("components/landing-hero-visual.tsx");
    expect(page).toContain("landing-screen");
    expect(visual).toContain("LANDING_HERO_SRC");
    expect(visual).toContain("landing-hero-photo");
    expect(visual).toContain("landing-hero-scrim");
  });
});
