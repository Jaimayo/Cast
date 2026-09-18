import { describe, expect, it } from "vitest";
import { AuthError } from "@/lib/auth-error";
import { assertAdmin, assertAttested, assertSignedIn, roleForEmail, sessionAgeFlag } from "@/lib/auth-guards";

const consumer = {
  id: "u1",
  email: "user@example.com",
  role: "consumer",
  ageAttestedAt: null as Date | null,
};

const attestedConsumer = { ...consumer, ageAttestedAt: new Date("2026-09-18T00:00:00.000Z") };
const admin = { ...attestedConsumer, role: "admin", email: "admin@example.com" };

describe("session and age guards", () => {
  it("rejects missing sessions", () => {
    expect(() => assertSignedIn(null)).toThrow(AuthError);
    try {
      assertSignedIn(null);
    } catch (err) {
      expect((err as AuthError).status).toBe(401);
      expect((err as AuthError).message).toBe("Sign in required");
    }
  });

  it("blocks studio and media until ageAttestedAt is set", () => {
    try {
      assertAttested(consumer);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as AuthError).status).toBe(403);
      expect((err as AuthError).message).toBe("Age attestation required");
    }
    expect(assertAttested(attestedConsumer)).toBe(attestedConsumer);
  });

  it("keeps mint/list/revoke admin-only even after attestation", () => {
    try {
      assertAdmin(attestedConsumer);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as AuthError).status).toBe(403);
      expect((err as AuthError).message).toBe("Admin only");
    }
    expect(assertAdmin(admin)).toBe(admin);
  });
});

describe("ADMIN_EMAILS role assignment", () => {
  const admins = ["jai@example.com", "ops@example.com"];

  it("assigns admin on redeem/sign-in when the email is listed", () => {
    expect(roleForEmail("jai@example.com", admins)).toBe("admin");
    expect(roleForEmail("  JAI@example.com  ", admins)).toBe("admin");
  });

  it("keeps everyone else a consumer", () => {
    expect(roleForEmail("user@example.com", admins)).toBe("consumer");
    expect(roleForEmail("jai@example.com", [])).toBe("consumer");
  });
});

describe("middleware age flag vs DB", () => {
  it("sets cookie age from ageAttestedAt so middleware matches the DB after attest", () => {
    expect(sessionAgeFlag(null)).toBe(false);
    expect(sessionAgeFlag(undefined)).toBe(false);
    expect(sessionAgeFlag(new Date("2026-09-18T00:00:00.000Z"))).toBe(true);
    expect(sessionAgeFlag("2026-09-18T00:00:00.000Z")).toBe(true);
  });
});
