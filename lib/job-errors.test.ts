import { describe, expect, it } from "vitest";
import { LOCK_SOUL_ID_FIRST } from "@/lib/soul";
import {
  GENERATE_STILL_MAX_ATTEMPTS,
  JOB_ERROR_CODES,
  JobError,
  classifyJobError,
  httpStatusFromMessage,
  isPermanentCode,
  isRetryableHttpStatus,
  jobAttemptFromBullmq,
  keepLockedAfterTrainFail,
  shouldRetryJob,
  trainPackFailureMessage,
  trainPackStalledMessage,
  trainPackTimeoutMessage,
  generateStillBullJobId,
  trainPackBullJobId,
  isDuplicateBullJobError,
  trainSubmitDecision,
  userSafeLastError,
  jobAgeSeconds,
  jobAttemptCount,
} from "@/lib/job-errors";

describe("HTTP retry classification", () => {
  it("retries transient provider statuses only", () => {
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(500)).toBe(true);
    expect(isRetryableHttpStatus(502)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(504)).toBe(true);
    expect(isRetryableHttpStatus(408)).toBe(true);
    expect(isRetryableHttpStatus(400)).toBe(false);
    expect(isRetryableHttpStatus(401)).toBe(false);
    expect(isRetryableHttpStatus(403)).toBe(false);
    expect(isRetryableHttpStatus(404)).toBe(false);
    expect(isRetryableHttpStatus(422)).toBe(false);
  });

  it("reads HTTP status from provider error messages", () => {
    expect(httpStatusFromMessage("Venice generateStill failed with HTTP 503")).toBe(503);
    expect(httpStatusFromMessage("RunPod request failed with HTTP 429")).toBe(429);
    expect(httpStatusFromMessage("no status here")).toBeNull();
  });
});

describe("classifyJobError", () => {
  it("does not retry validation: bad chips, missing Locked Soul ID, pack state", () => {
    expect(classifyJobError(new Error("Unknown chip: not-a-chip"))).toMatchObject({
      code: JOB_ERROR_CODES.INVALID_CHIP,
      retryable: false,
    });
    expect(classifyJobError(new Error("Chip softbox is family lighting, expected pose"))).toMatchObject({
      code: JOB_ERROR_CODES.INVALID_CHIP,
      retryable: false,
    });
    expect(classifyJobError(new Error("Pose is required"))).toMatchObject({
      code: JOB_ERROR_CODES.INVALID_CHIP,
      retryable: false,
    });
    expect(classifyJobError(new Error("Unknown starter preset: nope"))).toMatchObject({
      code: JOB_ERROR_CODES.INVALID_STARTER,
      retryable: false,
    });
    expect(
      classifyJobError(new Error("Need at least 12 training refs to lock (have 7; target ~20).")),
    ).toMatchObject({
      code: JOB_ERROR_CODES.PACK_REFS_TOO_FEW,
      retryable: false,
    });
    expect(classifyJobError(new Error("This pack already has 20 training refs. Remove one to add another."))).toMatchObject({
      code: JOB_ERROR_CODES.PACK_REFS_FULL,
      retryable: false,
    });
    expect(isPermanentCode(JOB_ERROR_CODES.PACK_REFS_TOO_FEW)).toBe(true);
    expect(isPermanentCode(JOB_ERROR_CODES.PACK_REFS_FULL)).toBe(true);
    expect(classifyJobError(new Error(LOCK_SOUL_ID_FIRST))).toMatchObject({
      code: JOB_ERROR_CODES.PACK_NOT_LOCKED,
      retryable: false,
      userMessage: LOCK_SOUL_ID_FIRST,
    });
    expect(classifyJobError(new Error("Character pack not found"))).toMatchObject({
      code: JOB_ERROR_CODES.PACK_NOT_FOUND,
      retryable: false,
    });
    expect(classifyJobError(new Error("generateStill requires a character pack"))).toMatchObject({
      code: JOB_ERROR_CODES.INVALID_PACK_STATE,
      retryable: false,
    });
    expect(isPermanentCode(JOB_ERROR_CODES.INVALID_CHIP)).toBe(true);
    expect(isPermanentCode(JOB_ERROR_CODES.PACK_NOT_LOCKED)).toBe(true);
  });

  it("does not retry missing provider config or capability errors", () => {
    const notConfigured = new Error("venice is not configured (missing API key or endpoint)");
    notConfigured.name = "ProviderNotConfiguredError";
    expect(classifyJobError(notConfigured)).toMatchObject({
      code: JOB_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      retryable: false,
    });

    const capability = new Error("Venice has no Soul-ID / train API.");
    capability.name = "ProviderCapabilityError";
    expect(classifyJobError(capability)).toMatchObject({
      code: JOB_ERROR_CODES.PROVIDER_CAPABILITY,
      retryable: false,
    });
  });

  it("retries transient provider HTTP, network, and generate timeouts", () => {
    expect(classifyJobError(new Error("Venice generateStill failed with HTTP 503"))).toMatchObject({
      code: JOB_ERROR_CODES.PROVIDER_HTTP_ERROR,
      retryable: true,
    });
    expect(classifyJobError(new Error("RunPod request failed with HTTP 429"))).toMatchObject({
      code: JOB_ERROR_CODES.PROVIDER_HTTP_ERROR,
      retryable: true,
    });
    expect(classifyJobError(new Error("fetch failed"))).toMatchObject({
      code: JOB_ERROR_CODES.NETWORK_ERROR,
      retryable: true,
    });
    const reset = new Error("read ECONNRESET");
    expect(classifyJobError(reset)).toMatchObject({
      code: JOB_ERROR_CODES.NETWORK_ERROR,
      retryable: true,
    });
    expect(classifyJobError(new Error("RunPod generateStill polling timed out"))).toMatchObject({
      code: JOB_ERROR_CODES.PROVIDER_TIMEOUT,
      retryable: true,
    });
  });

  it("does not retry 4xx provider rejections (except rate-limit / timeout)", () => {
    expect(classifyJobError(new Error("Venice generateStill failed with HTTP 400"))).toMatchObject({
      code: JOB_ERROR_CODES.PROVIDER_HTTP_ERROR,
      retryable: false,
    });
    expect(classifyJobError(new Error("RunPod request failed with HTTP 401"))).toMatchObject({
      code: JOB_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      retryable: false,
    });
  });

  it("classifies ProviderHttpError-like objects by numeric status", () => {
    const err = Object.assign(new Error("runpod failed with HTTP 429"), {
      name: "ProviderHttpError",
      status: 429,
    });
    expect(classifyJobError(err)).toMatchObject({
      code: JOB_ERROR_CODES.PROVIDER_HTTP_ERROR,
      retryable: true,
    });
  });

  it("does not retry stalled jobs", () => {
    expect(classifyJobError(new Error("This job stopped unexpectedly. Try again."))).toMatchObject({
      code: JOB_ERROR_CODES.JOB_STALLED,
      retryable: false,
    });
  });

  it("treats train poll timeout as a terminal failure code", () => {
    expect(classifyJobError(new Error("Train pack polling timed out"))).toMatchObject({
      code: JOB_ERROR_CODES.TRAIN_POLL_TIMEOUT,
      retryable: false,
    });
  });

  it("uses JobError fields as-is and keeps user-safe copy", () => {
    const err = new JobError({
      code: JOB_ERROR_CODES.INVALID_CHIP,
      retryable: false,
    });
    const classified = classifyJobError(err);
    expect(classified.code).toBe(JOB_ERROR_CODES.INVALID_CHIP);
    expect(classified.retryable).toBe(false);
    expect(classified.userMessage).not.toMatch(/prompt|lora|Bearer/i);
  });

  it("does not leak provider payloads into user-safe messages", () => {
    const classified = classifyJobError(new Error("GENERATE_STILL_FAILED: prompt=secret lora bytes"));
    expect(classified.userMessage).toBe("Still generation failed. Try again from Create.");
    expect(classified.userMessage).not.toContain("secret");
  });
});

describe("shouldRetryJob", () => {
  it("retries transient errors until the last attempt", () => {
    const transient = classifyJobError(new Error("fetch failed"));
    expect(shouldRetryJob(transient, { attempt: 1, maxAttempts: GENERATE_STILL_MAX_ATTEMPTS })).toBe(true);
    expect(shouldRetryJob(transient, { attempt: 5, maxAttempts: 5 })).toBe(false);
    const permanent = classifyJobError(new Error(LOCK_SOUL_ID_FIRST));
    expect(shouldRetryJob(permanent, { attempt: 1, maxAttempts: 5 })).toBe(false);
  });

  it("reads BullMQ attemptsMade as the current 1-based attempt", () => {
    expect(jobAttemptFromBullmq({ attemptsMade: 0, opts: { attempts: 5 } })).toEqual({
      attempt: 1,
      maxAttempts: 5,
    });
    expect(jobAttemptFromBullmq({ attemptsMade: 1, opts: { attempts: 5 } })).toEqual({
      attempt: 1,
      maxAttempts: 5,
    });
    expect(jobAttemptFromBullmq({ attemptsMade: 5, opts: { attempts: 5 } })).toEqual({
      attempt: 5,
      maxAttempts: 5,
    });
  });
});

describe("train failure copy", () => {
  it("keeps prior Locked Soul ID language when retrain fails", () => {
    expect(keepLockedAfterTrainFail({ retrain: true, adapterStorageKey: "adapters/u/p.lora" })).toBe(true);
    expect(keepLockedAfterTrainFail({ retrain: true, adapterStorageKey: null })).toBe(false);
    expect(keepLockedAfterTrainFail({ retrain: false, adapterStorageKey: "adapters/u/p.lora" })).toBe(false);
    expect(trainPackFailureMessage(true)).toMatch(/previous Locked Soul ID is unchanged/);
    expect(trainPackFailureMessage(false)).toMatch(/Train & lock again/);
    expect(trainPackTimeoutMessage(true)).toMatch(/previous Locked Soul ID is unchanged/);
    expect(trainPackStalledMessage(true)).toMatch(/previous Locked Soul ID is unchanged/);
  });
});

describe("idempotent BullMQ ids and train submit", () => {
  it("keys generate/train jobs on generationJobId", () => {
    expect(generateStillBullJobId("job-1")).toBe("generateStill:job-1");
    expect(trainPackBullJobId("job-1")).toBe("trainPack:job-1");
    expect(trainPackBullJobId("job-1", 3)).toBe("trainPack:job-1:poll:3");
    expect(isDuplicateBullJobError(new Error("Job trainPack:job-1 already exists"))).toBe(true);
  });

  it("does not resubmit trainPack after the first /run", () => {
    expect(trainSubmitDecision({ providerJobId: "rp_1", submitAttempted: true })).toBe("poll");
    expect(trainSubmitDecision({ providerJobId: null, submitAttempted: false })).toBe("submit");
    expect(trainSubmitDecision({ providerJobId: "  ", submitAttempted: true })).toBe("fail-in-flight");
  });
});

describe("jobs observability helpers", () => {
  it("maps lastError to user-safe copy, never stacks or prompts", () => {
    expect(userSafeLastError("NETWORK_ERROR", "Network error talking to the image service. Try again.")).toBe(
      "Network error talking to the image service. Try again.",
    );
    expect(userSafeLastError("TRAIN_PACK_FAILED", null)).toBe("Training failed. You can try Train & lock again.");
    expect(userSafeLastError("NOT_A_REAL_CODE", null)).toBe("This job failed. Try again.");
    expect(userSafeLastError(null, null)).toBeNull();
    expect(
      userSafeLastError(
        "GENERATE_STILL_FAILED",
        "Error: boom\n    at Worker.process (node_modules/bullmq/dist/cjs/worker.js:1)",
      ),
    ).toBe("Still generation failed. Try again from Create.");
    expect(userSafeLastError("GENERATE_STILL_FAILED", "compiled prompt: a woman in pose x")).toBe(
      "Still generation failed. Try again from Create.",
    );
  });

  it("counts job age from createdAt and clamps attempts", () => {
    const now = new Date("2026-09-18T09:00:00.000Z");
    expect(jobAgeSeconds(new Date("2026-09-18T08:59:10.000Z"), now)).toBe(50);
    expect(jobAgeSeconds("2026-09-18T08:00:00.000Z", now)).toBe(3600);
    expect(jobAgeSeconds(null, now)).toBe(0);
    expect(jobAgeSeconds(new Date("2026-09-18T10:00:00.000Z"), now)).toBe(0);
    expect(jobAttemptCount(3)).toBe(3);
    expect(jobAttemptCount(0)).toBe(0);
    expect(jobAttemptCount(-2)).toBe(0);
    expect(jobAttemptCount(undefined)).toBe(0);
  });
});
