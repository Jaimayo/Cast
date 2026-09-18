import { FICTIONAL_ADULT_CONSTRAINT } from "@/lib/constants";
import { requireChip, type Chip } from "@/lib/chips";
import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import { requireStarterPreset } from "@/lib/starters";

export type ComposerSelectionInput = {
  characterPackName: string;
  characterPackId: string;
  poseChipId: string;
  outfitChipId?: string | null;
  sceneChipId?: string | null;
  lightingChipId?: string | null;
  bodyChipId?: string | null;
};

export type CompiledPrompt = {
  prompt: string;
  negativePrompt: string;
  chips: {
    pose: Chip;
    outfit?: Chip;
    scene?: Chip;
    lighting?: Chip;
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

function optionalChip(id: string | null | undefined, family: Chip["family"]): Chip | undefined {
  if (!id) {
    return undefined;
  }
  return requireChip(id, family);
}

/**
 * Maps Composer chips → hidden prompt. The UI must never expose this string.
 * Character + Pose required. Outfit/Scene/Lighting/Body optional.
 * No camera family; no Advanced panel input.
 */
export function compileComposerPrompt(input: ComposerSelectionInput): CompiledPrompt {
  const name = assertName(input.characterPackName);
  if (!input.characterPackId.trim()) {
    throw new Error("Character pack is required");
  }
  if (!input.poseChipId?.trim()) {
    throw new JobError({ code: JOB_ERROR_CODES.POSE_REQUIRED, retryable: false });
  }

  const pose = requireChip(input.poseChipId, "pose");
  const outfit = optionalChip(input.outfitChipId, "outfit");
  const scene = optionalChip(input.sceneChipId, "scene");
  const lighting = optionalChip(input.lightingChipId, "lighting");
  const body = optionalChip(input.bodyChipId, "body");

  const parts = [
    FICTIONAL_ADULT_CONSTRAINT,
    `consistent synthetic character "${name}" (pack ${input.characterPackId})`,
    `pose: ${pose.fragment}`,
  ];
  if (outfit) parts.push(`wardrobe: ${outfit.fragment}`);
  if (scene) parts.push(`scene: ${scene.fragment}`);
  if (lighting) parts.push(`lighting: ${lighting.fragment}`);
  if (body) parts.push(`body lock: ${body.fragment}`);
  parts.push("still photograph, single hero frame, no camera move, no video");

  return {
    prompt: parts.join(". ") + ".",
    negativePrompt: NEGATIVE,
    chips: {
      pose,
      ...(outfit ? { outfit } : {}),
      ...(scene ? { scene } : {}),
      ...(lighting ? { lighting } : {}),
      ...(body ? { body } : {}),
    },
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
    prompt:
      [
        FICTIONAL_ADULT_CONSTRAINT,
        `training reference for synthetic character "${name}" (pack ${input.characterPackId})`,
        view,
        preset.fragment,
        "neutral expression, identity-stable, no wardrobe drama, no cinematic camera language",
      ].join(". ") + ".",
    negativePrompt: NEGATIVE,
  };
}
