/**
 * Path 1 face/body vibes.
 * These are Generate-starters, NOT Composer templates. Results land on TrainingSetAssets.
 */

export type StarterKind = "face" | "body";

export type StarterPreset = {
  id: string;
  kind: StarterKind;
  label: string;
  /** Hidden generation brief. Not a Composer chip. */
  fragment: string;
};

export const FACE_STARTERS: StarterPreset[] = [
  {
    id: "face-warm-olive",
    kind: "face",
    label: "Warm olive",
    fragment:
      "tight head-and-shoulders portrait, warm olive skin, dark brown eyes, soft oval face, adult bone structure",
  },
  {
    id: "face-cool-fair",
    kind: "face",
    label: "Cool fair",
    fragment:
      "tight portrait, cool fair skin, pale grey-green eyes, high cheekbones, adult face, no celebrity likeness",
  },
  {
    id: "face-deep-gold",
    kind: "face",
    label: "Deep gold",
    fragment:
      "tight portrait, deep golden-brown skin, dark eyes, full lips, strong adult jaw, fictional identity",
  },
  {
    id: "face-freckled",
    kind: "face",
    label: "Freckled",
    fragment:
      "tight portrait, light skin with freckles, hazel eyes, slightly upturned nose, adult features",
  },
];

export const BODY_STARTERS: StarterPreset[] = [
  {
    id: "body-athletic-full",
    kind: "body",
    label: "Athletic full",
    fragment:
      "neutral full-body standing reference, athletic adult build, even studio lighting, front view, arms relaxed",
  },
  {
    id: "body-soft-full",
    kind: "body",
    label: "Soft full",
    fragment:
      "neutral full-body standing reference, soft adult hourglass, even studio lighting, front view",
  },
  {
    id: "body-side-lean",
    kind: "body",
    label: "Lean profile",
    fragment:
      "neutral full-body side reference, lean adult frame, even studio lighting, true profile, arms down",
  },
  {
    id: "body-three-quarter",
    kind: "body",
    label: "Three-quarter",
    fragment:
      "neutral three-quarter full-body reference, solid adult build, even lighting, body-proportion sheet",
  },
];

export const STARTER_PRESETS: StarterPreset[] = [...FACE_STARTERS, ...BODY_STARTERS];

const byId = new Map(STARTER_PRESETS.map((preset) => [preset.id, preset]));

export function getStarterPreset(id: string): StarterPreset | undefined {
  return byId.get(id);
}

export function requireStarterPreset(id: string, kind?: StarterKind): StarterPreset {
  const preset = byId.get(id);
  if (!preset) {
    throw new Error(`Unknown starter preset: ${id}`);
  }
  if (kind && preset.kind !== kind) {
    throw new Error(`Starter ${id} is ${preset.kind}, expected ${kind}`);
  }
  return preset;
}
