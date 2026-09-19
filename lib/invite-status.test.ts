import { describe, expect, it } from "vitest";
import { AuthError } from "@/lib/auth-error";
import {
  INVITE_ERROR_MESSAGE,
  classifyInvite,
  inviteRedeemBodySchema,
  normalizeInviteCode,
  throwIfInviteUnusable,
} from "@/lib/invite-status";

const now = new Date("2026-09-18T12:00:00.000Z");

function invite(overrides: Partial<Parameters<typeof classifyInvite>[0]> = {}) {
  return {
    revokedAt: null,
    expiresAt: null,
    useCount: 0,
    maxUses: 1,
    ...overrides,
  };
}

describe("classifyInvite", () => {
  it("treats a missing code as invalid", () => {
    expect(classifyInvite(null, now)).toBe("invalid");
    expect(classifyInvite(undefined, now)).toBe("invalid");
  });

  it("returns revoked before used or expired", () => {
    expect(
      classifyInvite(
        invite({
          revokedAt: "2026-09-01T00:00:00.000Z",
          useCount: 1,
          expiresAt: "2026-01-01T00:00:00.000Z",
        }),
        now,
      ),
    ).toBe("revoked");
  });

  it("enforces maxUses, including a fully consumed multi-use code", () => {
    expect(classifyInvite(invite({ useCount: 0, maxUses: 1 }), now)).toBe("ok");
    expect(classifyInvite(invite({ useCount: 1, maxUses: 1 }), now)).toBe("used");
    expect(classifyInvite(invite({ useCount: 2, maxUses: 5 }), now)).toBe("ok");
    expect(classifyInvite(invite({ useCount: 5, maxUses: 5 }), now)).toBe("used");
    expect(classifyInvite(invite({ useCount: 0, maxUses: 0 }), now)).toBe("used");
  });

  it("returns expired for an unused code past expiresAt, and ok at the boundary before", () => {
    expect(
      classifyInvite(invite({ expiresAt: "2026-09-18T11:59:59.000Z" }), now),
    ).toBe("expired");
    expect(
      classifyInvite(invite({ expiresAt: "2026-09-18T12:00:00.000Z" }), now),
    ).toBe("expired");
    expect(
      classifyInvite(invite({ expiresAt: "2026-09-18T12:00:01.000Z" }), now),
    ).toBe("ok");
  });

  it("prefers used over expired when the code is already consumed", () => {
    expect(
      classifyInvite(
        invite({ useCount: 1, maxUses: 1, expiresAt: "2026-01-01T00:00:00.000Z" }),
        now,
      ),
    ).toBe("used");
  });

  it("treats a second concurrent redeem as used after the first increment", () => {
    const afterFirst = invite({ useCount: 1, maxUses: 1 });
    expect(classifyInvite(afterFirst, now)).toBe("used");
  });
});

describe("invite error copy", () => {
  it("maps each issue to a distinct product error", () => {
    expect(INVITE_ERROR_MESSAGE.invalid).toBe("This invite code is invalid.");
    expect(INVITE_ERROR_MESSAGE.used).toBe("This invite code has already been used.");
    expect(INVITE_ERROR_MESSAGE.expired).toBe("This invite code has expired.");
    expect(INVITE_ERROR_MESSAGE.revoked).toBe("This invite code has been revoked.");
  });

  it("throws AuthError 400 for unusable codes", () => {
    expect(() => throwIfInviteUnusable("ok")).not.toThrow();
    try {
      throwIfInviteUnusable("revoked");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).status).toBe(400);
      expect((err as AuthError).message).toBe(INVITE_ERROR_MESSAGE.revoked);
    }
  });

  it("trims pasted invite codes", () => {
    expect(normalizeInviteCode("  abcd1234efgh  ")).toBe("abcd1234efgh");
  });

  it("maps a too-short invite on the form to the invalid product error", () => {
    const parsed = inviteRedeemBodySchema.safeParse({
      email: "jai@example.com",
      password: "longenough1",
      inviteCode: "ab",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(INVITE_ERROR_MESSAGE.invalid);
    }
  });
});
