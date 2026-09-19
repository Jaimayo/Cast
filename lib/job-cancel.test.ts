import { describe, expect, it } from "vitest";
import {
  JOB_CANCEL_MESSAGES,
  JOB_PROGRESS_MESSAGES,
  QUEUE_LONG_SECONDS,
  QUEUE_WAIT_SECONDS,
  decideCancelJob,
  generateStillWorkDecision,
  jobCancelState,
  jobCanceledMessage,
  jobErrorFromCancelDecision,
  jobGeneratingMessage,
  jobQueueWaitMessage,
  shouldPersistGenerateStillResult,
} from "@/lib/job-cancel";

describe("jobCancelState", () => {
  it("allows cancel for queued and running stills and starters", () => {
    expect(jobCancelState({ kind: "generate_still", status: "queued" })).toEqual({
      cancelSupported: true,
      cancelDisabledReason: null,
    });
    expect(jobCancelState({ kind: "generate_still", status: "running" })).toEqual({
      cancelSupported: true,
      cancelDisabledReason: null,
    });
    expect(jobCancelState({ kind: "generate_starter", status: "queued" }).cancelSupported).toBe(true);
  });

  it("disables cancel for Train with a user-safe reason", () => {
    expect(jobCancelState({ kind: "train_pack", status: "queued" })).toEqual({
      cancelSupported: false,
      cancelDisabledReason: JOB_CANCEL_MESSAGES.trainUnsupported,
    });
    expect(jobCancelState({ kind: "train_pack", status: "running" }).cancelSupported).toBe(false);
  });

  it("hides cancel once the job is terminal", () => {
    expect(jobCancelState({ kind: "generate_still", status: "succeeded" })).toEqual({
      cancelSupported: false,
      cancelDisabledReason: null,
    });
    expect(jobCancelState({ kind: "generate_still", status: "failed" }).cancelSupported).toBe(false);
    expect(jobCancelState({ kind: "generate_still", status: "canceled" }).cancelSupported).toBe(false);
  });
});

describe("decideCancelJob", () => {
  it("cancels an in-progress still", () => {
    expect(decideCancelJob({ kind: "generate_still", status: "queued" })).toEqual({ action: "cancel" });
    expect(decideCancelJob({ kind: "generate_still", status: "running" })).toEqual({ action: "cancel" });
  });

  it("rejects missing, finished, and Train jobs with user-safe copy", () => {
    expect(decideCancelJob(null)).toEqual({
      action: "reject",
      code: "JOB_NOT_FOUND",
      httpStatus: 404,
      message: JOB_CANCEL_MESSAGES.notFound,
    });
    expect(decideCancelJob({ kind: "generate_still", status: "succeeded" })).toEqual({
      action: "reject",
      code: "JOB_ALREADY_FINISHED",
      httpStatus: 409,
      message: JOB_CANCEL_MESSAGES.alreadyFinished,
    });
    expect(decideCancelJob({ kind: "train_pack", status: "running" })).toEqual({
      action: "reject",
      code: "JOB_CANCEL_NOT_SUPPORTED",
      httpStatus: 400,
      message: JOB_CANCEL_MESSAGES.trainUnsupported,
    });
  });

  it("never mentions provider ids in cancel copy", () => {
    const payload = JSON.stringify([
      decideCancelJob(null),
      decideCancelJob({ kind: "train_pack", status: "queued" }),
      jobCanceledMessage("generate_still"),
      jobCanceledMessage("generate_starter"),
    ]);
    expect(payload).not.toMatch(/providerJobId|venice|runpod|rp-|stack|prompt/i);
  });

  it("maps reject decisions to JobError http statuses without leaking internals", () => {
    const finished = jobErrorFromCancelDecision({
      action: "reject",
      code: "JOB_ALREADY_FINISHED",
      httpStatus: 409,
      message: JOB_CANCEL_MESSAGES.alreadyFinished,
    });
    expect(finished.httpStatus).toBe(409);
    expect(finished.code).toBe("JOB_ALREADY_FINISHED");
    expect(finished.retryable).toBe(false);
    expect(finished.userMessage).not.toMatch(/stack|prompt|venice/i);
  });
});

describe("queue wait and generating copy", () => {
  it("escalates queued copy with age and keeps vendor failures out of wait text", () => {
    expect(jobQueueWaitMessage(2)).toBe(JOB_PROGRESS_MESSAGES.queued);
    expect(jobQueueWaitMessage(QUEUE_WAIT_SECONDS)).toBe(JOB_PROGRESS_MESSAGES.queuedWait);
    expect(jobQueueWaitMessage(QUEUE_LONG_SECONDS)).toBe(JOB_PROGRESS_MESSAGES.queuedLong);
    expect(jobGeneratingMessage("generate_still")).toBe(JOB_PROGRESS_MESSAGES.generatingStill);
    expect(jobGeneratingMessage("generate_starter")).toBe(JOB_PROGRESS_MESSAGES.generatingStarter);
    expect(jobGeneratingMessage("train_pack")).toBe(JOB_PROGRESS_MESSAGES.training);
    expect(jobQueueWaitMessage(90)).not.toMatch(/HTTP|timeout|venice|runpod|provider/i);
  });
});

describe("worker cancel guards", () => {
  it("skips canceled/terminal stills and only persists while queued or running", () => {
    expect(generateStillWorkDecision("canceled")).toBe("skip");
    expect(generateStillWorkDecision("succeeded")).toBe("skip");
    expect(generateStillWorkDecision("failed")).toBe("skip");
    expect(generateStillWorkDecision("queued")).toBe("proceed");
    expect(generateStillWorkDecision("running")).toBe("proceed");
    expect(shouldPersistGenerateStillResult("running")).toBe(true);
    expect(shouldPersistGenerateStillResult("canceled")).toBe(false);
    expect(shouldPersistGenerateStillResult("succeeded")).toBe(false);
  });
});
