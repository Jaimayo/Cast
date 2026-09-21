import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { INVITE_ERROR_MESSAGE } from "@/lib/invite-status";
import {
  DEFAULT_REVIEW_ADMIN_EMAIL,
  DEFAULT_REVIEW_INVITE_CODE,
  REVIEW_INVITE_MAX_USES,
  REVIEW_INVITE_NOTE,
  STUB_REVIEW_ADMIN_HINT,
  adminEmailsForMode,
  classifyStubReviewInvite,
  parseAdminEmails,
  roleForReviewUser,
  stubReviewGrantsAdmin,
  stubReviewInviteCode,
} from "@/lib/review-preview";

describe("stub review invite", () => {
  it("is off in live mode", () => {
    expect(stubReviewInviteCode("live", "castreview")).toBeNull();
  });

  it("uses a known stub code so product can enter without minting", () => {
    expect(stubReviewInviteCode("stub")).toBe(DEFAULT_REVIEW_INVITE_CODE);
    expect(stubReviewInviteCode("stub", "  preview-gate  ")).toBe("preview-gate");
    expect(REVIEW_INVITE_MAX_USES).toBe(50);
    expect(REVIEW_INVITE_NOTE).toBe("stub product-review");
    expect(DEFAULT_REVIEW_ADMIN_EMAIL).toBe("jai@cast.review");
    expect(STUB_REVIEW_ADMIN_HINT).toContain("jai@cast.review");
    expect(STUB_REVIEW_ADMIN_HINT).toContain("castreview");
    expect(STUB_REVIEW_ADMIN_HINT).toContain("Settings");
  });

  it("maps a wrong stub code to the invalid product error", () => {
    expect(classifyStubReviewInvite("nope", DEFAULT_REVIEW_INVITE_CODE)).toBe("invalid");
    expect(classifyStubReviewInvite("castreview", DEFAULT_REVIEW_INVITE_CODE)).toBe("ok");
    expect(classifyStubReviewInvite("  castreview  ", DEFAULT_REVIEW_INVITE_CODE)).toBe("ok");
    expect(INVITE_ERROR_MESSAGE.invalid).toBe("This invite code is invalid.");
  });
});

describe("stub review admin", () => {
  it("always includes jai@cast.review in stub ADMIN_EMAILS", () => {
    expect(parseAdminEmails(" ops@example.com , JAI@cast.review ")).toEqual([
      "ops@example.com",
      "jai@cast.review",
    ]);
    expect(adminEmailsForMode("stub", [])).toEqual(["jai@cast.review"]);
    expect(adminEmailsForMode("stub", ["ops@example.com"])).toEqual(["ops@example.com", "jai@cast.review"]);
    expect(adminEmailsForMode("live", [])).toEqual([]);
    expect(adminEmailsForMode("live", ["ops@example.com"])).toEqual(["ops@example.com"]);
  });

  it("grants admin to every cookie-only stub user when ADMIN_EMAILS is unset", () => {
    expect(
      stubReviewGrantsAdmin({ providerMode: "stub", memoryPreview: true, envAdminEmails: [] }),
    ).toBe(true);
    expect(
      stubReviewGrantsAdmin({
        providerMode: "stub",
        memoryPreview: true,
        envAdminEmails: ["ops@example.com"],
      }),
    ).toBe(false);
    expect(
      stubReviewGrantsAdmin({ providerMode: "stub", memoryPreview: false, envAdminEmails: [] }),
    ).toBe(false);
    expect(
      stubReviewGrantsAdmin({ providerMode: "live", memoryPreview: false, envAdminEmails: [] }),
    ).toBe(false);
    expect(
      roleForReviewUser("anyone@example.com", {
        adminEmails: ["jai@cast.review"],
        stubReviewGrantsAdmin: true,
      }),
    ).toBe("admin");
    expect(
      roleForReviewUser("anyone@example.com", {
        adminEmails: ["jai@cast.review"],
        stubReviewGrantsAdmin: false,
      }),
    ).toBe("consumer");
    expect(
      roleForReviewUser("jai@cast.review", {
        adminEmails: ["jai@cast.review"],
        stubReviewGrantsAdmin: false,
      }),
    ).toBe("admin");
  });

  it("mounts Connect Venice on /app/settings for every signed-in user", () => {
    expect(existsSync(resolve(process.cwd(), "app/app/settings/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "app/api/settings/venice/route.ts"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "app/api/admin/venice/route.ts"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "app/admin/invites/page.tsx"))).toBe(true);
  });
});
