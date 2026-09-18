import { describe, expect, it } from "vitest";
import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import { assertGenerateStillAllowed, requirePoseForGenerate } from "@/lib/generate-policy";
import { LOCK_SOUL_ID_FIRST, requireLockedSoulForGenerate } from "@/lib/soul";

describe("generateStill Locked + Pose server gate", () => {
  it("requires a Locked Soul ID", () => {
    expect(() => requireLockedSoulForGenerate("locked")).not.toThrow();
    expect(() => requireLockedSoulForGenerate("ready")).not.toThrow();
    for (const status of ["draft", "training", "failed"]) {
      expect(() => requireLockedSoulForGenerate(status)).toThrow(LOCK_SOUL_ID_FIRST);
    }
  });

  it("requires a real pose chip", () => {
    expect(() => requirePoseForGenerate("standing-neutral")).not.toThrow();
    expect(() => requirePoseForGenerate("")).toThrow(JobError);
    try {
      requirePoseForGenerate("");
      throw new Error("expected throw");
    } catch (err) {
      expect((err as JobError).code).toBe(JOB_ERROR_CODES.POSE_REQUIRED);
    }
    try {
      requirePoseForGenerate("softbox");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(JobError);
      expect((err as JobError).code).toBe(JOB_ERROR_CODES.INVALID_CHIP);
      expect((err as JobError).userMessage).not.toMatch(/expected pose|softbox/i);
    }
  });

  it("enforces both Locked and Pose together", () => {
    expect(() =>
      assertGenerateStillAllowed({ packStatus: "locked", poseChipId: "standing-neutral" }),
    ).not.toThrow();
    try {
      assertGenerateStillAllowed({ packStatus: "draft", poseChipId: "standing-neutral" });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(JobError);
      expect((err as JobError).code).toBe(JOB_ERROR_CODES.PACK_NOT_LOCKED);
    }
    expect(() => assertGenerateStillAllowed({ packStatus: "locked", poseChipId: "" })).toThrow(JobError);
  });
});
