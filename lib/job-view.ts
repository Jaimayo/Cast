import {
  GENERATE_STILL_MAX_ATTEMPTS,
  TRAIN_PACK_MAX_ATTEMPTS,
  USER_JOB_MESSAGES,
  type JobErrorCode,
} from "@/lib/job-errors";

export type JobLastError = {
  code: string;
  message: string;
};

/** Product-facing job row for `/api/jobs` and `/api/jobs/[id]`. */
export type PublicJob = {
  id: string;
  kind: string;
  status: string;
  provider: string;
  characterPackId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Elapsed since enqueue (`now - createdAt`). */
  ageMs: number;
  /** Time in flight: `now - createdAt` while queued/running, else `updatedAt - createdAt`. */
  durationMs: number;
  /** 0 = not started; 1+ = worker / retry / train-poll starts persisted on the row. */
  attempt: number;
  maxAttempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  lastError: JobLastError | null;
  previewUrl: string | null;
};

export type JobViewInput = {
  id: string;
  kind: string;
  status: string;
  provider?: string | null;
  characterPackId?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  attempt?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  resultAssetKey?: string | null;
  previewUrl?: string | null;
  inputJson?: unknown;
  userId?: string;
  providerJobId?: string | null;
  recipeId?: string | null;
};

const TERMINAL_STATUSES = new Set(["succeeded", "failed", "canceled"]);

export function isTerminalJobStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function maxAttemptsForKind(kind: string): number {
  if (kind === "train_pack") return TRAIN_PACK_MAX_ATTEMPTS;
  return GENERATE_STILL_MAX_ATTEMPTS;
}

export function jobAttemptCount(attempt: number | null | undefined): number {
  if (typeof attempt !== "number" || !Number.isFinite(attempt) || attempt < 0) {
    return 0;
  }
  return Math.floor(attempt);
}

/** Persist the higher of BullMQ retry index and train poll touch count. */
export function persistedJobAttempt(input: { workerAttempt: number; pollAttempt?: number }): number {
  const worker = Math.max(0, Math.floor(input.workerAttempt));
  const poll =
    typeof input.pollAttempt === "number" && Number.isFinite(input.pollAttempt)
      ? Math.max(0, Math.floor(input.pollAttempt)) + 1
      : 0;
  return Math.max(worker, poll);
}

function asDate(value: Date | string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date;
}

function knownUserMessage(code: string): string | null {
  if (code in USER_JOB_MESSAGES) {
    return USER_JOB_MESSAGES[code as JobErrorCode];
  }
  return null;
}

/** Prefer stored user copy; fall back to the catalog message for a known code. */
export function lastErrorFromJob(input: {
  errorCode?: string | null;
  errorMessage?: string | null;
}): JobLastError | null {
  const code = input.errorCode?.trim() || null;
  const message = input.errorMessage?.trim() || null;
  if (!code && !message) return null;
  const resolvedCode = code ?? "UNKNOWN";
  const resolvedMessage = message ?? knownUserMessage(resolvedCode) ?? resolvedCode;
  return { code: resolvedCode, message: resolvedMessage };
}

export function jobAgeMs(createdAt: Date, now: Date): number {
  return Math.max(0, now.getTime() - createdAt.getTime());
}

export function jobDurationMs(input: { status: string; createdAt: Date; updatedAt: Date; now: Date }): number {
  const end = isTerminalJobStatus(input.status) ? input.updatedAt : input.now;
  return Math.max(0, end.getTime() - input.createdAt.getTime());
}

/** Plain Jobs-table age: `12s`, `3m`, `1h 4m`. */
export function formatJobAge(ms: number): string {
  const safe = Math.max(0, Math.floor(ms));
  const seconds = Math.floor(safe / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  if (restMinutes === 0) return `${hours}h`;
  return `${hours}h ${restMinutes}m`;
}

export function formatJobAttempts(attempt: number, maxAttempts: number): string {
  if (attempt <= 0) return "0";
  if (attempt > maxAttempts) return String(attempt);
  return `${attempt} / ${maxAttempts}`;
}

/**
 * Normalize a generation_jobs row (or enqueue result) for the Jobs API.
 * Drops storage keys, input JSON, provider ids, and other non-product fields.
 */
export function publicJob(job: JobViewInput, now: Date = new Date()): PublicJob {
  const createdAt = asDate(job.createdAt, now);
  const updatedAt = asDate(job.updatedAt, createdAt);
  const errorCode = job.errorCode?.trim() || null;
  const errorMessage = job.errorMessage?.trim() || null;
  void job.resultAssetKey;
  void job.inputJson;
  void job.userId;
  void job.providerJobId;
  void job.recipeId;
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    provider: job.provider ?? "venice",
    characterPackId: job.characterPackId ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    ageMs: jobAgeMs(createdAt, now),
    durationMs: jobDurationMs({ status: job.status, createdAt, updatedAt, now }),
    attempt: jobAttemptCount(job.attempt),
    maxAttempts: maxAttemptsForKind(job.kind),
    errorCode,
    errorMessage,
    lastError: lastErrorFromJob({ errorCode, errorMessage }),
    previewUrl: job.previewUrl ?? null,
  };
}
