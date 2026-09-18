import type { ChipFamily } from "@/lib/chips";

export type ThumbFamily = ChipFamily | "starter-face" | "starter-body" | "character";

export type ChipThumbSpec = {
  id: string;
  family: ThumbFamily;
  label: string;
  /** CSS gradient for the 1:1 abstract field. */
  field: string;
  /** Simple geometric overlay key — never photographic, never a body. */
  mark:
    | "stand"
    | "sit"
    | "recline"
    | "three-quarter"
    | "over-shoulder"
    | "contrapposto"
    | "tailored"
    | "robe"
    | "knit"
    | "evening"
    | "lattice"
    | "drape"
    | "cyc"
    | "loft"
    | "suite"
    | "marble"
    | "night"
    | "dusk"
    | "softbox"
    | "rembrandt"
    | "window"
    | "neon"
    | "candle"
    | "highkey"
    | "athletic"
    | "hourglass"
    | "lean"
    | "solid"
    | "tall"
    | "swatch"
    | "monogram";
};

const POSE: ChipThumbSpec[] = [
  { id: "standing-neutral", family: "pose", label: "Standing", field: "linear-gradient(180deg,#14141c 0%,#0a0a0e 100%)", mark: "stand" },
  { id: "seated", family: "pose", label: "Seated", field: "linear-gradient(180deg,#16131a 0%,#0a0a0e 100%)", mark: "sit" },
  { id: "reclining", family: "pose", label: "Reclining", field: "linear-gradient(90deg,#121018 0%,#0c0c12 100%)", mark: "recline" },
  { id: "three-quarter", family: "pose", label: "Three-quarter", field: "linear-gradient(135deg,#15141c 0%,#0a0a0e 100%)", mark: "three-quarter" },
  { id: "over-shoulder", family: "pose", label: "Over-shoulder", field: "linear-gradient(225deg,#141218 0%,#0a0a0e 100%)", mark: "over-shoulder" },
  { id: "contrapposto", family: "pose", label: "Contrapposto", field: "linear-gradient(180deg,#16141a 0%,#0b0b10 100%)", mark: "contrapposto" },
];

const OUTFIT: ChipThumbSpec[] = [
  { id: "tailored-black", family: "outfit", label: "Tailored black", field: "linear-gradient(180deg,#1a1a20 0%,#0c0c10 100%)", mark: "tailored" },
  { id: "silk-robe", family: "outfit", label: "Silk robe", field: "linear-gradient(160deg,#2a2430 0%,#121018 100%)", mark: "robe" },
  { id: "knit-set", family: "outfit", label: "Knit set", field: "linear-gradient(180deg,#1c1814 0%,#0e0c0a 100%)", mark: "knit" },
  { id: "evening", family: "outfit", label: "Evening", field: "linear-gradient(180deg,#1a1420 0%,#0a0a0e 100%)", mark: "evening" },
  { id: "lingerie", family: "outfit", label: "Lingerie", field: "linear-gradient(180deg,#1c1620 0%,#100e14 100%)", mark: "lattice" },
  { id: "implied-nude", family: "outfit", label: "Implied nude", field: "linear-gradient(180deg,#1a1612 0%,#0c0a08 100%)", mark: "drape" },
];

const SCENE: ChipThumbSpec[] = [
  { id: "cyc-studio", family: "scene", label: "Cyclorama", field: "linear-gradient(180deg,#1c1c22 0%,#0a0a0c 70%)", mark: "cyc" },
  { id: "loft", family: "scene", label: "Loft", field: "linear-gradient(180deg,#242018 0%,#12100c 100%)", mark: "loft" },
  { id: "hotel-suite", family: "scene", label: "Hotel suite", field: "radial-gradient(circle at 30% 40%,#3a2a18 0%,#100c0a 70%)", mark: "suite" },
  { id: "bathroom-marble", family: "scene", label: "Marble bath", field: "linear-gradient(120deg,#2a2a30 0%,#141418 50%,#1c1c22 100%)", mark: "marble" },
  { id: "night-interior", family: "scene", label: "Night interior", field: "radial-gradient(circle at 70% 30%,#2a2218 0%,#07070a 62%)", mark: "night" },
  { id: "outdoor-dusk", family: "scene", label: "Outdoor dusk", field: "linear-gradient(180deg,#2a2018 0%,#1a1418 45%,#0a0a10 100%)", mark: "dusk" },
];

const LIGHTING: ChipThumbSpec[] = [
  { id: "softbox", family: "lighting", label: "Softbox", field: "radial-gradient(circle at 50% 20%,#f4f1ea 0%,#1a1a20 55%,#07070a 100%)", mark: "softbox" },
  { id: "rembrandt", family: "lighting", label: "Rembrandt", field: "linear-gradient(135deg,#c4a574 0%,#1a140c 42%,#07070a 100%)", mark: "rembrandt" },
  { id: "window-light", family: "lighting", label: "Window", field: "linear-gradient(90deg,#d8d0c4 0%,#1c1c22 55%,#07070a 100%)", mark: "window" },
  { id: "neon-practical", family: "lighting", label: "Neon practical", field: "linear-gradient(120deg,#1a2430 0%,#0c0c12 100%)", mark: "neon" },
  { id: "candle-warm", family: "lighting", label: "Candle warm", field: "radial-gradient(circle at 50% 70%,#c4a574 0%,#1a1008 50%,#07070a 100%)", mark: "candle" },
  { id: "high-key", family: "lighting", label: "High key", field: "linear-gradient(180deg,#e8e0d4 0%,#8a8478 100%)", mark: "highkey" },
];

const BODY: ChipThumbSpec[] = [
  { id: "athletic", family: "body", label: "Athletic", field: "linear-gradient(180deg,#16161f 0%,#0a0a0e 100%)", mark: "athletic" },
  { id: "soft-hourglass", family: "body", label: "Soft hourglass", field: "linear-gradient(180deg,#1a161c 0%,#0a0a0e 100%)", mark: "hourglass" },
  { id: "lean", family: "body", label: "Lean", field: "linear-gradient(180deg,#14141a 0%,#0a0a0e 100%)", mark: "lean" },
  { id: "solid", family: "body", label: "Solid", field: "linear-gradient(180deg,#18181f 0%,#0a0a0e 100%)", mark: "solid" },
  { id: "tall", family: "body", label: "Tall", field: "linear-gradient(180deg,#15151c 0%,#0a0a0e 100%)", mark: "tall" },
];

const STARTERS: ChipThumbSpec[] = [
  { id: "face-warm-olive", family: "starter-face", label: "Warm olive", field: "linear-gradient(135deg,#6b5a32 0%,#2a2418 100%)", mark: "swatch" },
  { id: "face-cool-fair", family: "starter-face", label: "Cool fair", field: "linear-gradient(135deg,#c8c4bc 0%,#6a6864 100%)", mark: "swatch" },
  { id: "face-deep-gold", family: "starter-face", label: "Deep gold", field: "linear-gradient(135deg,#8a6a28 0%,#2a1c0c 100%)", mark: "swatch" },
  { id: "face-freckled", family: "starter-face", label: "Freckled", field: "radial-gradient(circle at 30% 30%,#c4a574 0%,#5a4a38 55%,#2a2018 100%)", mark: "swatch" },
  { id: "body-athletic-full", family: "starter-body", label: "Athletic full", field: "linear-gradient(180deg,#16161f 0%,#0a0a0e 100%)", mark: "athletic" },
  { id: "body-soft-full", family: "starter-body", label: "Soft full", field: "linear-gradient(180deg,#1a161c 0%,#0a0a0e 100%)", mark: "hourglass" },
  { id: "body-side-lean", family: "starter-body", label: "Lean profile", field: "linear-gradient(180deg,#14141a 0%,#0a0a0e 100%)", mark: "lean" },
  { id: "body-three-quarter", family: "starter-body", label: "Three-quarter", field: "linear-gradient(180deg,#18181f 0%,#0a0a0e 100%)", mark: "solid" },
];

const ALL: ChipThumbSpec[] = [...POSE, ...OUTFIT, ...SCENE, ...LIGHTING, ...BODY, ...STARTERS];
const BY_ID = new Map(ALL.map((spec) => [spec.id, spec]));

export const CHIP_THUMB_SPECS = ALL;

export function chipThumbSpec(id: string, family?: ThumbFamily, label?: string): ChipThumbSpec {
  const found = BY_ID.get(id);
  if (found) return found;
  return {
    id,
    family: family ?? "character",
    label: label ?? id,
    field: "linear-gradient(180deg,#16161f 0%,#0a0a0e 100%)",
    mark: family === "character" ? "monogram" : "swatch",
  };
}

export function comingSoonLabel(family: ThumbFamily): string {
  if (family === "pose") return "Pose pack coming";
  if (family === "outfit") return "Outfit pack coming";
  if (family === "scene") return "Scene pack coming";
  if (family === "lighting") return "Lighting pack coming";
  if (family === "body") return "Body pack coming";
  return "Pack coming";
}
