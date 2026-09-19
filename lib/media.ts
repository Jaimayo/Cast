import { publicAdapterFields, readAdapterIdentity, type AdapterSource, type AdapterStatus } from "@/lib/adapter-identity";
import { MEDIA_PRESIGN_TTL_SECONDS } from "@/lib/constants";
import { jobCancelState } from "@/lib/job-cancel";
import { jobAgeSeconds, jobAttemptCount, userSafeLastError } from "@/lib/job-errors";

export { MEDIA_PRESIGN_TTL_SECONDS };

export const MEDIA_PREVIEW_HEADERS = {
  "Cache-Control": "private, no-store",
} as const;

export const MEDIA_AUTH_ERRORS = {
  signInRequired: "Sign in required",
  sessionRevoked: "Session revoked",
  ageRequired: "Age attestation required",
  notFound: "Media not found",
} as const;

/** Same-origin studio preview path. The media route auth-checks, then streams or 302s to a short-lived R2 GET. */
export function mediaPreviewPath(mediaId: string): string {
  const id = parseMediaId(mediaId);
  if (!id) {
    throw new Error("Invalid media id");
  }
  return `/api/media/${encodeURIComponent(id)}`;
}

/** Reject traversal, storage keys, and empty ids before any DB or bucket lookup. */
export function parseMediaId(mediaId: string): string | null {
  const id = mediaId.trim();
  if (!id || id.includes("/") || id.includes("..") || id.includes("\\") || id.includes("\0")) {
    return null;
  }
  return id;
}

/**
 * Media-route session gate. Missing/invalid/expired cookie → 401.
 * Cookie is valid but the user row is gone (signed-out leftover / deleted account) → 403.
 * Signed in without 18+ → 403. Does not change invite/session cookies themselves.
 */
export function classifyMediaSession(input: {
  sessionUserId: string | null;
  user: { id: string; ageAttestedAt: Date | string | null } | null;
  /** Cookie verified but the user row could not be loaded (deleted account / DB miss). */
  userLookupFailed?: boolean;
}): { ok: true; userId: string } | { ok: false; status: 401 | 403; error: string } {
  if (!input.sessionUserId) {
    return { ok: false, status: 401, error: MEDIA_AUTH_ERRORS.signInRequired };
  }
  if (input.userLookupFailed || !input.user || input.user.id !== input.sessionUserId) {
    return { ok: false, status: 403, error: MEDIA_AUTH_ERRORS.sessionRevoked };
  }
  if (!input.user.ageAttestedAt) {
    return { ok: false, status: 403, error: MEDIA_AUTH_ERRORS.ageRequired };
  }
  return { ok: true, userId: input.user.id };
}

export function mediaIdFromPreviewSrc(src: string): string | null {
  try {
    const url = new URL(src, "http://cast.local");
    const match = url.pathname.match(/^\/api\/media\/([^/]+)$/);
    return match?.[1] ? parseMediaId(decodeURIComponent(match[1])) : null;
  } catch {
    return null;
  }
}

/** One cache-bust retry through `/api/media/:id`. After that the tile shows “Preview unavailable”. */
export function stillPreviewRetrySrc(src: string, alreadyRefreshed: boolean, nowMs = Date.now()): string | null {
  if (alreadyRefreshed) {
    return null;
  }
  const mediaId = mediaIdFromPreviewSrc(src);
  if (!mediaId) {
    return null;
  }
  return mediaPreviewRefreshPath(mediaId, nowMs);
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

export type MediaPreviewDecision =
  | { ok: false; status: 401 | 403 | 404; error: string }
  | { ok: true; storageKey: string; mimeType: string };

/**
 * Auth + ownership + id checks for `/api/media/:id`.
 * Cross-user access is 404 (do not advertise that someone else's still exists).
 */
export function decideMediaPreview(input: {
  sessionUserId: string | null;
  user: { id: string; ageAttestedAt: Date | string | null } | null;
  mediaId: string;
  asset: {
    userId: string;
    storageKey: string;
    mimeType?: string | null;
    packOwnerId?: string | null;
    jobOwnerId?: string | null;
  } | null;
}): MediaPreviewDecision {
  const auth = classifyMediaSession({ sessionUserId: input.sessionUserId, user: input.user });
  if (!auth.ok) {
    return auth;
  }
  if (!parseMediaId(input.mediaId)) {
    return { ok: false, status: 404, error: MEDIA_AUTH_ERRORS.notFound };
  }
  const asset = input.asset;
  if (
    !asset ||
    !canAccessMedia({
      viewerId: auth.userId,
      assetUserId: asset.userId,
      packOwnerId: asset.packOwnerId,
      jobOwnerId: asset.jobOwnerId,
    })
  ) {
    return { ok: false, status: 404, error: MEDIA_AUTH_ERRORS.notFound };
  }
  return {
    ok: true,
    storageKey: asset.storageKey,
    mimeType: asset.mimeType || "image/webp",
  };
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
  errorCode: string | null;
  errorMessage: string | null;
  cancelSupported: boolean;
  cancelDisabledReason: string | null;
};

export function publicJob<
  T extends {
    resultAssetKey?: string | null;
    previewUrl?: string | null;
    createdAt?: Date | string | null;
    attemptsMade?: number | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    inputJson?: unknown;
    providerJobId?: string | null;
  },
>(
  job: T,
  options: { now?: Date } = {},
): Omit<T, "resultAssetKey" | "attemptsMade" | "inputJson" | "providerJobId" | "errorCode" | "errorMessage"> &
  PublicJobFields {
  const now = options.now ?? new Date();
  const { resultAssetKey, attemptsMade, inputJson, providerJobId, errorCode, errorMessage, ...rest } = job;
  void resultAssetKey;
  void attemptsMade;
  void inputJson;
  void providerJobId;
  const safeMessage = userSafeLastError(errorCode, errorMessage);
  const safeCode = errorCode ?? null;
  const kind = "kind" in job && typeof job.kind === "string" ? job.kind : "";
  const status = "status" in job && typeof job.status === "string" ? job.status : "";
  const cancel = jobCancelState({ kind, status });
  return {
    ...rest,
    previewUrl: job.previewUrl ?? null,
    ageSeconds: jobAgeSeconds(job.createdAt, now),
    attemptCount: jobAttemptCount(attemptsMade),
    lastErrorCode: safeCode,
    lastError: safeMessage,
    errorCode: safeCode,
    errorMessage: safeMessage,
    cancelSupported: cancel.cancelSupported,
    cancelDisabledReason: cancel.cancelDisabledReason,
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
