/**
 * Composer still frame. Not a prompt chip and not a camera control —
 * output size only. Default is 3:4 portrait (matches the Hero Frame canvas).
 */
export const STILL_ASPECT_IDS = ["3:4", "1:1", "9:16", "16:9"] as const;
export type StillAspectId = (typeof STILL_ASPECT_IDS)[number];

export const DEFAULT_STILL_ASPECT_ID: StillAspectId = "3:4";

export type StillAspect = {
  id: StillAspectId;
  /** Product label on the Frame chips. */
  label: string;
  /** CSS `aspect-ratio` value, e.g. "3 / 4". */
  cssRatio: string;
  /** Pixel size for SDXL / Venice pixel models. Longest side 1024. */
  width: number;
  height: number;
};

export const STILL_ASPECTS: StillAspect[] = [
  { id: "3:4", label: "3:4 Portrait", cssRatio: "3 / 4", width: 768, height: 1024 },
  { id: "1:1", label: "1:1 Square", cssRatio: "1 / 1", width: 1024, height: 1024 },
  { id: "9:16", label: "9:16 Tall", cssRatio: "9 / 16", width: 576, height: 1024 },
  { id: "16:9", label: "16:9 Wide", cssRatio: "16 / 9", width: 1024, height: 576 },
];

const byId = new Map<StillAspectId, StillAspect>(STILL_ASPECTS.map((aspect) => [aspect.id, aspect]));

export function isStillAspectId(value: unknown): value is StillAspectId {
  return typeof value === "string" && byId.has(value as StillAspectId);
}

export function getStillAspect(id: StillAspectId): StillAspect {
  const aspect = byId.get(id);
  if (!aspect) {
    throw new Error(`Unknown still aspect: ${id}`);
  }
  return aspect;
}

/** Unknown or empty → default 3:4. Never throws. */
export function stillAspectFromUnknown(value: unknown): StillAspectId {
  return isStillAspectId(value) ? value : DEFAULT_STILL_ASPECT_ID;
}

export function stillPixelSize(id: StillAspectId): { width: number; height: number } {
  const aspect = getStillAspect(id);
  return { width: aspect.width, height: aspect.height };
}

/** Worker / enqueue: read job inputJson.aspectRatio, default 3:4. */
export function stillGenerateSize(inputJson: Record<string, unknown> | null | undefined): {
  aspectRatio: StillAspectId;
  width: number;
  height: number;
} {
  const aspectRatio = stillAspectFromUnknown(inputJson?.aspectRatio);
  const { width, height } = stillPixelSize(aspectRatio);
  return { aspectRatio, width, height };
}

export function composerHeroEmptyCopy(aspect: StillAspect): string {
  return `Hero Frame · ${aspect.label}. Generate to fill this canvas.`;
}
