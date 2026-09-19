import { describe, expect, it } from "vitest";
import { inviteReentryPath, nextPathAfterAuth } from "@/lib/auth-entry";

describe("invite and session re-entry", () => {
  it("sends attested sessions into the studio (idempotent happy path)", () => {
    expect(nextPathAfterAuth({ ageAttestedAt: "2026-09-19T00:00:00.000Z" })).toBe("/app");
    expect(inviteReentryPath({ ageAttestedAt: new Date("2026-09-19T00:00:00.000Z") })).toBe("/app");
  });

  it("keeps missing attest on /age (cannot reach /app)", () => {
    expect(nextPathAfterAuth({ ageAttestedAt: null })).toBe("/age");
    expect(inviteReentryPath({ ageAttestedAt: null })).toBe("/age");
  });

  it("sends a missing session back to invite", () => {
    expect(nextPathAfterAuth(null)).toBe("/invite");
    expect(inviteReentryPath(null)).toBe("/invite");
  });
});
