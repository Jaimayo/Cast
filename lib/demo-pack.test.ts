import { describe, expect, it } from "vitest";
import { AGE_ATTEST_COPY } from "@/lib/age-attest";
import { PACK_MIN_REFS, PACK_TARGET_REFS } from "@/lib/constants";
import {
  DEMO_LIBRARY_COPY,
  DEMO_PACK_CREATE_MESSAGE,
  DEMO_PACK_DRAFT_COPY,
  DEMO_PACK_FICTIONAL_COPY,
  DEMO_PACK_IDS,
  DEMO_PACK_LOCKED_COPY,
  DEMO_PACK_READ_ONLY_MESSAGE,
  DEMO_REF_DROP_DIR,
  DEMO_SEED_NOTE,
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
  getDemoPack,
  getDemoStill,
  isDemoPackId,
  isDemoStillId,
  listDemoPacks,
  shouldServeDemoPacks,
} from "@/lib/demo-pack";
import { parseMediaId } from "@/lib/media";
import { isLockedSoul } from "@/lib/soul";

describe("stub demo Character Packs", () => {
  it("only appears in stub / REVIEW — never live", () => {
    expect(shouldServeDemoPacks({ providerMode: "stub" })).toBe(true);
    expect(shouldServeDemoPacks({ providerMode: "live" })).toBe(false);
  });

  it("stocks Mara Locked and Iris Draft with fictional names only", () => {
    const packs = listDemoPacks();
    expect(packs.map((pack) => pack.name)).toEqual(["Mara", "Iris"]);
    const mara = getDemoPack(DEMO_PACK_IDS.mara)!;
    const iris = getDemoPack(DEMO_PACK_IDS.iris)!;
    expect(mara.demoState).toBe("locked");
    expect(iris.demoState).toBe("draft");
    expect(isLockedSoul(mara.status)).toBe(true);
    expect(isLockedSoul(iris.status)).toBe(false);
    expect(demoPackLocked(mara.id)).toBe(true);
    expect(demoPackLocked(iris.id)).toBe(false);
    expect(demoPackStatusLabel(mara.id)).toBe("Locked");
    expect(demoPackStatusLabel(iris.id)).toBe("Draft");
    expect(mara.fictional).toBe(true);
    expect(iris.fictional).toBe(true);
  });

  it("gives Mara min-12 refs so Locked is product-real, and Iris stays below lock", () => {
    expect(demoRefCount(DEMO_PACK_IDS.mara)).toBe(PACK_MIN_REFS);
    expect(demoRefCount(DEMO_PACK_IDS.iris)).toBeLessThan(PACK_MIN_REFS);
    expect(demoRefsForPack(DEMO_PACK_IDS.mara)).toHaveLength(PACK_MIN_REFS);
    expect(demoPackCanTrain(DEMO_PACK_IDS.iris)).toBe(false);
    expect(demoPackCanTrain(DEMO_PACK_IDS.mara)).toBe(false);
    expect(getDemoPack(DEMO_PACK_IDS.mara)?.targetRefCount).toBe(PACK_TARGET_REFS);
  });

  it("uses valid media ids and preview paths the Library can render", () => {
    const library = demoLibraryStills();
    expect(library.length).toBeGreaterThanOrEqual(8);
    for (const still of library) {
      expect(parseMediaId(still.id)).toBe(still.id);
      expect(isDemoStillId(still.id)).toBe(true);
      expect(demoPreviewUrl(still.id)).toBe(`/api/media/${still.id}`);
      expect(still.packName).toBe("Mara");
      expect(still.kind).toBe("still");
    }
    expect(demoPackPreviewUrl(DEMO_PACK_IDS.mara)).toMatch(/^\/api\/media\//);
    expect(demoClientFields(DEMO_PACK_IDS.mara)).toMatchObject({ demo: true, demoState: "locked" });
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

  it("documents a drop path for 8–20 fictional Soul ID refs later", () => {
    const seed = demoSeedPayload();
    expect(seed.seeded).toBe(true);
    expect(seed.assetDrop.directory).toBe(DEMO_REF_DROP_DIR);
    expect(seed.assetDrop.expected.mara.min).toBe(PACK_MIN_REFS);
    expect(seed.assetDrop.expected.mara.target).toBe(PACK_TARGET_REFS);
    expect(seed.assetDrop.files.some((file) => file.startsWith("mara/"))).toBe(true);
    expect(seed.assetDrop.files.some((file) => file.startsWith("iris/"))).toBe(true);
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
    ]) {
      expect(demoCopyIsFictionalOnly(text)).toBe(true);
      expect(text).not.toMatch(/celebrity|deepfake|upload a (photo|face) of yourself/i);
    }
  });

  it("does not reopen age or legal copy", () => {
    expect(AGE_ATTEST_COPY).toBe("I confirm I am 18+.");
  });
});
