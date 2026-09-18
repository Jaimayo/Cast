import type { ChipFamily } from "@/lib/chips";

export type ChipSwatch = {
  from: string;
  to: string;
};

const FAMILY_BASE: Record<ChipFamily, { h: number; s: number }> = {
  pose: { h: 36, s: 26 },
  outfit: { h: 268, s: 16 },
  scene: { h: 228, s: 14 },
  lighting: { h: 42, s: 30 },
  body: { h: 158, s: 14 },
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
  const base = FAMILY_BASE[family];
  const hue = (base.h + (hash % 10) - 4 + 360) % 360;
  const hue2 = (hue + 12) % 360;
  return {
    from: `hsl(${hue} ${base.s}% ${16 + (hash % 5)}%)`,
    to: `hsl(${hue2} ${Math.max(10, base.s - 6)}% ${9 + ((hash >> 4) % 4)}%)`,
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
