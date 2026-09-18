import type { ChipFamily } from "@/lib/chips";

export type ChipSwatch = {
  from: string;
  to: string;
  glow: string;
};

const FAMILY_HUE: Record<ChipFamily, number> = {
  pose: 32,
  outfit: 348,
  scene: 210,
  lighting: 42,
  body: 152,
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function chipSwatch(family: ChipFamily, id: string): ChipSwatch {
  const hash = hashString(`${family}:${id}`);
  const hue = (FAMILY_HUE[family] + (hash % 18) - 6 + 360) % 360;
  const hue2 = (hue + 16 + (hash % 10)) % 360;
  const sat = 22 + (hash % 10);
  const sat2 = 18 + ((hash >> 3) % 12);
  return {
    from: `hsl(${hue} ${sat}% ${18 + (hash % 6)}%)`,
    to: `hsl(${hue2} ${sat2}% ${10 + ((hash >> 4) % 5)}%)`,
    glow: `hsla(${hue} 40% 60% / 0.28)`,
  };
}

export function packSwatch(seed: string): ChipSwatch {
  return chipSwatch("pose", seed);
}

export function emptyCatalogCopy(family: ChipFamily): string {
  const labels: Record<ChipFamily, string> = {
    pose: "Pose pack coming",
    outfit: "Outfit pack coming",
    scene: "Scene pack coming",
    lighting: "Lighting pack coming",
    body: "Body pack coming",
  };
  return labels[family];
}

export const CHIP_FAMILIES: ChipFamily[] = ["pose", "outfit", "scene", "lighting", "body"];
