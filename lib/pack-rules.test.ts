import { describe, expect, it } from "vitest";
import {
  TRAIN_ALREADY_RUNNING,
  canEnqueueRetrainPack,
  canEnqueueTrainPack,
  canLockDraftPack,
  canLockPack,
  lockRequiresAdapter,
  lockWarning,
} from "@/lib/pack-rules";

describe("pack lock rules", () => {
  it("requires at least 12 refs", () => {
    expect(canLockPack(11).ok).toBe(false);
    expect(canLockPack(12).ok).toBe(true);
  });

  it("warns below the target of ~20", () => {
    expect(lockWarning(12)).toMatch(/20/);
    expect(lockWarning(20)).toBeNull();
  });
});

describe("train vs lock vs retrain", () => {
  it("lets draft and failed packs Train & lock, not a pack already training", () => {
    expect(canEnqueueTrainPack("draft")).toEqual({ ok: true });
    expect(canEnqueueTrainPack("failed")).toEqual({ ok: true });
    expect(canEnqueueTrainPack("training")).toEqual({ ok: false, message: TRAIN_ALREADY_RUNNING });
    expect(canEnqueueTrainPack("locked").ok).toBe(false);
  });

  it("lets Locked packs retrain, not a second train while one is running", () => {
    expect(canEnqueueRetrainPack("locked")).toEqual({ ok: true });
    expect(canEnqueueRetrainPack("ready")).toEqual({ ok: true });
    expect(canEnqueueRetrainPack("training")).toEqual({ ok: false, message: TRAIN_ALREADY_RUNNING });
    expect(canEnqueueRetrainPack("draft").ok).toBe(false);
  });

  it("lets draft Lock Soul ID without a stored adapter", () => {
    expect(lockRequiresAdapter()).toBe(false);
    expect(canLockDraftPack("draft")).toEqual({ ok: true });
    expect(canLockDraftPack("training")).toEqual({ ok: false, message: TRAIN_ALREADY_RUNNING });
    expect(canLockDraftPack("locked").ok).toBe(false);
  });
});
