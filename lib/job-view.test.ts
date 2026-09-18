import { describe, expect, it } from "vitest";
import { GENERATE_STILL_MAX_ATTEMPTS, JOB_ERROR_CODES, TRAIN_PACK_MAX_ATTEMPTS } from "@/lib/job-errors";
import {
  formatJobAge,
  formatJobAttempts,
  lastErrorFromJob,
  maxAttemptsForKind,
  persistedJobAttempt,
  publicJob,
} from "@/lib/job-view";

const NOW = new Date("2026-09-18T12:00:00.000Z");

describe("Jobs API public shape", () => {
  it("exposes age, attempts, and lastError without storage keys or input JSON", () => {
    const job = publicJob(
      {
        id: "job-1",
        kind: "generate_still",
        status: "failed",
        provider: "venice",
        characterPackId: "pack-1",
        createdAt: new Date("2026-09-18T11:58:00.000Z"),
        updatedAt: new Date("2026-09-18T11:59:10.000Z"),
        attempt: 3,
        errorCode: JOB_ERROR_CODES.PROVIDER_HTTP_ERROR,
        errorMessage: "The image service is temporarily unavailable. Try again in a moment.",
        resultAssetKey: "still/u1/job-1.webp",
        inputJson: { poseChipId: "pose_stand", compiledPrompt: "secret prompt" },
        userId: "user-1",
        providerJobId: "rp-secret",
        recipeId: "recipe-1",
        previewUrl: "/api/media/asset-1",
      },
      NOW,
    );

    expect(job).toEqual({
      id: "job-1",
      kind: "generate_still",
      status: "failed",
      provider: "venice",
      characterPackId: "pack-1",
      createdAt: "2026-09-18T11:58:00.000Z",
      updatedAt: "2026-09-18T11:59:10.000Z",
      ageMs: 120_000,
      durationMs: 70_000,
      attempt: 3,
      maxAttempts: GENERATE_STILL_MAX_ATTEMPTS,
      errorCode: JOB_ERROR_CODES.PROVIDER_HTTP_ERROR,
      errorMessage: "The image service is temporarily unavailable. Try again in a moment.",
      lastError: {
        code: JOB_ERROR_CODES.PROVIDER_HTTP_ERROR,
        message: "The image service is temporarily unavailable. Try again in a moment.",
      },
      previewUrl: "/api/media/asset-1",
    });
    expect(JSON.stringify(job)).not.toMatch(/still\/u1|resultAssetKey|compiledPrompt|rp-secret|user-1|recipe/i);
  });

  it("ignores Array.map index so test-grid can map(publicJob)", () => {
    const rows = [
      {
        id: "job-map",
        kind: "generate_still" as const,
        status: "queued",
        createdAt: new Date("2026-09-18T11:59:50.000Z"),
      },
    ];
    const [mapped] = rows.map(publicJob);
    expect(mapped?.ageMs).toBeGreaterThanOrEqual(0);
    expect(mapped?.lastError).toBeNull();
    expect(mapped?.attempt).toBe(0);
  });

  it("uses live age as duration while queued or running, and null lastError when clean", () => {
    const running = publicJob(
      {
        id: "job-2",
        kind: "train_pack",
        status: "running",
        provider: "runpod",
        createdAt: new Date("2026-09-18T11:50:00.000Z"),
        updatedAt: new Date("2026-09-18T11:55:00.000Z"),
        attempt: 12,
      },
      NOW,
    );
    expect(running.ageMs).toBe(10 * 60_000);
    expect(running.durationMs).toBe(10 * 60_000);
    expect(running.attempt).toBe(12);
    expect(running.maxAttempts).toBe(TRAIN_PACK_MAX_ATTEMPTS);
    expect(running.lastError).toBeNull();
    expect(running.errorCode).toBeNull();
    expect(running.errorMessage).toBeNull();
  });

  it("keeps lastError on a retrying job so Jobs can show the previous failure", () => {
    const retrying = publicJob(
      {
        id: "job-3",
        kind: "generate_starter",
        status: "queued",
        provider: "venice",
        createdAt: new Date("2026-09-18T11:59:30.000Z"),
        updatedAt: new Date("2026-09-18T11:59:50.000Z"),
        attempt: 2,
        errorCode: JOB_ERROR_CODES.NETWORK_ERROR,
        errorMessage: "Network error talking to the image service. Try again.",
      },
      NOW,
    );
    expect(retrying.status).toBe("queued");
    expect(retrying.attempt).toBe(2);
    expect(retrying.lastError).toEqual({
      code: JOB_ERROR_CODES.NETWORK_ERROR,
      message: "Network error talking to the image service. Try again.",
    });
    expect(retrying.errorCode).toBe(JOB_ERROR_CODES.NETWORK_ERROR);
    expect(retrying.errorMessage).toBe(retrying.lastError?.message);
  });

  it("fills lastError.message from the catalog when only error_code is stored", () => {
    expect(
      lastErrorFromJob({ errorCode: JOB_ERROR_CODES.JOB_STALLED, errorMessage: null }),
    ).toEqual({
      code: JOB_ERROR_CODES.JOB_STALLED,
      message: "This job stopped unexpectedly. Try again.",
    });
    expect(lastErrorFromJob({ errorCode: null, errorMessage: null })).toBeNull();
    expect(lastErrorFromJob({ errorCode: "  ", errorMessage: "  " })).toBeNull();
  });
});

describe("Jobs UI labels", () => {
  it("formats age in plain seconds, minutes, and hours", () => {
    expect(formatJobAge(0)).toBe("0s");
    expect(formatJobAge(12_000)).toBe("12s");
    expect(formatJobAge(3 * 60_000)).toBe("3m");
    expect(formatJobAge(64 * 60_000)).toBe("1h 4m");
    expect(formatJobAge(2 * 60 * 60_000)).toBe("2h");
  });

  it("shows retry budget until train poll count exceeds it", () => {
    expect(formatJobAttempts(0, 5)).toBe("0");
    expect(formatJobAttempts(2, 5)).toBe("2 / 5");
    expect(formatJobAttempts(12, TRAIN_PACK_MAX_ATTEMPTS)).toBe("12");
    expect(maxAttemptsForKind("generate_still")).toBe(GENERATE_STILL_MAX_ATTEMPTS);
    expect(maxAttemptsForKind("generate_starter")).toBe(GENERATE_STILL_MAX_ATTEMPTS);
    expect(maxAttemptsForKind("train_pack")).toBe(TRAIN_PACK_MAX_ATTEMPTS);
  });

  it("persists the higher of BullMQ retries and train poll touches", () => {
    expect(persistedJobAttempt({ workerAttempt: 1 })).toBe(1);
    expect(persistedJobAttempt({ workerAttempt: 3 })).toBe(3);
    expect(persistedJobAttempt({ workerAttempt: 1, pollAttempt: 0 })).toBe(1);
    expect(persistedJobAttempt({ workerAttempt: 1, pollAttempt: 11 })).toBe(12);
    expect(persistedJobAttempt({ workerAttempt: 4, pollAttempt: 1 })).toBe(4);
  });
});
