import { describe, expect, it } from "vitest";
import { AGE_ATTEST_COPY } from "@/lib/age-attest";
import { getChip } from "@/lib/chips";
import { compileComposerPrompt } from "@/lib/prompt-compiler";
import { DEFAULT_STILL_ASPECT_ID } from "@/lib/still-aspect";
import {
  TEST_GRID_ASPECT_ID,
  TEST_GRID_EMPTY_COPY,
  TEST_GRID_FICTIONAL_COPY,
  TEST_GRID_SELECTIONS,
  TEST_GRID_SIZE,
  canQueueTestGrid,
  canRetrainPack,
  emptyTestGridCells,
  isTestGridJob,
  mergeTestGridJobs,
  poseChipIdFromInput,
  stillSourceFromInput,
  testGridCellsFromJobs,
  testGridPoseLabel,
} from "@/lib/test-grid";

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

  it("uses Frame 3:4 and fictional-only identity-check copy", () => {
    expect(TEST_GRID_ASPECT_ID).toBe(DEFAULT_STILL_ASPECT_ID);
    expect(TEST_GRID_ASPECT_ID).toBe("3:4");
    expect(TEST_GRID_FICTIONAL_COPY).toMatch(/fictional/i);
    expect(TEST_GRID_FICTIONAL_COPY).toMatch(/3:4/);
    expect(TEST_GRID_FICTIONAL_COPY).not.toMatch(/celebrity|deepfake|upload a (photo|face) of yourself/i);
    expect(TEST_GRID_EMPTY_COPY).toMatch(/3:4/);
    expect(emptyTestGridCells()).toHaveLength(TEST_GRID_SIZE);
    expect(emptyTestGridCells().every((cell) => cell.aspectId === "3:4" && cell.state === "empty")).toBe(true);
    expect(emptyTestGridCells().map((cell) => cell.poseLabel)).toEqual([
      "Standing",
      "Seated",
      "Three-quarter",
      "Over-shoulder",
    ]);
  });

  it("whitelists stillSource and known pose chips only", () => {
    expect(stillSourceFromInput({ source: "test_grid", compiledPrompt: "secret pose" })).toBe("test_grid");
    expect(stillSourceFromInput({ source: "composer" })).toBe("composer");
    expect(stillSourceFromInput({ source: "demo" })).toBe("demo");
    expect(stillSourceFromInput({ source: "venice-secret" })).toBeNull();
    expect(stillSourceFromInput({ compiledPrompt: "secret pose" })).toBeNull();
    expect(poseChipIdFromInput({ poseChipId: "seated", compiledPrompt: "secret pose" })).toBe("seated");
    expect(poseChipIdFromInput({ poseChipId: "not-a-chip" })).toBeNull();
    expect(poseChipIdFromInput({ outfitChipId: "tailored-black" })).toBeNull();
    expect(testGridPoseLabel("standing-neutral")).toBe("Standing");
  });

  it("maps the latest Test grid job onto each pose cell", () => {
    const packId = "pack-mara";
    const older = {
      id: "old",
      kind: "generate_still",
      status: "queued" as const,
      characterPackId: packId,
      stillSource: "test_grid",
      poseChipId: "seated",
      previewUrl: null,
      createdAt: "2026-09-19T10:00:00.000Z",
    };
    const newer = {
      id: "new",
      kind: "generate_still",
      status: "succeeded" as const,
      characterPackId: packId,
      stillSource: "test_grid",
      poseChipId: "seated",
      previewUrl: "/api/media/asset-1",
      createdAt: "2026-09-19T10:01:00.000Z",
    };
    const composer = {
      id: "composer",
      kind: "generate_still",
      status: "succeeded" as const,
      characterPackId: packId,
      stillSource: "composer",
      poseChipId: "standing-neutral",
      previewUrl: "/api/media/asset-2",
      createdAt: "2026-09-19T10:02:00.000Z",
    };
    expect(isTestGridJob(composer)).toBe(false);
    const merged = mergeTestGridJobs([older], [newer, composer], packId);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("new");

    const kept = mergeTestGridJobs([newer], [], packId);
    expect(kept[0]?.id).toBe("new");

    const cells = testGridCellsFromJobs([newer], packId);
    expect(cells.find((cell) => cell.poseChipId === "seated")).toMatchObject({
      state: "succeeded",
      previewUrl: "/api/media/asset-1",
      aspectId: "3:4",
    });
    expect(cells.filter((cell) => cell.state === "empty")).toHaveLength(3);
  });

  it("does not reopen age copy", () => {
    expect(AGE_ATTEST_COPY).toBe("I confirm I am 18+.");
  });
});
