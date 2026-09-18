import { describe, expect, it } from "vitest";
import { STALE_GENERATE_MS, STALE_TRAIN_MS, decideStaleJob, staleScanCutoff } from "@/lib/job-stale";

const now = new Date("2026-09-18T12:00:00.000Z");

function ago(ms: number): Date {
  return new Date(now.getTime() - ms);
}

describe("decideStaleJob", () => {
  it("leaves fresh queued/running jobs alone", () => {
    expect(
      decideStaleJob({
        kind: "generate_still",
        status: "running",
        updatedAt: ago(60_000),
        now,
        providerJobId: null,
      }),
    ).toEqual({ action: "ok" });
    expect(
      decideStaleJob({
        kind: "train_pack",
        status: "running",
        updatedAt: ago(30_000),
        now,
        providerJobId: "runpod-1",
      }),
    ).toEqual({ action: "ok" });
  });

  it("ignores terminal statuses", () => {
    expect(
      decideStaleJob({
        kind: "generate_still",
        status: "succeeded",
        updatedAt: ago(STALE_GENERATE_MS * 2),
        now,
      }),
    ).toEqual({ action: "ok" });
    expect(
      decideStaleJob({
        kind: "train_pack",
        status: "failed",
        updatedAt: ago(STALE_TRAIN_MS * 2),
        now,
      }),
    ).toEqual({ action: "ok" });
  });

  it("fails a generateStill job that has been running past the stale window", () => {
    expect(
      decideStaleJob({
        kind: "generate_still",
        status: "running",
        updatedAt: ago(STALE_GENERATE_MS + 1),
        now,
        providerJobId: null,
      }),
    ).toEqual({ action: "fail" });
    expect(
      decideStaleJob({
        kind: "generate_starter",
        status: "queued",
        updatedAt: ago(STALE_GENERATE_MS + 1),
        now,
      }),
    ).toEqual({ action: "fail" });
  });

  it("requeues train polling when a provider job id exists", () => {
    expect(
      decideStaleJob({
        kind: "train_pack",
        status: "running",
        updatedAt: ago(STALE_TRAIN_MS + 1),
        now,
        providerJobId: "runpod-train-1",
      }),
    ).toEqual({ action: "requeue_train_poll" });
  });

  it("fails a train job that never received a provider id (worker crash before enqueue)", () => {
    expect(
      decideStaleJob({
        kind: "train_pack",
        status: "running",
        updatedAt: ago(STALE_TRAIN_MS + 1),
        now,
        providerJobId: null,
      }),
    ).toEqual({ action: "fail" });
  });

  it("does not treat a generate job as stale at the train window", () => {
    expect(
      decideStaleJob({
        kind: "generate_still",
        status: "running",
        updatedAt: ago(STALE_TRAIN_MS + 1),
        now,
      }),
    ).toEqual({ action: "ok" });
  });

  it("uses the shorter window as the DB scan cutoff", () => {
    expect(staleScanCutoff(now).getTime()).toBe(now.getTime() - STALE_TRAIN_MS);
  });
});
