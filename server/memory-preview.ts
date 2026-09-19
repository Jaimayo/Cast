import "server-only";

import type { CharacterPack, GenerationJob, User } from "@/db/schema";
import {
  DEMO_DRAFT_PACK_NAME,
  DEMO_DRAFT_REF_COUNT,
  DEMO_LOCKED_PACK_NAME,
  DEMO_LOCKED_REF_COUNT,
} from "@/lib/demo-pack";
import { publicJob, publicPack } from "@/lib/media";
import { isMemoryPreviewMode, previewPackId } from "@/lib/memory-preview";
import type { SessionPayload } from "@/lib/session-cookie";
import { getEnv } from "@/server/env";

export function isMemoryPreview(): boolean {
  const env = getEnv();
  return isMemoryPreviewMode({ providerMode: env.providerMode, databaseUrl: env.databaseUrl });
}

export function previewUserFromSession(payload: SessionPayload): User {
  const now = new Date();
  const role = payload.role === "admin" ? "admin" : "consumer";
  return {
    id: payload.sub,
    email: payload.email ?? `preview+${payload.sub.replaceAll("-", "").slice(0, 8)}@cast.review`,
    passwordHash: "preview",
    role,
    ageAttestedAt: payload.age ? now : null,
    createdAt: now,
    updatedAt: now,
  };
}

function previewPack(userId: string, slot: "locked" | "draft"): CharacterPack {
  const now = new Date();
  const locked = slot === "locked";
  return {
    id: previewPackId(userId, slot),
    userId,
    name: locked ? DEMO_LOCKED_PACK_NAME : DEMO_DRAFT_PACK_NAME,
    origin: "generate_then_lock",
    status: locked ? "locked" : "draft",
    fictionalAttestation: true,
    lockedAt: locked ? now : null,
    trainedAt: null,
    providerJobId: null,
    adapterStorageKey: null,
    adapterMimeType: null,
    adapterMeta: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function previewPacksForUser(userId: string): CharacterPack[] {
  return [previewPack(userId, "locked"), previewPack(userId, "draft")];
}

export function previewPackForUser(userId: string, packId: string): CharacterPack | null {
  return previewPacksForUser(userId).find((pack) => pack.id === packId) ?? null;
}

export function previewRefCount(pack: Pick<CharacterPack, "status">): number {
  return pack.status === "locked" || pack.status === "ready" ? DEMO_LOCKED_REF_COUNT : DEMO_DRAFT_REF_COUNT;
}

export function publicPreviewPacks(userId: string) {
  return previewPacksForUser(userId).map((pack) => publicPack({ ...pack, refCount: previewRefCount(pack) }));
}

export function previewSucceededStillJob(input: {
  userId: string;
  jobId?: string;
  characterPackId: string;
}): GenerationJob {
  const now = new Date();
  return {
    id: input.jobId ?? crypto.randomUUID(),
    userId: input.userId,
    kind: "generate_still",
    status: "succeeded",
    provider: "venice",
    characterPackId: input.characterPackId,
    recipeId: crypto.randomUUID(),
    inputJson: { source: "composer", preview: true },
    resultAssetKey: null,
    errorCode: null,
    errorMessage: null,
    attemptsMade: 1,
    providerJobId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function publicPreviewJob(input: {
  userId: string;
  jobId?: string;
  characterPackId: string;
}) {
  return publicJob({ ...previewSucceededStillJob(input), previewUrl: null });
}
