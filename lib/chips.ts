export type ChipFamily = "pose" | "outfit" | "scene" | "lighting" | "body";

export type Chip = {
  id: string;
  family: ChipFamily;
  label: string;
  /** Hidden prompt fragment. Never shown in the Composer UI. */
  fragment: string;
};

function family(familyName: ChipFamily, rows: Array<[string, string, string]>): Chip[] {
  return rows.map(([id, label, fragment]) => ({ id, family: familyName, label, fragment }));
}

/** Composer chips only. Face/body *vibes* live in `lib/starters.ts`, not here. */
export const POSE_CHIPS: Chip[] = family("pose", [
  ["standing-neutral", "Standing", "standing upright, full-body, even weight, relaxed shoulders"],
  ["seated", "Seated", "seated on a chair, torso upright, knees together, hands resting"],
  ["reclining", "Reclining", "reclining on a surface, elongated pose, one knee bent"],
  ["three-quarter", "Three-quarter", "three-quarter view, weight on the back leg, chin slightly turned"],
  ["over-shoulder", "Over-shoulder", "looking back over one shoulder, torso twisted, eye contact"],
  ["contrapposto", "Contrapposto", "contrapposto stance, hip shift, one leg engaged"],
  ["kneeling", "Kneeling", "kneeling on a surface, upright torso, hands resting on thighs"],
  ["leaning-wall", "Leaning", "leaning against a wall, one shoulder planted, crossed ankles"],
]);

export const OUTFIT_CHIPS: Chip[] = family("outfit", [
  ["tailored-black", "Tailored black", "tailored black outfit, clean lines, studio wardrobe"],
  ["silk-robe", "Silk robe", "silk robe, loosely belted, fashion-editorial styling"],
  ["knit-set", "Knit set", "fine-knit matching set, fitted but not restrictive"],
  ["evening", "Evening", "eveningwear, refined fabric, adult fashion photography"],
  ["lingerie", "Lingerie", "adult lingerie, tasteful styling, clearly adult subject"],
  ["implied-nude", "Implied nude", "implied nude with strategic drape, adult figure study, no pornographic staging"],
  ["satin-slip", "Satin slip", "satin slip dress, bias cut, adult evening at-home styling"],
  ["white-shirt", "White shirt", "oversized white shirt, open collar, clean studio wardrobe"],
]);

export const SCENE_CHIPS: Chip[] = family("scene", [
  ["cyc-studio", "Cyclorama", "seamless cyclorama studio, minimal set, no clutter"],
  ["loft", "Loft", "industrial loft interior, large windows, concrete and linen"],
  ["hotel-suite", "Hotel suite", "dim hotel suite, warm lamps, rumpled fine linens"],
  ["bathroom-marble", "Marble bath", "marble bathroom, steam, soft reflections"],
  ["night-interior", "Night interior", "night interior, practical lights, shallow depth of field"],
  ["outdoor-dusk", "Outdoor dusk", "outdoor dusk, private garden, golden residual light"],
  ["rooftop-night", "Rooftop night", "private rooftop at night, distant city bokeh, no street-level public"],
  ["reading-nook", "Reading nook", "quiet reading nook, warm wood, low lamp, intimate interior"],
]);

export const LIGHTING_CHIPS: Chip[] = family("lighting", [
  ["softbox", "Softbox", "large softbox key light, gentle wrap, low contrast"],
  ["rembrandt", "Rembrandt", "rembrandt lighting, triangular cheek highlight, dramatic but clean"],
  ["window-light", "Window", "natural window light, soft falloff, subtle fill"],
  ["neon-practical", "Neon practical", "colored practical neon, cinematic color contrast"],
  ["candle-warm", "Candle warm", "warm practical candlelight, amber highlights, deep shadows"],
  ["high-key", "High key", "high-key lighting, bright even exposure, fashion look"],
  ["rim-light", "Rim light", "subtle rim light, edge highlight on hair and shoulders, dark fill"],
  ["moonlight", "Moonlight", "cool moonlight through a window, silver highlights, quiet contrast"],
]);

/** Optional. Not a camera control — body-shape lock language only. */
export const BODY_CHIPS: Chip[] = family("body", [
  ["athletic", "Athletic", "athletic adult build, defined shoulders, long lines"],
  ["soft-hourglass", "Soft hourglass", "soft hourglass adult proportions, fuller hips, natural waist"],
  ["lean", "Lean", "lean adult frame, narrow hips, long limbs"],
  ["solid", "Solid", "solid adult build, broader torso, grounded stance"],
  ["tall", "Tall", "tall adult stature, elongated torso-to-leg line"],
  ["curvy", "Curvy", "curvy adult proportions, full hip, natural waist, clearly adult"],
  ["compact", "Compact", "compact adult frame, shorter stature, clearly adult proportions"],
  ["broad", "Broad", "broad adult shoulders, strong back, grounded presence"],
]);

export const COMPOSER_CHIPS: Record<ChipFamily, Chip[]> = {
  pose: POSE_CHIPS,
  outfit: OUTFIT_CHIPS,
  scene: SCENE_CHIPS,
  lighting: LIGHTING_CHIPS,
  body: BODY_CHIPS,
};

const byId = new Map<string, Chip>(
  [...POSE_CHIPS, ...OUTFIT_CHIPS, ...SCENE_CHIPS, ...LIGHTING_CHIPS, ...BODY_CHIPS].map((chip) => [
    chip.id,
    chip,
  ]),
);

export function getChip(id: string): Chip | undefined {
  return byId.get(id);
}

export function requireChip(id: string, familyName: ChipFamily): Chip {
  const chip = byId.get(id);
  if (!chip) {
    throw new Error(`Unknown chip: ${id}`);
  }
  if (chip.family !== familyName) {
    throw new Error(`Chip ${id} is family ${chip.family}, expected ${familyName}`);
  }
  return chip;
}
