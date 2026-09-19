import { describe, expect, it } from "vitest";
import {
  COMPOSER_DRAFT_STORAGE_KEY,
  parseComposerDraft,
  pickKnownChipId,
  readComposerDraft,
  writeComposerDraft,
} from "@/lib/composer-draft";

describe("composer draft (session/stub memory)", () => {
  it("defaults Frame to 3:4 and drops empty ids", () => {
    expect(parseComposerDraft(null)).toBeNull();
    expect(parseComposerDraft({ poseChipId: "standing-neutral", aspectRatio: "16:9" })).toEqual({
      characterPackId: undefined,
      poseChipId: "standing-neutral",
      outfitChipId: undefined,
      sceneChipId: undefined,
      lightingChipId: undefined,
      bodyChipId: undefined,
      aspectRatio: "16:9",
    });
    expect(parseComposerDraft({ aspectRatio: "nope", poseChipId: "  " })?.aspectRatio).toBe("3:4");
  });

  it("round-trips through storage without throwing", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    writeComposerDraft(storage, {
      poseChipId: "seated",
      outfitChipId: "silk-robe",
      aspectRatio: "9:16",
    });
    expect(store.get(COMPOSER_DRAFT_STORAGE_KEY)).toContain("9:16");
    expect(readComposerDraft(storage)).toMatchObject({
      poseChipId: "seated",
      outfitChipId: "silk-robe",
      aspectRatio: "9:16",
    });
    expect(readComposerDraft(null)).toBeNull();
  });

  it("only restores chip ids that still exist", () => {
    const pose = [{ id: "standing-neutral" }, { id: "seated" }];
    expect(pickKnownChipId("seated", pose, pose[0]?.id ?? "")).toBe("seated");
    expect(pickKnownChipId("gone", pose, pose[0]?.id ?? "")).toBe("standing-neutral");
    expect(pickKnownChipId(undefined, pose)).toBe("");
  });
});
