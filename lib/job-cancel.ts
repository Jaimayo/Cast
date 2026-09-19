import { JobError, type JobErrorCode } from "@/lib/job-errors";

/** Queue-wait thresholds for user-safe in-progress copy (not vendor SLAs). */
export const QUEUE_WAIT_SECONDS = 8;
export const QUEUE_LONG_SECONDS = 45;

export const JOB_PROGRESS_MESSAGES = {
  queued: "Waiting in queue.",
  queuedWait: "Still waiting in queue.",
  queuedLong: "This is taking longer than usual. You can cancel and try Generate again.",
  generatingStill: "Generating this still…",
  generatingStarter: "Generating this starter…",
  training: "Training is in progress.",
} as const;

export const JOB_CANCEL_MESSAGES = {
  still: "This still was canceled.",
  starter: "This starter was canceled.",
  trainUnsupported: "Train & lock can't be canceled from Jobs.",
  notSupported: "This job can't be canceled.",
  alreadyFinished: "This job already finished.",
  notFound: "Job not found.",
} as const;

export type JobCancelInput = {
  kind: string;
  status: string;
};

export type JobCancelState = {
  cancelSupported: boolean;
  cancelDisabledReason: string | null;
};

export function isActiveJobStatus(status: string): boolean {
  return status === "queued" || status === "running";
}

export function isCancelableStillKind(kind: string): boolean {
  return kind === "generate_still" || kind === "generate_starter";
}

export function jobCancelState(job: JobCancelInput): JobCancelState {
  if (!isActiveJobStatus(job.status)) {
    return { cancelSupported: false, cancelDisabledReason: null };
  }
  if (job.kind === "train_pack") {
    return {
      cancelSupported: false,
      cancelDisabledReason: JOB_CANCEL_MESSAGES.trainUnsupported,
    };
  }
  if (isCancelableStillKind(job.kind)) {
    return { cancelSupported: true, cancelDisabledReason: null };
  }
  return {
    cancelSupported: false,
    cancelDisabledReason: JOB_CANCEL_MESSAGES.notSupported,
  };
}

export function jobCanceledMessage(kind: string): string {
  if (kind === "generate_starter") return JOB_CANCEL_MESSAGES.starter;
  return JOB_CANCEL_MESSAGES.still;
}

export type CancelJobDecision =
  | { action: "cancel" }
  | {
      action: "reject";
      code: "JOB_NOT_FOUND" | "JOB_CANCEL_NOT_SUPPORTED" | "JOB_ALREADY_FINISHED";
      httpStatus: 404 | 400 | 409;
      message: string;
    };

export function decideCancelJob(job: JobCancelInput | null): CancelJobDecision {
  if (!job) {
    return {
      action: "reject",
      code: "JOB_NOT_FOUND",
      httpStatus: 404,
      message: JOB_CANCEL_MESSAGES.notFound,
    };
  }
  if (!isActiveJobStatus(job.status)) {
    return {
      action: "reject",
      code: "JOB_ALREADY_FINISHED",
      httpStatus: 409,
      message: JOB_CANCEL_MESSAGES.alreadyFinished,
    };
  }
  const state = jobCancelState(job);
  if (!state.cancelSupported) {
    return {
      action: "reject",
      code: "JOB_CANCEL_NOT_SUPPORTED",
      httpStatus: 400,
      message: state.cancelDisabledReason ?? JOB_CANCEL_MESSAGES.notSupported,
    };
  }
  return { action: "cancel" };
}

export function jobErrorFromCancelDecision(
  decision: Extract<CancelJobDecision, { action: "reject" }>,
): JobError {
  return new JobError({
    code: decision.code as JobErrorCode,
    userMessage: decision.message,
    retryable: false,
    httpStatus: decision.httpStatus,
  });
}

/** Worker: do not start or resume a terminal / canceled still. */
export function generateStillWorkDecision(status: string): "skip" | "proceed" {
  if (status === "canceled" || status === "succeeded" || status === "failed") {
    return "skip";
  }
  return "proceed";
}

/** Worker: only persist bytes if the row is still queued/running. */
export function shouldPersistGenerateStillResult(status: string): boolean {
  return status === "queued" || status === "running";
}

export function jobQueueWaitMessage(ageSeconds: number | undefined): string {
  const age = ageSeconds ?? 0;
  if (age >= QUEUE_LONG_SECONDS) return JOB_PROGRESS_MESSAGES.queuedLong;
  if (age >= QUEUE_WAIT_SECONDS) return JOB_PROGRESS_MESSAGES.queuedWait;
  return JOB_PROGRESS_MESSAGES.queued;
}

export function jobGeneratingMessage(kind: string): string {
  if (kind === "generate_starter") return JOB_PROGRESS_MESSAGES.generatingStarter;
  if (kind === "train_pack") return JOB_PROGRESS_MESSAGES.training;
  return JOB_PROGRESS_MESSAGES.generatingStill;
}
