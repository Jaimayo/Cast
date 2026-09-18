import { afterEach, describe, expect, it } from "vitest";
import { RATE_LIMIT_CODES, RATE_LIMIT_POLICIES, RateLimitError, memoryRateLimitBackend } from "@/lib/rate-limit";
import { fakeRedisEval, redisBackendWithMemoryFallback, redisRateLimitBackend } from "@/lib/rate-limit-redis";
import {
  consumeInviteRedeemLimit,
  consumeUserActionLimit,
  resetMemoryRateLimits,
  setRateLimitBackendForTests,
} from "@/server/rate-limit";

afterEach(() => {
  resetMemoryRateLimits();
  setRateLimitBackendForTests(null);
});

describe("in-memory enqueue limiter (stub, no Redis)", () => {
  it("429s invite redeem after the email/IP window is spent", async () => {
    const now = 1_700_000_000_000;
    for (let i = 0; i < RATE_LIMIT_POLICIES.inviteRedeem.limit; i += 1) {
      await consumeInviteRedeemLimit({ email: "jai@example.com", ip: "203.0.113.9", now });
    }
    try {
      await consumeInviteRedeemLimit({ email: "jai@example.com", ip: "203.0.113.9", now });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).code).toBe(RATE_LIMIT_CODES.INVITE_REDEEM_RATE_LIMIT);
      expect((err as RateLimitError).status).toBe(429);
    }
  });

  it("rate-limits generateStill / trainPack / generate-starters per user", async () => {
    const now = 1_700_000_000_000;
    await consumeUserActionLimit("generateStill", "user-a", 12, now);
    try {
      await consumeUserActionLimit("generateStill", "user-a", 1, now);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as RateLimitError).code).toBe(RATE_LIMIT_CODES.GENERATE_STILL_RATE_LIMIT);
    }

    await consumeUserActionLimit("generateStill", "user-b", 1, now);

    await consumeUserActionLimit("trainPack", "user-a", RATE_LIMIT_POLICIES.trainPack.limit, now);
    try {
      await consumeUserActionLimit("trainPack", "user-a", 1, now);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as RateLimitError).code).toBe(RATE_LIMIT_CODES.TRAIN_PACK_RATE_LIMIT);
    }

    await consumeUserActionLimit("generateStarter", "user-a", RATE_LIMIT_POLICIES.generateStarter.limit, now);
    try {
      await consumeUserActionLimit("generateStarter", "user-a", 1, now);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as RateLimitError).code).toBe(RATE_LIMIT_CODES.GENERATE_STARTER_RATE_LIMIT);
    }
  });
});

describe("Redis enqueue limiter (shared across instances)", () => {
  it("shares generateStill caps across two app instances using the same Redis", async () => {
    const shared = new Map();
    const evalFn = fakeRedisEval(shared);
    setRateLimitBackendForTests(redisRateLimitBackend(evalFn));

    const now = 1_700_000_000_000;
    await consumeUserActionLimit("generateStill", "user-a", RATE_LIMIT_POLICIES.generateStill.limit, now);

    // Second instance (new process) would have an empty memory Map; Redis still 429s.
    setRateLimitBackendForTests(redisRateLimitBackend(evalFn));
    try {
      await consumeUserActionLimit("generateStill", "user-a", 1, now);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).code).toBe(RATE_LIMIT_CODES.GENERATE_STILL_RATE_LIMIT);
      expect((err as RateLimitError).retryAfterSeconds).toBeGreaterThan(0);
    }

    await consumeUserActionLimit("generateStill", "user-b", 1, now);
  });

  it("falls back to in-memory when Redis is down so local 429s still work", async () => {
    const memory = memoryRateLimitBackend(new Map());
    setRateLimitBackendForTests(
      redisBackendWithMemoryFallback(
        {
          async consume() {
            throw new Error("ECONNREFUSED");
          },
        },
        memory,
      ),
    );
    const now = 1_700_000_000_000;
    await consumeUserActionLimit("trainPack", "user-a", RATE_LIMIT_POLICIES.trainPack.limit, now);
    try {
      await consumeUserActionLimit("trainPack", "user-a", 1, now);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as RateLimitError).code).toBe(RATE_LIMIT_CODES.TRAIN_PACK_RATE_LIMIT);
    }
  });
});
