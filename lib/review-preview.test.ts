import { describe, expect, it } from "vitest";
import { DEFAULT_REVIEW_INVITE_CODE, stubReviewInviteCode } from "@/lib/review-preview";

describe("stub review invite", () => {
  it("is off in live mode", () => {
    expect(stubReviewInviteCode("live", "castreview")).toBeNull();
  });

  it("uses a known stub code so product can enter without minting", () => {
    expect(stubReviewInviteCode("stub")).toBe(DEFAULT_REVIEW_INVITE_CODE);
    expect(stubReviewInviteCode("stub", "  preview-gate  ")).toBe("preview-gate");
  });
});
