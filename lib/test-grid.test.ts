import { describe, expect, it } from "vitest";
import { getChip } from "@/lib/chips";
import { compileComposerPrompt } from "@/lib/prompt-compiler";
import { canQueueTestGrid, canRetrainPack, TEST_GRID_SELECTIONS, TEST_GRID_SIZE } from "@/lib/test-grid";

describe("Test grid + Retrain gates", () => {
  it("queues Test grid and Retrain only for Locked packs", () => {
    expect(canQueueTestGrid("locked")).toBe(true);
    expect(canQueueTestGrid("ready")).toBe(true);
    expect(canQueueTestGrid("draft")).toBe(false);
    expect(canQueueTestGrid("training")).toBe(false);
    expect(canQueueTestGrid("failed")).toBe(false);

    expect(canRetrainPack("locked")).toBe(true);
    expect(canRetrainPack("ready")).toBe(true);
    expect(canRetrainPack("draft")).toBe(false);
    expect(canRetrainPack("training")).toBe(false);
  });

  it("is a small Composer still set with real chips", () => {
    expect(TEST_GRID_SIZE).toBeGreaterThanOrEqual(3);
    expect(TEST_GRID_SIZE).toBeLessThanOrEqual(6);
    expect(new Set(TEST_GRID_SELECTIONS.map((row) => row.poseChipId)).size).toBe(TEST_GRID_SIZE);

    for (const row of TEST_GRID_SELECTIONS) {
      expect(getChip(row.poseChipId)?.family).toBe("pose");
      expect(getChip(row.outfitChipId)?.family).toBe("outfit");
      expect(getChip(row.sceneChipId)?.family).toBe("scene");
      expect(getChip(row.lightingChipId)?.family).toBe("lighting");
      const compiled = compileComposerPrompt({
        characterPackName: "Mara",
        characterPackId: "pack_123",
        ...row,
      });
      expect(compiled.prompt).toContain("wholly fictional adult human");
      expect(compiled.prompt).not.toMatch(/dolly|orbit|crane/i);
    }
  });
});
