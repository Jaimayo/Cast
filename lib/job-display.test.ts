import { describe, expect, it } from "vitest";
import { USER_JOB_MESSAGES } from "@/lib/job-errors";
import {
  formatJobAge,
  isRetryingJob,
  jobErrorMessage,
  jobKindLabel,
  jobQueuePresentation,
  jobRecoveryHint,
  jobStatusLabel,
  jobStatusMeta,
} from "@/lib/job-display";

describe("job kind and age", () => {
  it("uses product kind labels", () => {
    expect(jobKindLabel("generate_still")).toBe("Still");
    expect(jobKindLabel("train_pack")).toBe("Train");
    expect(jobKindLabel("generate_starter")).toBe("Starter");
  });

  it("formats age and attempt meta", () => {
    expect(formatJobAge(12)).toBe("12s");
    expect(formatJobAge(90)).toBe("1m");
    expect(formatJobAge(3700)).toBe("1h");
    expect(jobStatusMeta({ kind: "generate_still", status: "running", ageSeconds: 12, attemptCount: 2 })).toBe(
      "12s · try 2",
    );
    expect(jobStatusMeta({ kind: "generate_still", status: "queued", ageSeconds: 4, attemptCount: 0 })).toBe("4s");
  });
});

describe("retrying vs terminal Jobs copy", () => {
  it("labels a running job with a transient lastError as Retrying, not Failed", () => {
    const job = {
      kind: "generate_still",
      status: "running",
      lastErrorCode: "NETWORK_ERROR",
      lastError: USER_JOB_MESSAGES.NETWORK_ERROR,
      attemptCount: 2,
      ageSeconds: 8,
    };
    expect(isRetryingJob(job)).toBe(true);
    expect(jobStatusLabel(job)).toBe("Retrying");
    const view = jobQueuePresentation(job);
    expect(view.statusTone).toBe("gold");
    expect(view.note).toBe("Network error talking to the image service. Try again.");
    expect(view.noteTone).toBe("retry");
    expect(view.noteCaption).toBe("Still working — this is not a final failure.");
  });

  it("keeps a GENERATE_TIMEOUT job as Failed with catalog copy", () => {
    const job = {
      kind: "generate_still",
      status: "failed",
      lastErrorCode: "GENERATE_TIMEOUT",
      lastError: null,
      attemptCount: 1,
      ageSeconds: 20,
    };
    expect(isRetryingJob(job)).toBe(false);
    expect(jobStatusLabel(job)).toBe("Failed");
    expect(jobErrorMessage(job)).toBe("Still generation took too long. Try Generate again.");
    const view = jobQueuePresentation(job);
    expect(view.statusTone).toBe("danger");
    expect(view.note).toBe("Still generation took too long. Try Generate again.");
    expect(view.noteTone).toBe("fail");
    expect(view.noteCaption).toBe("Generate again from Create.");
  });

  it("does not treat a succeeded job as failed even if a stale lastError is present", () => {
    const job = {
      kind: "generate_still",
      status: "succeeded",
      lastErrorCode: "NETWORK_ERROR",
      lastError: USER_JOB_MESSAGES.NETWORK_ERROR,
    };
    expect(isRetryingJob(job)).toBe(false);
    expect(jobStatusLabel(job)).toBe("Succeeded");
    const view = jobQueuePresentation(job);
    expect(view.statusTone).toBe("ok");
    expect(view.note).toBeNull();
    expect(view.noteTone).toBeNull();
  });

  it("maps missing-adapter and no-adapter catalog copy", () => {
    expect(
      jobErrorMessage({
        kind: "generate_still",
        status: "failed",
        lastErrorCode: "GENERATE_MISSING_ADAPTER",
        lastError: null,
      }),
    ).toBe(USER_JOB_MESSAGES.GENERATE_MISSING_ADAPTER);
    expect(
      jobErrorMessage({
        kind: "generate_still",
        status: "failed",
        lastErrorCode: "GENERATE_POLICY_REJECT",
        lastError: null,
      }),
    ).toBe(USER_JOB_MESSAGES.GENERATE_POLICY_REJECT);
    expect(
      jobErrorMessage({
        kind: "generate_still",
        status: "failed",
        lastErrorCode: "PROVIDER_INSUFFICIENT_BALANCE",
        lastError: null,
      }),
    ).toBe(USER_JOB_MESSAGES.PROVIDER_INSUFFICIENT_BALANCE);
    expect(
      jobErrorMessage({
        kind: "generate_still",
        status: "failed",
        lastErrorCode: "PROVIDER_RATE_LIMIT",
        lastError: null,
      }),
    ).toBe(USER_JOB_MESSAGES.PROVIDER_RATE_LIMIT);
    expect(
      jobErrorMessage({
        kind: "train_pack",
        status: "failed",
        lastErrorCode: "TRAIN_NO_ADAPTER",
        lastError: null,
      }),
    ).toBe(USER_JOB_MESSAGES.TRAIN_NO_ADAPTER);
  });

  it("maps train timeout and retrain-unchanged copy", () => {
    expect(
      jobErrorMessage({
        kind: "train_pack",
        status: "failed",
        lastErrorCode: "TRAIN_POLL_TIMEOUT",
        lastError: null,
      }),
    ).toBe("Training took too long. You can try Train & lock again.");
    expect(
      jobErrorMessage({
        kind: "train_pack",
        status: "failed",
        lastErrorCode: "JOB_STALLED",
        lastError: "Training stopped unexpectedly. Your previous Locked Soul ID is unchanged.",
      }),
    ).toBe("Training stopped unexpectedly. Your previous Locked Soul ID is unchanged.");
    expect(
      jobRecoveryHint({
        kind: "train_pack",
        status: "failed",
        lastErrorCode: "JOB_STALLED",
        lastError: "Training stopped unexpectedly. Your previous Locked Soul ID is unchanged.",
      }),
    ).toMatch(/previous Locked Soul ID/);
  });

  it("never surfaces stacks, prompts, or provider payloads as the Jobs note", () => {
    const view = jobQueuePresentation({
      kind: "generate_still",
      status: "failed",
      lastErrorCode: "GENERATE_STILL_FAILED",
      lastError: "Error: boom\n    at Worker.process (workers/generateStill.ts:12)\ncompiled prompt: secret pose",
      errorMessage: "providerJobId rp-secret-99 inputJson compiledPrompt",
    });
    expect(view.note).toBe("Still generation failed. Try again from Create.");
    expect(view.note).not.toMatch(/compiled prompt|at Worker|secret pose|providerJobId|inputJson/);
    expect(JSON.stringify(view)).not.toMatch(/providerJobId|inputJson|compiled prompt/);
  });
});

describe("in-progress and canceled Jobs copy", () => {
  it("shows queue-wait copy for a queued still without treating it as a failure", () => {
    const fresh = jobQueuePresentation({
      kind: "generate_still",
      status: "queued",
      ageSeconds: 3,
    });
    expect(fresh.statusLabel).toBe("Queued");
    expect(fresh.statusTone).toBe("gold");
    expect(fresh.note).toBe("Waiting in queue.");
    expect(fresh.noteTone).toBe("info");
    expect(fresh.noteCaption).toBeNull();

    const waiting = jobQueuePresentation({
      kind: "generate_still",
      status: "queued",
      ageSeconds: 12,
    });
    expect(waiting.statusLabel).toBe("Waiting");
    expect(waiting.note).toBe("Still waiting in queue.");

    const slow = jobQueuePresentation({
      kind: "generate_still",
      status: "queued",
      ageSeconds: 50,
    });
    expect(slow.note).toBe("This is taking longer than usual. You can cancel and try Generate again.");
    expect(slow.note).not.toMatch(/provider|venice|runpod|stack/i);
  });

  it("labels a running still as Generating with user-safe progress copy", () => {
    const view = jobQueuePresentation({
      kind: "generate_still",
      status: "running",
      ageSeconds: 6,
      attemptCount: 1,
    });
    expect(view.statusLabel).toBe("Generating");
    expect(view.statusTone).toBe("gold");
    expect(view.note).toBe("Generating this still…");
    expect(view.noteTone).toBe("info");
    expect(view.noteCaption).toBeNull();
  });

  it("keeps canceled distinct from Failed and never leaks provider ids", () => {
    const view = jobQueuePresentation({
      kind: "generate_still",
      status: "canceled",
      lastErrorCode: "JOB_CANCELED",
      lastError: "This still was canceled.",
      errorMessage: "providerJobId venice-secret-99",
    });
    expect(view.statusLabel).toBe("Canceled");
    expect(view.statusTone).toBe("muted");
    expect(view.note).toBe("This still was canceled.");
    expect(view.noteTone).toBe("info");
    expect(view.noteCaption).toBe("Generate again from Create.");
    expect(JSON.stringify(view)).not.toMatch(/venice-secret|providerJobId/);
  });

  it("disables Train cancel copy in the catalog without showing a cancel note on running Train", () => {
    const view = jobQueuePresentation({
      kind: "train_pack",
      status: "running",
      ageSeconds: 20,
    });
    expect(view.statusLabel).toBe("Training");
    expect(view.note).toBe("Training is in progress.");
    expect(view.noteTone).toBe("info");
  });
});
