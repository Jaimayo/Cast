import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { CharacterPack } from "@/db/schema";
import {
  DEMO_PACK_CREATE_MESSAGE,
  DEMO_ASSET_DIR,
  DEMO_PACK_IDS,
  DEMO_PACK_READ_ONLY_MESSAGE,
  demoLibraryStills,
  demoJobId,
  demoClientFields,
  demoPackPreviewUrl,
  demoPreviewUrl,
  demoRefCount,
  demoRefsForPack,
  demoStartersForPack,
  getDemoPack,
  getDemoStill,
  isDemoPackId,
  isDemoStillId,
  listDemoPacks,
  shouldServeDemoPacks,
  type DemoPackDefinition,
  type DemoStill,
} from "@/lib/demo-pack";
import { demoPlaceholderSvg } from "@/lib/demo-placeholder";
import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import { publicJob, publicPack } from "@/lib/media";
import { MEDIA_PRESIGN_TTL_SECONDS } from "@/lib/constants";
import { TEST_GRID_ASPECT_ID, TEST_GRID_SELECTIONS } from "@/lib/test-grid";
import { getEnv } from "@/server/env";

const DEMO_CREATED_AT = new Date("2026-09-01T12:00:00.000Z");

type DemoPublicJob = {
  id: string;
  kind: string;
  status: string;
  characterPackId?: string | null;
  previewUrl?: string | null;
  stillSource?: string | null;
  poseChipId?: string | null;
  createdAt?: Date | string | null;
};

/** Stub review only: Test grid / Generate jobs returned from POST, so Jobs + the sheet can poll. */
const demoSessionJobs = new Map<string, DemoPublicJob[]>();

export function rememberDemoGenerateJobs(userId: string, jobs: DemoPublicJob[]) {
  const existing = demoSessionJobs.get(userId) ?? [];
  demoSessionJobs.set(userId, [...jobs, ...existing].slice(0, 24));
}

export function servingDemoPacks(): boolean {
  return shouldServeDemoPacks({ providerMode: getEnv().providerMode });
}

export function demoPackReadOnlyError(): JobError {
  return new JobError({
    code: JOB_ERROR_CODES.INVALID_PACK_STATE,
    userMessage: DEMO_PACK_READ_ONLY_MESSAGE,
    retryable: false,
  });
}

export function demoPackCreateError(): JobError {
  return new JobError({
    code: JOB_ERROR_CODES.INVALID_PACK_STATE,
    userMessage: DEMO_PACK_CREATE_MESSAGE,
    retryable: false,
  });
}

export function assertDemoPackMutable(packId: string): void {
  if (servingDemoPacks() && isDemoPackId(packId)) {
    throw demoPackReadOnlyError();
  }
}

function toCharacterPack(userId: string, pack: DemoPackDefinition): CharacterPack {
  const locked = pack.status === "locked";
  return {
    id: pack.id,
    userId,
    name: pack.name,
    origin: pack.origin,
    status: pack.status,
    fictionalAttestation: true,
    lockedAt: locked ? DEMO_CREATED_AT : null,
    trainedAt: locked ? DEMO_CREATED_AT : null,
    providerJobId: locked ? `stub-train-${pack.slug}` : null,
    adapterId: locked ? `stub-train-${pack.slug}` : null,
    adapterStorageKey: locked ? `adapters/stub/${pack.id}.lora` : null,
    adapterMimeType: locked ? "application/octet-stream" : null,
    adapterStatus: locked ? "ready" : "none",
    adapterSource: locked ? "stub" : null,
    adapterMeta: locked ? { stub: true, demo: true, fictional: true } : null,
    createdAt: DEMO_CREATED_AT,
    updatedAt: DEMO_CREATED_AT,
  };
}

export function toPublicPack<T extends Parameters<typeof publicPack>[0] & { id: string }>(pack: T) {
  const extra = servingDemoPacks() ? demoClientFields(pack.id) : null;
  return extra ? { ...publicPack(pack), ...extra } : publicPack(pack);
}

export function publicDemoPack(userId: string, pack: DemoPackDefinition) {
  return toPublicPack({
    ...toCharacterPack(userId, pack),
    refCount: pack.refCount,
  });
}

export function listPublicDemoPacks(userId: string) {
  return listDemoPacks().map((pack) => publicDemoPack(userId, pack));
}

export function getDemoCharacterPack(userId: string, packId: string): CharacterPack | null {
  if (!servingDemoPacks()) return null;
  const pack = getDemoPack(packId);
  return pack ? toCharacterPack(userId, pack) : null;
}

export function listPublicDemoRefs(packId: string) {
  return demoRefsForPack(packId).map((row) => ({
    id: row.id,
    kind: row.kind,
    source: row.kind === "still" ? ("in_app_still" as const) : ("generate_starter" as const),
    starterPresetId: row.starterPresetId,
    mediaAssetId: row.id,
    sortOrder: row.slot,
    createdAt: DEMO_CREATED_AT,
    previewUrl: demoPreviewUrl(row.id),
    label: row.label,
    demo: true as const,
  }));
}

export function listPublicDemoLibraryStills() {
  return demoLibraryStills().map((row) => ({
    id: row.id,
    kind: "still" as const,
    previewUrl: demoPreviewUrl(row.id),
    previewExpiresInSeconds: MEDIA_PRESIGN_TTL_SECONDS,
    label: row.label,
    packName: row.packName,
    demo: true as const,
    hasAsset: row.hasAsset,
    createdAt: DEMO_CREATED_AT.toISOString(),
    aspectRatio: "3:4" as const,
  }));
}

export function listPublicDemoStarters(packId: string) {
  return demoStartersForPack(packId).map((row) => ({
    id: row.id,
    createdAt: DEMO_CREATED_AT,
    presetId: row.starterPresetId,
    vibeKind: row.kind === "starter_body" ? "body" : "face",
    selected: row.selected,
    previewUrl: demoPreviewUrl(row.id),
    previewExpiresInSeconds: MEDIA_PRESIGN_TTL_SECONDS,
    label: row.label,
    demo: true as const,
  }));
}

/** Distinct from demoJobId (500 + slot) so Jobs detail does not resolve a Still. */
export const DEMO_TRAIN_JOB_ID = "00000000-0000-4000-a000-000000000701";

export function listPublicDemoJobs(userId: string) {
  const stills = demoLibraryStills()
    .slice(0, 3)
    .map((still, index) =>
      publicJob({
        id: demoJobId(still),
        userId,
        kind: "generate_still" as const,
        status: "succeeded" as const,
        provider: "venice" as const,
        characterPackId: still.packId,
        recipeId: null,
        inputJson: { source: "demo", poseChipId: "standing-neutral" },
        resultAssetKey: null,
        errorCode: null,
        errorMessage: null,
        attemptsMade: 1,
        providerJobId: `stub-demo-${still.slot}`,
        createdAt: new Date(DEMO_CREATED_AT.getTime() + index * 60_000),
        updatedAt: DEMO_CREATED_AT,
        previewUrl: demoPreviewUrl(still.id),
      }),
    );
  // Jillian is already Locked in stub. Surface that Train row so Jobs can group Still vs Train
  // without filling Test grid cells or changing the demo pack catalog.
  const train = publicJob({
    id: DEMO_TRAIN_JOB_ID,
    userId,
    kind: "train_pack" as const,
    status: "succeeded" as const,
    characterPackId: DEMO_PACK_IDS.jillian,
    recipeId: null,
    inputJson: { source: "demo" },
    resultAssetKey: null,
    errorCode: null,
    errorMessage: null,
    attemptsMade: 1,
    createdAt: new Date(DEMO_CREATED_AT.getTime() - 60_000),
    updatedAt: DEMO_CREATED_AT,
    previewUrl: null,
  });
  return [...(demoSessionJobs.get(userId) ?? []), ...stills, train];
}

export function demoGenerateStillJob(input: {
  userId: string;
  packId: string;
  poseChipId: string;
  source?: "demo" | "test_grid";
}) {
  const library = demoLibraryStills();
  const poseIndex = TEST_GRID_SELECTIONS.findIndex((row) => row.poseChipId === input.poseChipId);
  const still = library[poseIndex >= 0 ? poseIndex : 0]!;
  const source = input.source ?? "demo";
  const job = publicJob({
    id: randomUUID(),
    userId: input.userId,
    kind: "generate_still" as const,
    status: "succeeded" as const,
    provider: "venice" as const,
    characterPackId: input.packId,
    recipeId: null,
    inputJson: { source, poseChipId: input.poseChipId, aspectRatio: TEST_GRID_ASPECT_ID },
    resultAssetKey: null,
    errorCode: null,
    errorMessage: null,
    attemptsMade: 1,
    providerJobId: "stub-demo-generate",
    createdAt: new Date(),
    updatedAt: new Date(),
    previewUrl: demoPreviewUrl(still.id),
  });
  if (source === "test_grid") {
    rememberDemoGenerateJobs(input.userId, [job]);
  }
  return { job, recipeId: "00000000-0000-4000-a000-000000006001" };
}

function mimeForDrop(file: string): string {
  const ext = extname(file).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/svg+xml";
}

export async function readDemoStillBytes(
  mediaId: string,
): Promise<{ body: Buffer; mimeType: string } | null> {
  const still = getDemoStill(mediaId);
  if (!still) return null;
  try {
    const path = join(process.cwd(), DEMO_ASSET_DIR, still.dropFile);
    const body = await readFile(path);
    if (body.byteLength > 0) {
      return { body, mimeType: mimeForDrop(still.dropFile) };
    }
  } catch {
    /* Catalog tiles stay champagne placeholders until fictional refs are dropped. */
  }
  return {
    body: Buffer.from(demoPlaceholderSvg(still)),
    mimeType: "image/svg+xml",
  };
}

export { isDemoPackId, isDemoStillId, demoRefCount, getDemoPack, getDemoStill };
