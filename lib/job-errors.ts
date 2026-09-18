import { LOCK_SOUL_ID_FIRST } from "@/lib/soul";

/** BullMQ attempts for generateStill / generate_starter. */
export const GENERATE_STILL_MAX_ATTEMPTS = 5;
export const GENERATE_STILL_BACKOFF_MS = 2_000;

/** BullMQ attempts for trainPack enqueue/status (poll continuation is a separate delayed job). */
export const TRAIN_PACK_MAX_ATTEMPTS = 5;
export const TRAIN_PACK_BACKOFF_MS = 3_000;

export const JOB_ERROR_CODES = {
  JOB_NOT_FOUND: "JOB_NOT_FOUND",
  PACK_NOT_FOUND: "PACK_NOT_FOUND",
  PACK_NOT_LOCKED: "PACK_NOT_LOCKED",
  INVALID_CHIP: "INVALID_CHIP",
  INVALID_STARTER: "INVALID_STARTER",
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_PACK_STATE: "INVALID_PACK_STATE",
  PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
  PROVIDER_CAPABILITY: "PROVIDER_CAPABILITY",
  PROVIDER_HTTP_ERROR: "PROVIDER_HTTP_ERROR",
  PROVIDER_TIMEOUT: "PROVIDER_TIMEOUT",
  NETWORK_ERROR: "NETWORK_ERROR",
  GENERATE_STILL_FAILED: "GENERATE_STILL_FAILED",
  GENERATE_NO_IMAGE: "GENERATE_NO_IMAGE",
  GENERATE_POLL_TIMEOUT: "GENERATE_POLL_TIMEOUT",
  GENERATE_SUBMIT_IN_FLIGHT: "GENERATE_SUBMIT_IN_FLIGHT",
  TRAIN_PACK_FAILED: "TRAIN_PACK_FAILED",
  TRAIN_POLL_TIMEOUT: "TRAIN_POLL_TIMEOUT",
  TRAIN_NO_ADAPTER: "TRAIN_NO_ADAPTER",
  TRAIN_ADAPTER_FETCH_FAILED: "TRAIN_ADAPTER_FETCH_FAILED",
  TRAIN_SUBMIT_IN_FLIGHT: "TRAIN_SUBMIT_IN_FLIGHT",
  TRAIN_PACK_TIMEOUT: "TRAIN_PACK_TIMEOUT",
  TRAIN_PACK_CANCELED: "TRAIN_PACK_CANCELED",
  POSE_REQUIRED: "POSE_REQUIRED",
  JOB_STALLED: "JOB_STALLED",
} as const;

export type JobErrorCode = (typeof JOB_ERROR_CODES)[keyof typeof JOB_ERROR_CODES];

export const USER_JOB_MESSAGES: Record<JobErrorCode, string> = {
  JOB_NOT_FOUND: "Job not found.",
  PACK_NOT_FOUND: "Character pack not found.",
  PACK_NOT_LOCKED: LOCK_SOUL_ID_FIRST,
  INVALID_CHIP: "That chip isn't valid. Choose chips again and generate.",
  INVALID_STARTER: "That starter isn't valid. Pick a face or body vibe again.",
  INVALID_INPUT: "This job has invalid input and was not sent to the image service.",
  INVALID_PACK_STATE: "This character pack can't run that job in its current state.",
  PROVIDER_NOT_CONFIGURED: "Generation isn't configured on this server.",
  PROVIDER_CAPABILITY: "This image service can't run that job.",
  PROVIDER_HTTP_ERROR: "The image service rejected this request.",
  PROVIDER_TIMEOUT: "The image service took too long. Try again.",
  NETWORK_ERROR: "Network error talking to the image service. Try again.",
  GENERATE_STILL_FAILED: "Still generation failed. Try again from Create.",
  GENERATE_NO_IMAGE: "The image service returned no still. Try again.",
  GENERATE_POLL_TIMEOUT: "Still generation took too long. Try Generate again.",
  GENERATE_SUBMIT_IN_FLIGHT: "Still generation was already submitted. Check Jobs — do not generate twice.",
  TRAIN_PACK_FAILED: "Training failed. You can try Train & lock again.",
  TRAIN_POLL_TIMEOUT: "Training took too long. You can try Train & lock again.",
  TRAIN_NO_ADAPTER: "Training finished without a Soul ID adapter. Try Train & lock again.",
  TRAIN_ADAPTER_FETCH_FAILED: "Could not download the trained Soul ID adapter. Try again.",
  TRAIN_SUBMIT_IN_FLIGHT: "Training was already submitted. Check Jobs — do not start a second train.",
  TRAIN_PACK_TIMEOUT: "The training service timed out. You can try Train & lock again.",
  TRAIN_PACK_CANCELED: "Training was canceled. You can try Train & lock again.",
  POSE_REQUIRED: "Pose is required",
  JOB_STALLED: "This job stopped unexpectedly. Try again.",
};

const RETRYABLE_HTTP = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export type JobAttempt = {
  attempt: number;
  maxAttempts: number;
};

export type ClassifiedJobError = {
  code: JobErrorCode;
  userMessage: string;
  retryable: boolean;
};

export class JobError extends Error {
  readonly code: JobErrorCode;
  readonly userMessage: string;
  readonly retryable: boolean;

  constructor(input: { code: JobErrorCode; userMessage?: string; retryable?: boolean; cause?: unknown }) {
    const userMessage = input.userMessage ?? USER_JOB_MESSAGES[input.code];
    super(userMessage);
    this.name = "JobError";
    this.code = input.code;
    this.userMessage = userMessage;
    this.retryable = input.retryable ?? !isPermanentCode(input.code);
    if (input.cause !== undefined) {
      this.cause = input.cause;
    }
  }
}

export function isPermanentCode(code: JobErrorCode): boolean {
  return (
    code === JOB_ERROR_CODES.JOB_NOT_FOUND ||
    code === JOB_ERROR_CODES.PACK_NOT_FOUND ||
    code === JOB_ERROR_CODES.PACK_NOT_LOCKED ||
    code === JOB_ERROR_CODES.INVALID_CHIP ||
    code === JOB_ERROR_CODES.INVALID_STARTER ||
    code === JOB_ERROR_CODES.INVALID_INPUT ||
    code === JOB_ERROR_CODES.INVALID_PACK_STATE ||
    code === JOB_ERROR_CODES.PROVIDER_NOT_CONFIGURED ||
    code === JOB_ERROR_CODES.PROVIDER_CAPABILITY ||
    code === JOB_ERROR_CODES.TRAIN_POLL_TIMEOUT ||
    code === JOB_ERROR_CODES.TRAIN_NO_ADAPTER ||
    code === JOB_ERROR_CODES.TRAIN_SUBMIT_IN_FLIGHT ||
    code === JOB_ERROR_CODES.TRAIN_PACK_TIMEOUT ||
    code === JOB_ERROR_CODES.TRAIN_PACK_CANCELED ||
    code === JOB_ERROR_CODES.GENERATE_NO_IMAGE ||
    code === JOB_ERROR_CODES.GENERATE_POLL_TIMEOUT ||
    code === JOB_ERROR_CODES.GENERATE_SUBMIT_IN_FLIGHT ||
    code === JOB_ERROR_CODES.POSE_REQUIRED ||
    code === JOB_ERROR_CODES.JOB_STALLED
  );
}

export function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_HTTP.has(status);
}

export function httpStatusFromMessage(message: string): number | null {
  const match = /HTTP\s+(\d{3})\b/i.exec(message);
  if (!match?.[1]) return null;
  return Number(match[1]);
}

export function shouldRetryJob(error: ClassifiedJobError, attempt: JobAttempt): boolean {
  return error.retryable && attempt.attempt < attempt.maxAttempts;
}

/** BullMQ increments attemptsMade when the job becomes active; 0 still means the first try. */
export function jobAttemptFromBullmq(job: { attemptsMade: number; opts: { attempts?: number } }): JobAttempt {
  const maxAttempts = Math.max(1, job.opts.attempts ?? 1);
  const attempt = Math.min(maxAttempts, Math.max(1, job.attemptsMade));
  return { attempt, maxAttempts };
}

export function keepLockedAfterTrainFail(input: {
  retrain: boolean;
  adapterStorageKey?: string | null;
}): boolean {
  return input.retrain && Boolean(input.adapterStorageKey);
}

export function trainPackFailureMessage(keepLocked: boolean): string {
  if (keepLocked) {
    return "Training failed. Your previous Locked Soul ID is unchanged.";
  }
  return USER_JOB_MESSAGES.TRAIN_PACK_FAILED;
}

export function trainPackTimeoutMessage(keepLocked: boolean): string {
  if (keepLocked) {
    return "Training took too long. Your previous Locked Soul ID is unchanged.";
  }
  return USER_JOB_MESSAGES.TRAIN_POLL_TIMEOUT;
}

export function trainPackStalledMessage(keepLocked: boolean): string {
  if (keepLocked) {
    return "Training stopped unexpectedly. Your previous Locked Soul ID is unchanged.";
  }
  return USER_JOB_MESSAGES.JOB_STALLED;
}

function classified(
  code: JobErrorCode,
  retryable: boolean,
  userMessage?: string,
): ClassifiedJobError {
  return {
    code,
    retryable,
    userMessage: userMessage ?? USER_JOB_MESSAGES[code],
  };
}

function errorName(err: unknown): string {
  if (err instanceof Error) return err.name;
  return "";
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function errorStatus(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  if ("status" in err && typeof err.status === "number") return err.status;
  return httpStatusFromMessage(errorMessage(err));
}

function looksLikeNetwork(message: string, name: string): boolean {
  if (name === "ProviderNetworkError" || name === "FetchError") return true;
  return /fetch failed|econnreset|econnrefused|enotfound|etimedout|eai_again|epipe|socket hang up|network error|network/i.test(
    message,
  );
}

function looksLikeTimeout(message: string, name: string): boolean {
  if (name === "ProviderTimeoutError" || name === "TimeoutError" || name === "AbortError") return true;
  return /timed out|timeout/i.test(message);
}

/**
 * Map thrown errors to a persisted code + user-safe message.
 * Permanent: bad pack/chips/Soul ID — do not retry.
 * Transient: provider/network/timeouts — retry with backoff.
 */
export function classifyJobError(err: unknown): ClassifiedJobError {
  if (err instanceof JobError) {
    return {
      code: err.code,
      userMessage: err.userMessage,
      retryable: err.retryable,
    };
  }

  const name = errorName(err);
  const message = errorMessage(err);
  const status = errorStatus(err);

  if (name === "ProviderNotConfiguredError" || /is not configured/i.test(message)) {
    return classified(JOB_ERROR_CODES.PROVIDER_NOT_CONFIGURED, false);
  }
  if (name === "ProviderCapabilityError" || /has no Soul-ID/i.test(message)) {
    return classified(JOB_ERROR_CODES.PROVIDER_CAPABILITY, false);
  }
  if (name === "ProviderHttpError" || status !== null) {
    const httpRetryable = status !== null && isRetryableHttpStatus(status);
    if (status === 401 || status === 403) {
      return classified(JOB_ERROR_CODES.PROVIDER_NOT_CONFIGURED, false);
    }
    if (httpRetryable) {
      const busyMessage =
        status === 429
          ? "The image service is rate-limiting requests. Try again in a moment."
          : "The image service is temporarily unavailable. Try again in a moment.";
      return classified(JOB_ERROR_CODES.PROVIDER_HTTP_ERROR, true, busyMessage);
    }
    return classified(JOB_ERROR_CODES.PROVIDER_HTTP_ERROR, false);
  }

  if (looksLikeTimeout(message, name)) {
    if (/train pack polling timed out/i.test(message) || /train.*poll/i.test(message)) {
      return classified(JOB_ERROR_CODES.TRAIN_POLL_TIMEOUT, false);
    }
    if (/generateStill polling timed out/i.test(message) || /generate.*poll/i.test(message)) {
      return classified(JOB_ERROR_CODES.GENERATE_POLL_TIMEOUT, false);
    }
    return classified(JOB_ERROR_CODES.PROVIDER_TIMEOUT, true);
  }
  if (looksLikeNetwork(message, name)) {
    return classified(JOB_ERROR_CODES.NETWORK_ERROR, true);
  }

  if (message === LOCK_SOUL_ID_FIRST || /lock soul id first/i.test(message)) {
    return classified(JOB_ERROR_CODES.PACK_NOT_LOCKED, false);
  }
  if (/unknown chip|expected pose|expected outfit|expected scene|expected lighting|expected body|pose is required/i.test(message)) {
    return classified(JOB_ERROR_CODES.INVALID_CHIP, false);
  }
  if (/unknown starter preset|starter .+ is (face|body), expected/i.test(message)) {
    return classified(JOB_ERROR_CODES.INVALID_STARTER, false);
  }
  if (/character pack name is too long|character pack is required/i.test(message)) {
    return classified(JOB_ERROR_CODES.INVALID_INPUT, false);
  }
  if (/job .+ not found/i.test(message)) {
    return classified(JOB_ERROR_CODES.JOB_NOT_FOUND, false);
  }
  if (/stopped unexpectedly|^JOB_STALLED$/i.test(message)) {
    return classified(JOB_ERROR_CODES.JOB_STALLED, false);
  }
  if (/character pack not found|pack not found/i.test(message)) {
    return classified(JOB_ERROR_CODES.PACK_NOT_FOUND, false);
  }
  if (
    /generateStill requires a character pack/i.test(message) ||
    /only draft packs/i.test(message) ||
    /train & lock is available/i.test(message) ||
    /refs can only be changed/i.test(message) ||
    /starters can only be added/i.test(message)
  ) {
    return classified(JOB_ERROR_CODES.INVALID_PACK_STATE, false);
  }

  if (/returned no (still|image|images)/i.test(message)) {
    return classified(JOB_ERROR_CODES.GENERATE_NO_IMAGE, false);
  }
  if (/without a (lora|soul id)?\s*adapter|train pack finished without/i.test(message)) {
    return classified(JOB_ERROR_CODES.TRAIN_NO_ADAPTER, false);
  }
  if (/train/i.test(message)) {
    return classified(JOB_ERROR_CODES.TRAIN_PACK_FAILED, true);
  }
  return classified(JOB_ERROR_CODES.GENERATE_STILL_FAILED, true);
}

export function generateStillBullJobId(generationJobId: string, attempt = 0): string {
  return attempt <= 0 ? `generateStill:${generationJobId}` : `generateStill:${generationJobId}:poll:${attempt}`;
}

/** One recover job per generationJobId so stale scans do not stack duplicate generates. */
export function generateStillRecoverBullJobId(generationJobId: string): string {
  return `generateStill:${generationJobId}:recover`;
}

export function trainPackBullJobId(generationJobId: string, attempt = 0): string {
  return attempt <= 0 ? `trainPack:${generationJobId}` : `trainPack:${generationJobId}:poll:${attempt}`;
}

export function deadLetterBullJobId(sourceQueue: string, generationJobId: string): string {
  return `deadLetter:${sourceQueue}:${generationJobId}`;
}

export function isDuplicateBullJobError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /already exists/i.test(message);
}

export type TrainSubmitDecision = "poll" | "submit" | "fail-in-flight";

export function trainSubmitDecision(input: {
  providerJobId?: string | null;
  submitAttempted: boolean;
}): TrainSubmitDecision {
  if (input.providerJobId && input.providerJobId.trim()) return "poll";
  if (input.submitAttempted) return "fail-in-flight";
  return "submit";
}

export function isSubmitAttempted(inputJson: Record<string, unknown> | null | undefined): boolean {
  return inputJson?.submitAttempted === true;
}

export function withSubmitAttempted(inputJson: Record<string, unknown>): Record<string, unknown> {
  return { ...inputJson, submitAttempted: true };
}

/** Same submit-once rule as trainPack: poll if we have a vendor id, else do not double POST. */
export const generateSubmitDecision = trainSubmitDecision;
