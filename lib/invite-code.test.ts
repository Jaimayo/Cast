import { describe, expect, it } from "vitest";
import { newInviteCode } from "@/lib/invite-code";

describe("newInviteCode", () => {
  it("mints a 12-character hex code", () => {
    const code = newInviteCode();
    expect(code).toMatch(/^[0-9a-f]{12}$/);
    expect(newInviteCode()).not.toBe(code);
  });
});
