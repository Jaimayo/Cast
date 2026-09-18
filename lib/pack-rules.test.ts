import { describe, expect, it } from "vitest";
import { canLockPack, lockWarning } from "@/lib/pack-rules";

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
