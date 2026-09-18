import { describe, expect, it } from "vitest";
import { compileComposerPrompt, compileStarterPrompt } from "@/lib/prompt-compiler";
import { FICTIONAL_ADULT_CONSTRAINT } from "@/lib/constants";

const base = {
  characterPackName: "Mara",
  characterPackId: "pack_123",
  poseChipId: "standing-neutral",
  outfitChipId: "tailored-black",
  sceneChipId: "cyc-studio",
  lightingChipId: "softbox",
};

describe("compileComposerPrompt", () => {
  it("maps chips to a hidden prompt with fictional-adult lock and character identity", () => {
    const compiled = compileComposerPrompt(base);

    expect(compiled.prompt).toContain(FICTIONAL_ADULT_CONSTRAINT);
    expect(compiled.prompt).toContain('consistent synthetic character "Mara" (pack pack_123)');
    expect(compiled.prompt).toContain("pose: standing upright");
    expect(compiled.prompt).toContain("wardrobe: tailored black outfit");
    expect(compiled.prompt).toContain("scene: seamless cyclorama studio");
    expect(compiled.prompt).toContain("lighting: large softbox key light");
    expect(compiled.prompt).toContain("still photograph");
    expect(compiled.prompt).toContain("no camera move");
    expect(compiled.prompt).not.toMatch(/dolly|orbit|crane/i);
    expect(compiled.chips.pose.id).toBe("standing-neutral");
  });

  it("includes optional body lock and omits it when unset", () => {
    const withBody = compileComposerPrompt({ ...base, bodyChipId: "athletic" });
    expect(withBody.prompt).toContain("body lock: athletic adult build");
    expect(withBody.chips.body?.id).toBe("athletic");

    const without = compileComposerPrompt({ ...base, bodyChipId: null });
    expect(without.prompt).not.toContain("body lock:");
    expect(without.chips.body).toBeUndefined();
  });

  it("rejects a missing character pack", () => {
    expect(() => compileComposerPrompt({ ...base, characterPackName: "  " })).toThrow(
      /Character pack is required/,
    );
    expect(() => compileComposerPrompt({ ...base, characterPackId: "" })).toThrow(
      /Character pack is required/,
    );
  });

  it("rejects unknown chips and cross-family ids", () => {
    expect(() => compileComposerPrompt({ ...base, poseChipId: "not-a-chip" })).toThrow(/Unknown chip/);
    expect(() => compileComposerPrompt({ ...base, poseChipId: "softbox" })).toThrow(/expected pose/);
  });

  it("always includes a negative prompt that blocks minors and real-person likeness", () => {
    const compiled = compileComposerPrompt(base);
    expect(compiled.negativePrompt).toMatch(/child/i);
    expect(compiled.negativePrompt).toMatch(/celebrity/i);
    expect(compiled.negativePrompt).toMatch(/deepfake/i);
  });
});

describe("compileStarterPrompt", () => {
  it("compiles face/body vibes as training refs, not composer templates", () => {
    const face = compileStarterPrompt({
      characterPackName: "Mara",
      characterPackId: "pack_123",
      presetId: "face-warm-olive",
    });
    expect(face.prompt).toContain("training reference");
    expect(face.prompt).toContain("identity contact-sheet still");
    expect(face.prompt).toContain("warm olive skin");

    const body = compileStarterPrompt({
      characterPackName: "Mara",
      characterPackId: "pack_123",
      presetId: "body-athletic-full",
    });
    expect(body.prompt).toContain("body-proportion reference still");
  });
});
