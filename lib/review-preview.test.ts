import { describe, expect, it } from "vitest";
import { INVITE_ERROR_MESSAGE } from "@/lib/invite-status";
import {
  DEFAULT_REVIEW_INVITE_CODE,
  REVIEW_INVITE_MAX_USES,
  REVIEW_INVITE_NOTE,
  classifyStubReviewInvite,
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
  });

  it("maps a wrong stub code to the invalid product error", () => {
    expect(classifyStubReviewInvite("nope", DEFAULT_REVIEW_INVITE_CODE)).toBe("invalid");
    expect(classifyStubReviewInvite("castreview", DEFAULT_REVIEW_INVITE_CODE)).toBe("ok");
    expect(classifyStubReviewInvite("  castreview  ", DEFAULT_REVIEW_INVITE_CODE)).toBe("ok");
    expect(INVITE_ERROR_MESSAGE.invalid).toBe("This invite code is invalid.");
  });
});
