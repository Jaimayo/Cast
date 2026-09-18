import { describe, expect, it } from "vitest";
import { PACK_MIN_REFS, PACK_TARGET_REFS } from "@/lib/constants";
import {
  PACK_REFS_FULL,
  PACK_REFS_TOO_FEW,
  attachRefDecision,
  canLockPack,
  generateStarterPackDecision,
  lockPackDecision,
  lockWarning,
  packRefsFullMessage,
  packRefsTooFewMessage,
  retrainPackDecision,
  trainPackDecision,
} from "@/lib/pack-rules";

describe("pack lock rules", () => {
  it("requires at least 12 refs", () => {
    expect(canLockPack(11)).toMatchObject({ ok: false, code: PACK_REFS_TOO_FEW });
    expect(canLockPack(12).ok).toBe(true);
    expect(packRefsTooFewMessage(7)).toBe(
      `Need at least ${PACK_MIN_REFS} training refs to lock (have 7; target ~${PACK_TARGET_REFS}).`,
    );
  });

  it("warns below the target of ~20", () => {
    expect(lockWarning(12)).toMatch(/20/);
    expect(lockWarning(20)).toBeNull();
  });

  it("refuses lock below min-12 with a clear count, even on draft", () => {
    const gate = lockPackDecision("draft", 11);
    expect(gate).toMatchObject({
      ok: false,
      code: PACK_REFS_TOO_FEW,
    });
    if (!gate.ok) {
      expect(gate.message).toContain("11");
      expect(gate.message).toContain("12");
    }
    expect(lockPackDecision("draft", 12).ok).toBe(true);
    expect(lockPackDecision("training", 20)).toMatchObject({
      ok: false,
      code: "INVALID_PACK_STATE",
    });
  });

  it("allows Train & lock on draft or failed only after min-12", () => {
    expect(trainPackDecision("draft", 12).ok).toBe(true);
    expect(trainPackDecision("failed", 12).ok).toBe(true);
    expect(trainPackDecision("draft", 4)).toMatchObject({ ok: false, code: PACK_REFS_TOO_FEW });
    expect(trainPackDecision("locked", 20)).toMatchObject({
      ok: false,
      code: "INVALID_PACK_STATE",
    });
  });

  it("refuses a second Retrain while training is already running", () => {
    expect(retrainPackDecision("locked", 12).ok).toBe(true);
    expect(retrainPackDecision("ready", 20).ok).toBe(true);
    expect(retrainPackDecision("training", 20)).toMatchObject({
      ok: false,
      code: "INVALID_PACK_STATE",
    });
    const training = retrainPackDecision("training", 20);
    if (!training.ok) {
      expect(training.message).toMatch(/already running/);
    }
    expect(retrainPackDecision("draft", 20)).toMatchObject({
      ok: false,
      code: "INVALID_PACK_STATE",
    });
    expect(retrainPackDecision("locked", 4)).toMatchObject({ ok: false, code: PACK_REFS_TOO_FEW });
  });
});

describe("training-set attach rules", () => {
  it("treats a second attach of the same ref as a no-op, not a duplicate row", () => {
    expect(
      attachRefDecision({ wantSelected: true, alreadyAttached: true, refCount: 20 }),
    ).toEqual({ action: "noop-selected" });
    expect(
      attachRefDecision({ wantSelected: false, alreadyAttached: false, refCount: 0 }),
    ).toEqual({ action: "noop-unselected" });
  });

  it("inserts until the ~20 cap, then rejects with PACK_REFS_FULL", () => {
    expect(
      attachRefDecision({ wantSelected: true, alreadyAttached: false, refCount: 19 }),
    ).toEqual({ action: "insert" });
    expect(
      attachRefDecision({ wantSelected: true, alreadyAttached: false, refCount: 20 }),
    ).toEqual({
      action: "reject",
      code: PACK_REFS_FULL,
      message: packRefsFullMessage(),
    });
    expect(
      attachRefDecision({ wantSelected: true, alreadyAttached: false, refCount: 21 }),
    ).toMatchObject({ action: "reject", code: PACK_REFS_FULL });
  });

  it("detaches an attached ref", () => {
    expect(
      attachRefDecision({ wantSelected: false, alreadyAttached: true, refCount: 12 }),
    ).toEqual({ action: "delete" });
  });
});

describe("generate-starter pack gate", () => {
  it("only queues starters onto a draft pack", () => {
    expect(generateStarterPackDecision("draft").ok).toBe(true);
    expect(generateStarterPackDecision("locked")).toMatchObject({
      ok: false,
      code: "INVALID_PACK_STATE",
    });
    expect(generateStarterPackDecision("training")).toMatchObject({ ok: false });
  });
});
