import {
  isPermanentCode,
  USER_JOB_MESSAGES,
  userSafeLastError,
  type JobErrorCode,
} from "@/lib/job-errors";

/** Public Jobs list/detail fields the UI is allowed to read. */
export type JobDisplayInput = {
  kind: string;
  status: string;
  lastError?: string | null;
  lastErrorCode?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  ageSeconds?: number;
  attemptCount?: number;
};

export type JobStatusTone = "ok" | "danger" | "gold" | "muted";
export type JobNoteTone = "retry" | "fail";

function knownErrorCode(code: string | null): JobErrorCode | null {
  if (!code) return null;
  return code in USER_JOB_MESSAGES ? (code as JobErrorCode) : null;
}

export function jobKindLabel(kind: string): string {
  if (kind === "generate_still") return "Still";
  if (kind === "train_pack") return "Train";
  if (kind === "generate_starter") return "Starter";
  return kind;
}

export function jobErrorCode(job: JobDisplayInput): string | null {
  return job.lastErrorCode || job.errorCode || null;
}

/** User-safe sentence from the API, or the same catalog copy #24 uses for a known code. */
export function jobErrorMessage(job: JobDisplayInput): string | null {
  return userSafeLastError(jobErrorCode(job), job.lastError || job.errorMessage);
}

/**
 * Worker persisted lastError while status is still running — a transient try, not a hard fail.
 * Permanent codes on a running row are treated as in-progress too (status is the source of truth).
 */
export function isRetryingJob(job: JobDisplayInput): boolean {
  if (job.status !== "running") return false;
  const code = knownErrorCode(jobErrorCode(job));
  const message = jobErrorMessage(job);
  if (!code && !message) return false;
  if (code && isPermanentCode(code)) return false;
  return true;
}

export function isInProgressJob(job: JobDisplayInput): boolean {
  return job.status === "queued" || job.status === "running";
}

export function jobStatusLabel(job: JobDisplayInput): string {
  if (isRetryingJob(job)) return "Retrying";
  if (job.status === "queued") return "Queued";
  if (job.status === "running") return "Running";
  if (job.status === "succeeded") return "Succeeded";
  if (job.status === "failed") return "Failed";
  if (job.status === "canceled") return "Canceled";
  return job.status;
}

export function jobStatusTone(job: JobDisplayInput): JobStatusTone {
  if (job.status === "succeeded") return "ok";
  if (job.status === "failed") return "danger";
  if (isRetryingJob(job) || isInProgressJob(job)) return "gold";
  return "muted";
}

export function formatJobAge(ageSeconds: number | undefined): string | null {
  if (ageSeconds == null || ageSeconds < 0 || !Number.isFinite(ageSeconds)) return null;
  if (ageSeconds < 60) return `${ageSeconds}s`;
  if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m`;
  if (ageSeconds < 86400) return `${Math.floor(ageSeconds / 3600)}h`;
  return `${Math.floor(ageSeconds / 86400)}d`;
}

export function jobAttemptLabel(attemptCount: number | undefined): string | null {
  if (!attemptCount || attemptCount <= 0 || !Number.isFinite(attemptCount)) return null;
  return `try ${Math.floor(attemptCount)}`;
}

export function jobStatusMeta(job: JobDisplayInput): string | null {
  const parts = [formatJobAge(job.ageSeconds), jobAttemptLabel(job.attemptCount)].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function jobRecoveryHint(job: JobDisplayInput): string | null {
  if (isRetryingJob(job) || (isInProgressJob(job) && jobErrorMessage(job))) {
    return "Still working — this is not a final failure.";
  }
  if (job.status !== "failed") return null;
  if (job.kind === "generate_still") return "Generate again from Create.";
  if (job.kind === "generate_starter") return "Generate the vibe again.";
  if (job.kind === "train_pack") {
    return "Open the character and Train & lock or Retrain. Retrain keeps the previous Locked Soul ID if the new train fails.";
  }
  return "Try again.";
}

export type JobQueuePresentation = {
  kindLabel: string;
  statusLabel: string;
  statusTone: JobStatusTone;
  meta: string | null;
  note: string | null;
  noteTone: JobNoteTone | null;
  noteCaption: string | null;
};

export function jobQueuePresentation(job: JobDisplayInput): JobQueuePresentation {
  const retrying = isRetryingJob(job);
  const inProgressWithError = isInProgressJob(job) && Boolean(jobErrorMessage(job));
  const note = jobErrorMessage(job);
  let noteTone: JobNoteTone | null = null;
  if (retrying || inProgressWithError) {
    noteTone = "retry";
  } else if (job.status === "failed" && note) {
    noteTone = "fail";
  }

  return {
    kindLabel: jobKindLabel(job.kind),
    statusLabel: jobStatusLabel(job),
    statusTone: jobStatusTone(job),
    meta: jobStatusMeta(job),
    note: noteTone ? note : null,
    noteTone,
    noteCaption: noteTone ? jobRecoveryHint(job) : null,
  };
}
