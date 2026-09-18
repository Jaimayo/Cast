export const APP_NAME = "Cast";

/** Character Pack reference counts (Soul ID). Stage 1 lock. */
export const PACK_MIN_REFS = 12;
export const PACK_TARGET_REFS = 20;

export const SESSION_COOKIE = "cast_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

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
