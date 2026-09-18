import { describe, expect, it } from "vitest";
import { authPathRedirect, isStudioPath } from "@/lib/auth-gate";

const attested = { sub: "user-1", age: true };
const waiting = { sub: "user-1", age: false };

describe("studio path detection", () => {
  it("treats /app, nested studio routes, and /admin as studio", () => {
    expect(isStudioPath("/app")).toBe(true);
    expect(isStudioPath("/app/create")).toBe(true);
    expect(isStudioPath("/admin")).toBe(true);
    expect(isStudioPath("/admin/invites")).toBe(true);
    expect(isStudioPath("/age")).toBe(false);
    expect(isStudioPath("/invite")).toBe(false);
    expect(isStudioPath("/api/media/abc")).toBe(false);
  });
});

describe("authPathRedirect", () => {
  it("sends unauthenticated users away from studio and /age", () => {
    expect(authPathRedirect("/app", null)).toBe("/invite");
    expect(authPathRedirect("/app/library", null)).toBe("/invite");
    expect(authPathRedirect("/admin/invites", null)).toBe("/invite");
    expect(authPathRedirect("/age", null)).toBe("/invite");
    expect(authPathRedirect("/invite", null)).toBeNull();
  });

  it("blocks studio until the cookie age flag is set", () => {
    expect(authPathRedirect("/app", waiting)).toBe("/age");
    expect(authPathRedirect("/app/characters", waiting)).toBe("/age");
    expect(authPathRedirect("/admin", waiting)).toBe("/age");
    expect(authPathRedirect("/age", waiting)).toBeNull();
  });

  it("lets already-attested users skip /age and enter studio", () => {
    expect(authPathRedirect("/age", attested)).toBe("/app");
    expect(authPathRedirect("/app", attested)).toBeNull();
    expect(authPathRedirect("/invite", attested)).toBe("/app");
  });

  it("sends a signed-in but unattested user from /invite to /age", () => {
    expect(authPathRedirect("/invite", waiting)).toBe("/age");
  });
});
