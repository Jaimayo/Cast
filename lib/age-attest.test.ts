import { describe, expect, it } from "vitest";
import { AuthError } from "@/lib/auth-error";
import {
  AGE_ATTEST_COPY,
  AGE_INCOMPLETE_MESSAGE,
  assertCompleteAgeAttest,
  isCompleteAgeAttest,
} from "@/lib/age-attest";

describe("age attest copy and completeness", () => {
  it("locks the exact 18+ confirmation copy", () => {
    expect(AGE_ATTEST_COPY).toBe("I confirm I am 18+.");
  });

  it("accepts only both flags true", () => {
    expect(isCompleteAgeAttest({ attested: true, fictionalOnly: true })).toBe(true);
  });

  it("rejects missing, false, or partial attest (under-18 / skip)", () => {
    expect(isCompleteAgeAttest({})).toBe(false);
    expect(isCompleteAgeAttest({ attested: false, fictionalOnly: true })).toBe(false);
    expect(isCompleteAgeAttest({ attested: true, fictionalOnly: false })).toBe(false);
    expect(isCompleteAgeAttest({ attested: true })).toBe(false);
    expect(isCompleteAgeAttest({ fictionalOnly: true })).toBe(false);
    expect(isCompleteAgeAttest({ attested: "true", fictionalOnly: true })).toBe(false);
  });

  it("throws a user-safe 400 for incomplete attest", () => {
    try {
      assertCompleteAgeAttest({ attested: true, fictionalOnly: false });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).status).toBe(400);
      expect((err as AuthError).message).toBe(AGE_INCOMPLETE_MESSAGE);
    }
  });
});
