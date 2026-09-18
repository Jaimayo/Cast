import { describe, expect, it } from "vitest";
import { JOB_ERROR_CODES, JobError, shouldRetryJob } from "@/lib/job-errors";
import {
  applyStubGenerateScenario,
  applyStubTrainScenario,
  parseStubJobScenario,
  resolveStubGenerateOutcome,
  resolveStubTrainOutcome,
  stubScenarioFromEnv,
  stubTrainOmitsAdapter,
} from "@/lib/stub-job-scenario";

describe("parseStubJobScenario", () => {
  it("defaults to succeed for empty, unknown, or off values", () => {
    expect(parseStubJobScenario(undefined)).toBe("succeed");
    expect(parseStubJobScenario("")).toBe("succeed");
    expect(parseStubJobScenario("none")).toBe("succeed");
    expect(parseStubJobScenario("off")).toBe("succeed");
    expect(parseStubJobScenario("not-a-scenario")).toBe("succeed");
    expect(parseStubJobScenario("FAIL-GENERATE")).toBe("fail-generate");
  });

  it("reads STUB_JOB_SCENARIO from env", () => {
    expect(stubScenarioFromEnv({ STUB_JOB_SCENARIO: "timeout-train" })).toBe("timeout-train");
    expect(stubScenarioFromEnv({})).toBe("succeed");
  });
});

describe("stub generate failure + retry paths", () => {
  it("fails Generate closed for timeout, missing adapter, stall, and hard fail", () => {
    expect(resolveStubGenerateOutcome({ scenario: "fail-generate" })).toMatchObject({
      action: "fail",
      error: { code: JOB_ERROR_CODES.GENERATE_STILL_FAILED, retryable: false },
    });
    expect(resolveStubGenerateOutcome({ scenario: "timeout-generate" })).toMatchObject({
      action: "fail",
      error: { code: JOB_ERROR_CODES.GENERATE_TIMEOUT, retryable: false },
    });
    expect(resolveStubGenerateOutcome({ scenario: "missing-adapter" })).toMatchObject({
      action: "fail",
      error: { code: JOB_ERROR_CODES.GENERATE_MISSING_ADAPTER, retryable: false },
    });
    expect(resolveStubGenerateOutcome({ scenario: "queue-stall" })).toMatchObject({
      action: "fail",
      error: { code: JOB_ERROR_CODES.JOB_STALLED, retryable: false },
    });
  });

  it("retries provider/network errors then succeeds on attempt 3", () => {
    const first = resolveStubGenerateOutcome({ scenario: "retry-then-succeed", attempt: 1 });
    expect(first.action).toBe("fail");
    if (first.action === "fail") {
      expect(first.error.code).toBe(JOB_ERROR_CODES.NETWORK_ERROR);
      expect(first.error.retryable).toBe(true);
      expect(shouldRetryJob(first.error, { attempt: 1, maxAttempts: 5 })).toBe(true);
    }
    expect(resolveStubGenerateOutcome({ scenario: "retry-then-succeed", attempt: 2 }).action).toBe(
      "fail",
    );
    expect(resolveStubGenerateOutcome({ scenario: "retry-then-succeed", attempt: 3 })).toEqual({
      action: "succeed",
    });

    const busy = resolveStubGenerateOutcome({ scenario: "provider-error-generate", attempt: 1 });
    expect(busy.action).toBe("fail");
    if (busy.action === "fail") {
      expect(busy.error.code).toBe(JOB_ERROR_CODES.PROVIDER_HTTP_ERROR);
      expect(busy.error.retryable).toBe(true);
      expect(busy.error.userMessage).not.toMatch(/prompt|Bearer|stack/i);
    }
  });

  it("throws JobError from apply helpers so workers can classify", () => {
    expect(() => applyStubGenerateScenario({ scenario: "fail-generate" })).toThrow(JobError);
    expect(() => applyStubTrainScenario({ scenario: "timeout-train" })).toThrow(JobError);
    expect(() => applyStubGenerateScenario({ scenario: "succeed" })).not.toThrow();
    expect(() => applyStubTrainScenario({ scenario: "succeed" })).not.toThrow();
  });
});

describe("stub train failure + retry paths", () => {
  it("fails Train closed for timeout, stall, and hard fail", () => {
    expect(resolveStubTrainOutcome({ scenario: "fail-train" })).toMatchObject({
      action: "fail",
      error: { code: JOB_ERROR_CODES.TRAIN_PACK_FAILED, retryable: false },
    });
    expect(resolveStubTrainOutcome({ scenario: "timeout-train" })).toMatchObject({
      action: "fail",
      error: { code: JOB_ERROR_CODES.TRAIN_POLL_TIMEOUT, retryable: false },
    });
    expect(resolveStubTrainOutcome({ scenario: "queue-stall" })).toMatchObject({
      action: "fail",
      error: { code: JOB_ERROR_CODES.JOB_STALLED, retryable: false },
    });
  });

  it("omits the adapter pointer so persist fails closed (TRAIN_NO_ADAPTER)", () => {
    expect(stubTrainOmitsAdapter("no-adapter")).toBe(true);
    expect(stubTrainOmitsAdapter("succeed")).toBe(false);
    expect(resolveStubTrainOutcome({ scenario: "no-adapter" })).toEqual({ action: "succeed" });
  });

  it("retries train network errors then succeeds", () => {
    const first = resolveStubTrainOutcome({ scenario: "retry-then-succeed", attempt: { attempt: 1, maxAttempts: 5 } });
    expect(first.action).toBe("fail");
    if (first.action === "fail") {
      expect(shouldRetryJob(first.error, { attempt: 1, maxAttempts: 5 })).toBe(true);
    }
    expect(resolveStubTrainOutcome({ scenario: "retry-then-succeed", attempt: 3 })).toEqual({
      action: "succeed",
    });
  });
});
