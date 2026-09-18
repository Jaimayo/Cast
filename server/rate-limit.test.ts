import { afterEach, describe, expect, it } from "vitest";
import { RATE_LIMIT_CODES, RATE_LIMIT_POLICIES, RateLimitError } from "@/lib/rate-limit";
import { consumeInviteRedeemLimit, consumeUserActionLimit, resetMemoryRateLimits } from "@/server/rate-limit";

afterEach(() => {
  resetMemoryRateLimits();
});

describe("in-memory enqueue limiter (stub, no Redis)", () => {
  it("429s invite redeem after the email/IP window is spent", () => {
    const now = 1_700_000_000_000;
    for (let i = 0; i < RATE_LIMIT_POLICIES.inviteRedeem.limit; i += 1) {
      consumeInviteRedeemLimit({ email: "jai@example.com", ip: "203.0.113.9", now });
    }
    try {
      consumeInviteRedeemLimit({ email: "jai@example.com", ip: "203.0.113.9", now });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).code).toBe(RATE_LIMIT_CODES.INVITE_REDEEM_RATE_LIMIT);
      expect((err as RateLimitError).status).toBe(429);
    }
  });

  it("rate-limits generateStill / trainPack / generate-starters per user", () => {
    const now = 1_700_000_000_000;
    consumeUserActionLimit("generateStill", "user-a", 12, now);
    try {
      consumeUserActionLimit("generateStill", "user-a", 1, now);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as RateLimitError).code).toBe(RATE_LIMIT_CODES.GENERATE_STILL_RATE_LIMIT);
    }

    consumeUserActionLimit("generateStill", "user-b", 1, now);

    consumeUserActionLimit("trainPack", "user-a", RATE_LIMIT_POLICIES.trainPack.limit, now);
    try {
      consumeUserActionLimit("trainPack", "user-a", 1, now);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as RateLimitError).code).toBe(RATE_LIMIT_CODES.TRAIN_PACK_RATE_LIMIT);
    }

    consumeUserActionLimit("generateStarter", "user-a", RATE_LIMIT_POLICIES.generateStarter.limit, now);
    try {
      consumeUserActionLimit("generateStarter", "user-a", 1, now);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as RateLimitError).code).toBe(RATE_LIMIT_CODES.GENERATE_STARTER_RATE_LIMIT);
    }
  });
});
