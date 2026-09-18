import { publicAdapterFields, readAdapterIdentity, type AdapterSource, type AdapterStatus } from "@/lib/adapter-identity";
import { MEDIA_PRESIGN_TTL_SECONDS } from "@/lib/constants";
import { jobAgeSeconds, jobAttemptCount, userSafeLastError } from "@/lib/job-errors";

export { MEDIA_PRESIGN_TTL_SECONDS };

/** Same-origin studio preview path. The media route auth-checks, then streams or 302s to a short-lived R2 GET. */
export function mediaPreviewPath(mediaId: string): string {
  const id = mediaId.trim();
  if (!id || id.includes("/") || id.includes("..") || id.includes("\\") || id.includes("\0")) {
    throw new Error("Invalid media id");
  }
  return `/api/media/${encodeURIComponent(id)}`;
}

/** Cache-busted same-origin URL so an expired R2 redirect is fetched through `/api/media/:id` again. */
export function mediaPreviewRefreshPath(mediaId: string, nowMs = Date.now()): string {
  return `${mediaPreviewPath(mediaId)}?r=${nowMs}`;
}

export function clampPresignTtlSeconds(requested?: number): number {
  if (requested === undefined || !Number.isFinite(requested) || requested <= 0) {
    return MEDIA_PRESIGN_TTL_SECONDS;
  }
  return Math.min(Math.floor(requested), MEDIA_PRESIGN_TTL_SECONDS);
}

export function previewExpiresAt(nowMs = Date.now(), ttlSeconds = MEDIA_PRESIGN_TTL_SECONDS): Date {
  return new Date(nowMs + clampPresignTtlSeconds(ttlSeconds) * 1000);
}

export function isPreviewExpired(expiresAt: Date | string | number, nowMs = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= nowMs;
}

/**
 * Own-asset check. A still/ref is visible if the viewer owns the row, or owns the
 * pack / generation job it is attached to. Missing pack/job owners never grant access.
 */
export function canAccessMedia(input: {
  viewerId: string;
  assetUserId: string;
  packOwnerId?: string | null;
  jobOwnerId?: string | null;
}): boolean {
  if (!input.viewerId) {
    return false;
  }
  if (input.assetUserId === input.viewerId) {
    return true;
  }
  if (input.packOwnerId && input.packOwnerId === input.viewerId) {
    return true;
  }
  if (input.jobOwnerId && input.jobOwnerId === input.viewerId) {
    return true;
  }
  return false;
}

export function publicPack<
  T extends {
    adapterStorageKey?: string | null;
    adapterMimeType?: string | null;
    adapterMeta?: unknown;
    providerJobId?: string | null;
    adapterId?: string | null;
    adapterStatus?: string | null;
    adapterSource?: string | null;
  },
>(
  pack: T,
): Omit<
  T,
  | "adapterStorageKey"
  | "adapterMimeType"
  | "adapterMeta"
  | "providerJobId"
  | "adapterId"
  | "adapterStatus"
  | "adapterSource"
> & {
  hasAdapter: boolean;
  adapterStatus: AdapterStatus;
  adapterSource: AdapterSource | null;
} {
  const {
    adapterStorageKey,
    adapterMimeType,
    adapterMeta,
    providerJobId,
    adapterId,
    adapterStatus,
    adapterSource,
    ...rest
  } = pack;
  const identity = readAdapterIdentity({
    adapterId,
    adapterStorageKey,
    adapterStatus,
    adapterSource,
    adapterMimeType,
    adapterMeta:
      adapterMeta && typeof adapterMeta === "object" && !Array.isArray(adapterMeta)
        ? (adapterMeta as Record<string, unknown>)
        : null,
    providerJobId,
  });
  return { ...rest, ...publicAdapterFields(identity) };
}

export type PublicJobFields = {
  previewUrl: string | null;
  ageSeconds: number;
  attemptCount: number;
  lastErrorCode: string | null;
  lastError: string | null;
};

export function publicJob<
  T extends {
    resultAssetKey?: string | null;
    previewUrl?: string | null;
    createdAt?: Date | string | null;
    attemptsMade?: number | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  },
>(job: T, options: { now?: Date } = {}): Omit<T, "resultAssetKey" | "attemptsMade"> & PublicJobFields {
  const now = options.now ?? new Date();
  const { resultAssetKey, attemptsMade, ...rest } = job;
  void resultAssetKey;
  return {
    ...rest,
    previewUrl: job.previewUrl ?? null,
    ageSeconds: jobAgeSeconds(job.createdAt, now),
    attemptCount: jobAttemptCount(attemptsMade),
    lastErrorCode: job.errorCode ?? null,
    lastError: userSafeLastError(job.errorCode, job.errorMessage),
  };
}

export function publicMediaAsset<T extends { id: string; storageKey?: string }>(
  asset: T,
): Omit<T, "storageKey"> & { previewUrl: string; previewExpiresInSeconds: number } {
  const { storageKey, ...rest } = asset;
  void storageKey;
  return {
    ...rest,
    previewUrl: mediaPreviewPath(asset.id),
    previewExpiresInSeconds: MEDIA_PRESIGN_TTL_SECONDS,
  };
}
