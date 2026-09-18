import { FICTIONAL_ADULT_CONSTRAINT } from "@/lib/constants";
import { requireChip, type Chip } from "@/lib/chips";
import { requireStarterPreset } from "@/lib/starters";

export type ComposerSelectionInput = {
  characterPackName: string;
  /** Opaque pack id included so identity is bound, not described as a real person. */
  characterPackId: string;
  poseChipId: string;
  outfitChipId: string;
  sceneChipId: string;
  lightingChipId: string;
  bodyChipId?: string | null;
};

export type CompiledPrompt = {
  prompt: string;
  negativePrompt: string;
  chips: {
    pose: Chip;
    outfit: Chip;
    scene: Chip;
    lighting: Chip;
    body?: Chip;
  };
};

const NEGATIVE =
  "child, minor, underage, age-ambiguous, teen, school, real person, celebrity, public figure, photoid, deepfake, watermark, text, extra limbs, mutated hands";

function assertName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Character pack is required");
  }
  if (trimmed.length > 80) {
    throw new Error("Character pack name is too long");
  }
  return trimmed;
}

/**
 * Maps Composer chips → hidden prompt. The UI must never expose this string.
 * No camera family is accepted; there is no Advanced panel input.
 */
export function compileComposerPrompt(input: ComposerSelectionInput): CompiledPrompt {
  const name = assertName(input.characterPackName);
  if (!input.characterPackId.trim()) {
    throw new Error("Character pack is required");
  }

  const pose = requireChip(input.poseChipId, "pose");
  const outfit = requireChip(input.outfitChipId, "outfit");
  const scene = requireChip(input.sceneChipId, "scene");
  const lighting = requireChip(input.lightingChipId, "lighting");
  const body = input.bodyChipId ? requireChip(input.bodyChipId, "body") : undefined;

  const parts = [
    FICTIONAL_ADULT_CONSTRAINT,
    `consistent synthetic character "${name}" (pack ${input.characterPackId})`,
    `pose: ${pose.fragment}`,
    `wardrobe: ${outfit.fragment}`,
    `scene: ${scene.fragment}`,
    `lighting: ${lighting.fragment}`,
  ];

  if (body) {
    parts.push(`body lock: ${body.fragment}`);
  }

  parts.push("still photograph, single hero frame, no camera move, no video");

  return {
    prompt: parts.join(". ") + ".",
    negativePrompt: NEGATIVE,
    chips: { pose, outfit, scene, lighting, ...(body ? { body } : {}) },
  };
}

export function compileStarterPrompt(input: {
  characterPackName: string;
  characterPackId: string;
  presetId: string;
}): { prompt: string; negativePrompt: string } {
  const name = assertName(input.characterPackName);
  const preset = requireStarterPreset(input.presetId);
  const view = preset.kind === "face" ? "identity contact-sheet still" : "body-proportion reference still";

  return {
    prompt: [
      FICTIONAL_ADULT_CONSTRAINT,
      `training reference for synthetic character "${name}" (pack ${input.characterPackId})`,
      view,
      preset.fragment,
      "neutral expression, identity-stable, no wardrobe drama, no cinematic camera language",
    ].join(". ") + ".",
    negativePrompt: NEGATIVE,
  };
}
