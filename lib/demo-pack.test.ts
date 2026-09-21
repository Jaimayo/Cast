import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AGE_ATTEST_COPY } from "@/lib/age-attest";
import { PACK_MIN_REFS, PACK_TARGET_REFS } from "@/lib/constants";
import {
  DEMO_ASSET_DIR,
  DEMO_JILLIAN_AVATAR_FILE,
  DEMO_LANDING_HERO_FILE,
  DEMO_LIBRARY_COPY,
  DEMO_PACK_CREATE_MESSAGE,
  DEMO_PACK_DRAFT_COPY,
  DEMO_PACK_FICTIONAL_COPY,
  DEMO_PACK_IDS,
  DEMO_PACK_LOCKED_COPY,
  DEMO_PACK_READ_ONLY_MESSAGE,
  DEMO_SEED_NOTE,
  DEMO_STILL_DROP_DIR,
  demoClientFields,
  demoCopyIsFictionalOnly,
  demoLibraryStills,
  demoPackCanTrain,
  demoPackLocked,
  demoPackPreviewUrl,
  demoPackStatusLabel,
  demoPreviewUrl,
  demoRefCount,
  demoRefsForPack,
  demoSeedPayload,
  demoStartersForPack,
  demoStillRepoPath,
  getDemoPack,
  getDemoStill,
  isDemoPackId,
  isDemoStillId,
  listDemoPacks,
  shouldServeDemoPacks,
} from "@/lib/demo-pack";
import { parseMediaId } from "@/lib/media";
import { isLockedSoul } from "@/lib/soul";
import { LIBRARY_EMPTY_BODY, LIBRARY_DETAIL_EMPTY_BODY } from "@/lib/library-still";
import { TEST_GRID_FICTIONAL_COPY } from "@/lib/test-grid";

describe("stub demo Character Packs", () => {
  it("only appears in stub / REVIEW — never live", () => {
    expect(shouldServeDemoPacks({ providerMode: "stub" })).toBe(true);
    expect(shouldServeDemoPacks({ providerMode: "live" })).toBe(false);
  });

  it("stocks Jillian Locked and Iris Draft with fictional names only", () => {
    const packs = listDemoPacks();
    expect(packs.map((pack) => pack.name)).toEqual(["Jillian", "Iris"]);
    const jillian = getDemoPack(DEMO_PACK_IDS.jillian)!;
    const iris = getDemoPack(DEMO_PACK_IDS.iris)!;
    expect(jillian.slug).toBe("jillian");
    expect(jillian.demoState).toBe("locked");
    expect(iris.demoState).toBe("draft");
    expect(isLockedSoul(jillian.status)).toBe(true);
    expect(isLockedSoul(iris.status)).toBe(false);
    expect(demoPackLocked(jillian.id)).toBe(true);
    expect(demoPackLocked(iris.id)).toBe(false);
    expect(demoPackStatusLabel(jillian.id)).toBe("Locked");
    expect(demoPackStatusLabel(iris.id)).toBe("Draft");
    expect(jillian.fictional).toBe(true);
    expect(iris.fictional).toBe(true);
  });

  it("gives Jillian min-12 shipped refs so Locked is product-real, and Iris stays below lock", () => {
    expect(demoRefCount(DEMO_PACK_IDS.jillian)).toBeGreaterThanOrEqual(PACK_MIN_REFS);
    expect(demoRefCount(DEMO_PACK_IDS.iris)).toBeLessThan(PACK_MIN_REFS);
    expect(demoRefsForPack(DEMO_PACK_IDS.jillian)).toHaveLength(16);
    expect(demoPackCanTrain(DEMO_PACK_IDS.iris)).toBe(false);
    expect(demoPackCanTrain(DEMO_PACK_IDS.jillian)).toBe(false);
    expect(getDemoPack(DEMO_PACK_IDS.jillian)?.targetRefCount).toBe(PACK_TARGET_REFS);
  });

  it("ships Jillian faces on disk so stub review is not Cast-mark placeholders", () => {
    const refs = demoRefsForPack(DEMO_PACK_IDS.jillian);
    const library = demoLibraryStills();
    expect(refs.every((row) => row.hasAsset)).toBe(true);
    expect(library.every((row) => row.hasAsset && row.packName === "Jillian")).toBe(true);
    for (const still of [...refs, ...library]) {
      expect(existsSync(resolve(process.cwd(), demoStillRepoPath(still)))).toBe(true);
    }
    expect(existsSync(resolve(process.cwd(), DEMO_ASSET_DIR, DEMO_LANDING_HERO_FILE))).toBe(true);
    expect(existsSync(resolve(process.cwd(), DEMO_ASSET_DIR, DEMO_JILLIAN_AVATAR_FILE))).toBe(true);
    expect(demoRefsForPack(DEMO_PACK_IDS.iris).every((row) => row.hasAsset)).toBe(false);
  });

  it("uses valid media ids and preview paths the Library can render", () => {
    const library = demoLibraryStills();
    expect(library.length).toBeGreaterThanOrEqual(8);
    for (const still of library) {
      expect(parseMediaId(still.id)).toBe(still.id);
      expect(isDemoStillId(still.id)).toBe(true);
      expect(demoPreviewUrl(still.id)).toBe(`/api/media/${still.id}`);
      expect(still.packName).toBe("Jillian");
      expect(still.kind).toBe("still");
    }
    expect(demoPackPreviewUrl(DEMO_PACK_IDS.jillian)).toMatch(/^\/api\/media\//);
    expect(demoClientFields(DEMO_PACK_IDS.jillian)).toMatchObject({ demo: true, demoState: "locked" });
    expect(demoClientFields(DEMO_PACK_IDS.iris)).toMatchObject({ demo: true, demoState: "draft" });
    expect(isDemoPackId("not-a-pack")).toBe(false);
    expect(getDemoStill("missing")).toBeUndefined();
  });

  it("keeps Iris starters on the contact-sheet path without locking the pack", () => {
    const starters = demoStartersForPack(DEMO_PACK_IDS.iris);
    expect(starters.length).toBeGreaterThan(0);
    expect(starters.some((row) => row.selected)).toBe(true);
    expect(starters.some((row) => !row.selected)).toBe(true);
    expect(starters.every((row) => row.starterPresetId)).toBe(true);
  });

  it("documents Jillian drop paths and keeps Iris as a Draft stub", () => {
    const seed = demoSeedPayload();
    expect(seed.seeded).toBe(true);
    expect(seed.assetDrop.directory).toBe(DEMO_ASSET_DIR);
    expect(seed.assetDrop.stills).toBe(DEMO_STILL_DROP_DIR);
    expect(seed.assetDrop.expected.jillian.min).toBe(PACK_MIN_REFS);
    expect(seed.assetDrop.expected.jillian.target).toBe(PACK_TARGET_REFS);
    expect(seed.assetDrop.expected.jillian.shippedRefs).toBe(16);
    expect(seed.assetDrop.files.some((file) => file.startsWith("refs/jillian/"))).toBe(true);
    expect(seed.assetDrop.files.some((file) => file.startsWith("stills/jillian/"))).toBe(true);
    expect(seed.assetDrop.files.some((file) => file.includes("iris/"))).toBe(true);
    expect(seed.assetDrop.files.some((file) => file.startsWith("mara/") || file.includes("/mara/"))).toBe(
      false,
    );
    expect(DEMO_SEED_NOTE).toMatch(/fictional/i);
    expect(DEMO_SEED_NOTE).toMatch(/no real-person/i);
  });

  it("uses fictional-only product copy", () => {
    for (const text of [
      DEMO_PACK_FICTIONAL_COPY,
      DEMO_PACK_LOCKED_COPY,
      DEMO_PACK_DRAFT_COPY,
      DEMO_PACK_READ_ONLY_MESSAGE,
      DEMO_PACK_CREATE_MESSAGE,
      DEMO_LIBRARY_COPY,
      LIBRARY_EMPTY_BODY,
      LIBRARY_DETAIL_EMPTY_BODY,
      TEST_GRID_FICTIONAL_COPY,
    ]) {
      expect(demoCopyIsFictionalOnly(text)).toBe(true);
      expect(text).not.toMatch(/celebrity|deepfake|upload a (photo|face) of yourself/i);
    }
  });

  it("does not reopen age or legal copy", () => {
    expect(AGE_ATTEST_COPY).toBe("I confirm I am 18+.");
  });
});
