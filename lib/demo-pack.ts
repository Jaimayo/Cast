import { PACK_MIN_REFS, PACK_TARGET_REFS } from "@/lib/constants";
import { mediaPreviewPath } from "@/lib/media";
import { isLockedSoul, soulStatusLabel } from "@/lib/soul";

/** Well-known stub review ids (valid UUID v4 shape). Not user rows. */
export const DEMO_PACK_IDS = {
  jillian: "00000000-0000-4000-a000-000000000001",
  iris: "00000000-0000-4000-a000-000000000002",
} as const;

export const DEMO_PACK_SLUGS = {
  [DEMO_PACK_IDS.jillian]: "jillian",
  [DEMO_PACK_IDS.iris]: "iris",
} as const;

export type DemoPackSlug = "jillian" | "iris";
export type DemoPackState = "locked" | "draft";
export type DemoStillKind = "still" | "starter_face" | "starter_body" | "pack_ref";
export type DemoStillRole = "ref" | "library" | "starter";

export type DemoStill = {
  id: string;
  packId: string;
  packName: string;
  slug: DemoPackSlug;
  role: DemoStillRole;
  kind: DemoStillKind;
  label: string;
  slot: number;
  selected: boolean;
  /** Relative to `public/demo/` (refs, stills). Missing files fall back to the champagne tile. */
  dropFile: string;
  /** True when Stage 1 ships a real JPEG/WebP for this tile. */
  hasAsset: boolean;
  starterPresetId: string | null;
};

export type DemoPackDefinition = {
  id: string;
  slug: DemoPackSlug;
  name: string;
  status: "locked" | "draft";
  origin: "generate_then_lock" | "library_train";
  fictional: true;
  demo: true;
  demoState: DemoPackState;
  refCount: number;
  targetRefCount: number;
  minRefCount: number;
  summary: string;
};

export const DEMO_ASSET_DIR = "public/demo";
export const DEMO_REF_DROP_DIR = "public/demo/refs";
export const DEMO_STILL_DROP_DIR = "public/demo/stills";
export const DEMO_REF_DROP_README = "public/demo/refs/README.md";
export const DEMO_JILLIAN_AVATAR_FILE = "jillian-avatar.jpg";
export const DEMO_LANDING_HERO_FILE = "landing/jillian-hero-3x4.jpg";

export const DEMO_PACK_FICTIONAL_COPY = "Fictional adults only. Jillian is Locked. Iris stays a Draft stub.";
export const DEMO_PACK_LOCKED_COPY =
  "Jillian is Locked for stub review. Fictional adult. Use in Create.";
export const DEMO_PACK_DRAFT_COPY =
  "Iris is a Draft demo stub. Need 12 fictional refs to lock Soul ID. Placeholders only.";
export const DEMO_PACK_READ_ONLY_MESSAGE =
  "This fictional demo pack is for stub review. Attach, Train, and lock run on your own pack.";
export const DEMO_PACK_CREATE_MESSAGE =
  "Stub review already includes fictional packs Jillian (Locked) and Iris (Draft). Create your own Character Pack when a database is on.";
export const DEMO_LIBRARY_COPY = "Fictional demo stills for stub review. Jillian faces ship with the catalog.";
export const DEMO_SEED_NOTE =
  "Catalog is already seeded in stub. Jillian Locked fictional refs live under public/demo/refs/jillian/; library stills under public/demo/stills/jillian/. Iris remains a Draft stub. No real-person likeness.";

const JILLIAN_REFS: { file: string; label: string; kind: DemoStillKind }[] = [
  { file: "jillian-01.jpg", label: "Face · Loft", kind: "starter_face" },
  { file: "jillian-02.jpg", label: "Face · Training", kind: "starter_face" },
  { file: "jillian-03.jpg", label: "Face · Quiet", kind: "starter_face" },
  { file: "jillian-04.jpg", label: "Face · Daylight", kind: "starter_face" },
  { file: "jillian-05.jpg", label: "Face · Soft", kind: "starter_face" },
  { file: "jillian-06.jpg", label: "Face · Street", kind: "starter_face" },
  { file: "jillian-07.jpg", label: "Face · Warm", kind: "starter_face" },
  { file: "jillian-08.jpg", label: "Three-quarter · Window", kind: "starter_body" },
  { file: "jillian-09.jpg", label: "Three-quarter · Day", kind: "starter_body" },
  { file: "jillian-10.jpg", label: "Standing · Garden", kind: "starter_body" },
  { file: "jillian-11.jpg", label: "Standing · Interior", kind: "starter_body" },
  { file: "jillian-12.jpg", label: "Full · Fountain", kind: "still" },
  { file: "jillian-13.jpg", label: "Full · Terrace", kind: "still" },
  { file: "jillian-14.jpg", label: "Body · Knit", kind: "starter_body" },
  { file: "jillian-15.jpg", label: "Body · Summer", kind: "starter_body" },
  { file: "jillian-16.jpg", label: "Body · Studio", kind: "starter_body" },
];

const JILLIAN_LIBRARY: { file: string; label: string }[] = [
  { file: "jillian-still-beach-selfie-yellow.jpg", label: "Beach · Sun" },
  { file: "jillian-still-beach-wet-white.jpg", label: "Beach · Surf" },
  { file: "jillian-still-car-knit-seated.jpg", label: "Seated · Drive" },
  { file: "jillian-still-kneeling-cherry.jpg", label: "Kneeling · Bloom" },
  { file: "jillian-still-peach-sheer-robe.jpg", label: "Robe · Peach" },
  { file: "jillian-still-pool-red-onepiece.jpg", label: "Pool · Evening" },
  { file: "jillian-still-poolside-white-bikini.jpg", label: "Poolside" },
  { file: "jillian-still-teal-lounge-bed.jpg", label: "Lounge" },
  { file: "jillian-still-umbrella-festival.jpg", label: "Festival" },
];

const IRIS_REF_LABELS = [
  "Face · Warm olive",
  "Face · Cool fair",
  "Body · Athletic full",
  "Still · Standing",
] as const;

const IRIS_STARTER_LABELS = [
  { label: "Warm olive", presetId: "face-warm-olive", kind: "starter_face" as const, selected: true },
  { label: "Cool fair", presetId: "face-cool-fair", kind: "starter_face" as const, selected: true },
  { label: "Deep gold", presetId: "face-deep-gold", kind: "starter_face" as const, selected: false },
  { label: "Athletic full", presetId: "body-athletic-full", kind: "starter_body" as const, selected: true },
  { label: "Soft full", presetId: "body-soft-full", kind: "starter_body" as const, selected: false },
] as const;

function demoId(n: number): string {
  return `00000000-0000-4000-a000-${n.toString().padStart(12, "0")}`;
}

function still(input: {
  n: number;
  packId: string;
  packName: string;
  slug: DemoPackSlug;
  role: DemoStillRole;
  kind: DemoStillKind;
  label: string;
  slot: number;
  selected: boolean;
  dropFile?: string;
  hasAsset?: boolean;
  starterPresetId?: string | null;
}): DemoStill {
  const folder = input.slug;
  const prefix = input.role === "library" ? "library" : input.role === "starter" ? "starter" : "ref";
  return {
    id: demoId(input.n),
    packId: input.packId,
    packName: input.packName,
    slug: input.slug,
    role: input.role,
    kind: input.kind,
    label: input.label,
    slot: input.slot,
    selected: input.selected,
    dropFile: input.dropFile ?? `refs/${folder}/${prefix}-${String(input.slot).padStart(2, "0")}.webp`,
    hasAsset: input.hasAsset ?? false,
    starterPresetId: input.starterPresetId ?? null,
  };
}

const JILLIAN_REF_STILLS: DemoStill[] = JILLIAN_REFS.map((row, index) =>
  still({
    n: 101 + index,
    packId: DEMO_PACK_IDS.jillian,
    packName: "Jillian",
    slug: "jillian",
    role: "ref",
    kind: row.kind,
    label: row.label,
    slot: index + 1,
    selected: true,
    dropFile: `refs/jillian/${row.file}`,
    hasAsset: true,
  }),
);

const JILLIAN_LIBRARY_STILLS: DemoStill[] = JILLIAN_LIBRARY.map((row, index) =>
  still({
    n: 201 + index,
    packId: DEMO_PACK_IDS.jillian,
    packName: "Jillian",
    slug: "jillian",
    role: "library",
    kind: "still",
    label: row.label,
    slot: index + 1,
    selected: false,
    dropFile: `stills/jillian/${row.file}`,
    hasAsset: true,
  }),
);

const IRIS_REFS: DemoStill[] = IRIS_REF_LABELS.map((label, index) =>
  still({
    n: 301 + index,
    packId: DEMO_PACK_IDS.iris,
    packName: "Iris",
    slug: "iris",
    role: "ref",
    kind: label.startsWith("Body") ? "starter_body" : label.startsWith("Still") ? "still" : "starter_face",
    label,
    slot: index + 1,
    selected: true,
  }),
);

const IRIS_STARTERS: DemoStill[] = IRIS_STARTER_LABELS.map((row, index) =>
  still({
    n: 401 + index,
    packId: DEMO_PACK_IDS.iris,
    packName: "Iris",
    slug: "iris",
    role: "starter",
    kind: row.kind,
    label: row.label,
    slot: index + 1,
    selected: row.selected,
    starterPresetId: row.presetId,
  }),
);

export const DEMO_STILLS: DemoStill[] = [
  ...JILLIAN_REF_STILLS,
  ...JILLIAN_LIBRARY_STILLS,
  ...IRIS_REFS,
  ...IRIS_STARTERS,
];

const stillsById = new Map(DEMO_STILLS.map((row) => [row.id, row]));
const packsById = new Map<string, DemoPackDefinition>();

export const DEMO_PACKS: DemoPackDefinition[] = [
  {
    id: DEMO_PACK_IDS.jillian,
    slug: "jillian",
    name: "Jillian",
    status: "locked",
    origin: "generate_then_lock",
    fictional: true,
    demo: true,
    demoState: "locked",
    refCount: JILLIAN_REF_STILLS.length,
    targetRefCount: PACK_TARGET_REFS,
    minRefCount: PACK_MIN_REFS,
    summary: DEMO_PACK_LOCKED_COPY,
  },
  {
    id: DEMO_PACK_IDS.iris,
    slug: "iris",
    name: "Iris",
    status: "draft",
    origin: "generate_then_lock",
    fictional: true,
    demo: true,
    demoState: "draft",
    refCount: IRIS_REFS.length,
    targetRefCount: PACK_TARGET_REFS,
    minRefCount: PACK_MIN_REFS,
    summary: DEMO_PACK_DRAFT_COPY,
  },
];

for (const pack of DEMO_PACKS) {
  packsById.set(pack.id, pack);
}

/** Stub product-review only. Live never injects demo packs. */
export function shouldServeDemoPacks(input: { providerMode: string }): boolean {
  return input.providerMode === "stub";
}

export function isDemoPackId(packId: string | null | undefined): boolean {
  return Boolean(packId && packsById.has(packId));
}

export function isDemoStillId(mediaId: string | null | undefined): boolean {
  return Boolean(mediaId && stillsById.has(mediaId));
}

export function getDemoPack(packId: string): DemoPackDefinition | undefined {
  return packsById.get(packId);
}

export function getDemoStill(mediaId: string): DemoStill | undefined {
  return stillsById.get(mediaId);
}

export function listDemoPacks(): DemoPackDefinition[] {
  return DEMO_PACKS;
}

export function demoRefsForPack(packId: string): DemoStill[] {
  return DEMO_STILLS.filter((row) => row.packId === packId && row.role === "ref");
}

export function demoLibraryStills(): DemoStill[] {
  return DEMO_STILLS.filter((row) => row.role === "library");
}

export function demoStartersForPack(packId: string): DemoStill[] {
  return DEMO_STILLS.filter((row) => row.packId === packId && row.role === "starter");
}

export function demoPreviewUrl(stillId: string): string {
  return mediaPreviewPath(stillId);
}

export function demoPackPreviewUrl(packId: string): string | null {
  const first = demoRefsForPack(packId)[0];
  return first ? demoPreviewUrl(first.id) : null;
}

export function demoStillRepoPath(still: Pick<DemoStill, "dropFile">): string {
  return `${DEMO_ASSET_DIR}/${still.dropFile}`;
}

/** Client fields so Locked vs Draft demo chrome survives getPack → publicPack. */
export function demoClientFields(packId: string): {
  demo: true;
  demoState: DemoPackState;
  previewUrl: string | null;
  summary: string;
} | null {
  const pack = getDemoPack(packId);
  if (!pack) return null;
  return {
    demo: true,
    demoState: pack.demoState,
    previewUrl: demoPackPreviewUrl(packId),
    summary: pack.summary,
  };
}

export function demoRefCount(packId: string): number {
  return getDemoPack(packId)?.refCount ?? 0;
}

export function demoPackCanTrain(packId: string): boolean {
  const pack = getDemoPack(packId);
  if (!pack) return false;
  return pack.demoState === "draft" && pack.refCount >= pack.minRefCount;
}

export function demoPackLocked(packId: string): boolean {
  const pack = getDemoPack(packId);
  return Boolean(pack && isLockedSoul(pack.status));
}

export function demoPackStatusLabel(packId: string) {
  const pack = getDemoPack(packId);
  return pack ? soulStatusLabel(pack.status) : "Draft";
}

export function demoSeedPayload() {
  return {
    seeded: true as const,
    fictional: true as const,
    note: DEMO_SEED_NOTE,
    assetDrop: {
      directory: DEMO_ASSET_DIR,
      refs: DEMO_REF_DROP_DIR,
      stills: DEMO_STILL_DROP_DIR,
      readme: DEMO_REF_DROP_README,
      hero: `${DEMO_ASSET_DIR}/${DEMO_LANDING_HERO_FILE}`,
      avatar: `${DEMO_ASSET_DIR}/${DEMO_JILLIAN_AVATAR_FILE}`,
      expected: {
        jillian: { min: PACK_MIN_REFS, target: PACK_TARGET_REFS, shippedRefs: JILLIAN_REF_STILLS.length },
        iris: { min: 8, target: PACK_TARGET_REFS },
      },
      files: DEMO_STILLS.map((row) => row.dropFile),
    },
    packs: DEMO_PACKS.map((pack) => ({
      id: pack.id,
      name: pack.name,
      slug: pack.slug,
      status: pack.status,
      demoState: pack.demoState,
      refCount: pack.refCount,
      previewUrl: demoPackPreviewUrl(pack.id),
      summary: pack.summary,
    })),
    libraryCount: demoLibraryStills().length,
  };
}

const REAL_PERSON_COPY = /real person|real-person|celebrity|public figure|likeness of|deepfake|face upload/i;

export function demoCopyIsFictionalOnly(text: string): boolean {
  if (REAL_PERSON_COPY.test(text) && !/not a real|no real-person|not a celebrity/i.test(text)) {
    return false;
  }
  return /fictional/i.test(text);
}
