export const APP_NAME = "Cast";

/** Character Pack reference counts (Soul ID). Stage 1 lock. */
export const PACK_MIN_REFS = 12;
export const PACK_TARGET_REFS = 20;

/** Fictional reference pictures — file picker only (no camera). */
export const PACK_REF_MAX_BYTES = 8 * 1024 * 1024;
export const PACK_REF_ACCEPT = ["image/jpeg", "image/png", "image/webp"] as const;
export const PACK_REF_ACCEPT_ATTR = "image/jpeg,image/png,image/webp";

export const SESSION_COOKIE = "cast_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
/** Remint the signed cookie when less than half the TTL remains. */
export const SESSION_REFRESH_REMAINING_SECONDS = Math.floor(SESSION_TTL_SECONDS / 2);

/**
 * R2/S3 presigned GET lifetime. Studio never ships a permanent public object URL.
 * `<img>` tags load `/api/media/:id` (invite + age session). That route remints a
 * GET after this TTL so an expired preview refreshes without exposing bucket keys.
 */
export const MEDIA_PRESIGN_TTL_SECONDS = 120;

export const JOB_QUEUES = {
  generateStill: "generateStill",
  trainPack: "trainPack",
  deadLetter: "castDeadLetter",
} as const;

export const FICTIONAL_ADULT_CONSTRAINT =
  "wholly fictional adult human, unmistakably 21 years or older, not a real or identifiable person, not a celebrity or public figure, consensual staging";
