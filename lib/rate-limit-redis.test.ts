import { describe, expect, it } from "vitest";
import { TEST_GRID_SIZE } from "@/lib/test-grid";
import {
  RATE_LIMIT_POLICIES,
  RATE_LIMIT_REDIS_PREFIX,
  consumeAllKeys,
  consumeSlidingWindow,
  inviteRedeemKeys,
  memoryRateLimitBackend,
  redisRateLimitKey,
  shouldUseRedisRateLimits,
  userActionKey,
} from "@/lib/rate-limit";
import {
  REDIS_SLIDING_WINDOW_LUA,
  consumeRedisSlidingWindow,
  fakeRedisEval,
  parseRedisEvalResult,
  redisBackendWithMemoryFallback,
  redisRateLimitBackend,
  type RedisZSetStore,
} from "@/lib/rate-limit-redis";

describe("shouldUseRedisRateLimits", () => {
  it("keeps stub and tests on memory (no Redis required)", () => {
    expect(shouldUseRedisRateLimits({ providerMode: "stub", nodeEnv: "development" })).toBe(false);
    expect(shouldUseRedisRateLimits({ providerMode: "live", nodeEnv: "test" })).toBe(false);
    expect(shouldUseRedisRateLimits({ providerMode: "live", nodeEnv: "production", vitest: "true" })).toBe(false);
  });

  it("uses Redis in live mode so multiple instances share caps", () => {
    expect(shouldUseRedisRateLimits({ providerMode: "live", nodeEnv: "production", vitest: "" })).toBe(true);
    expect(shouldUseRedisRateLimits({ providerMode: "live", nodeEnv: "development", vitest: "" })).toBe(true);
  });
});

describe("Redis sliding-window protocol", () => {
  it("prefixes keys so BullMQ and rate-limit entries do not collide", () => {
    expect(redisRateLimitKey("generateStill:user:u1")).toBe(`${RATE_LIMIT_REDIS_PREFIX}generateStill:user:u1`);
    expect(REDIS_SLIDING_WINDOW_LUA).toMatch(/ZREMRANGEBYSCORE/);
    expect(REDIS_SLIDING_WINDOW_LUA).toMatch(/ZADD/);
    expect(REDIS_SLIDING_WINDOW_LUA).toMatch(/ZRANGE/);
    expect(REDIS_SLIDING_WINDOW_LUA).toMatch(/PEXPIRE/);
  });

  it("parses Lua {allowed, remaining, retryAfter} including stringly Redis replies", () => {
    expect(parseRedisEvalResult([1, 3, 0])).toEqual({ allowed: true, remaining: 3, retryAfterSeconds: 0 });
    expect(parseRedisEvalResult(["0", "0", "12"])).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 12,
    });
    expect(parseRedisEvalResult([0, 0, 0])).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 1,
    });
  });
});

describe("Redis window matches in-memory consumeAllKeys", () => {
  it("allows up to the limit then 429s with the same Retry-After", async () => {
    const memory = new Map<string, number[]>();
    const redis: RedisZSetStore = new Map();
    const evalFn = fakeRedisEval(redis);
    const policy = { limit: 3, windowMs: 60_000 };
    const now = 1_000_000;
    const keys = ["k"];

    for (let i = 0; i < 3; i += 1) {
      const mem = consumeSlidingWindow({ store: memory, key: "k", now: now + i, ...policy });
      const red = await consumeRedisSlidingWindow({
        eval: evalFn,
        keys,
        now: now + i,
        policy,
        nonce: `n${i}`,
      });
      expect(red).toEqual(mem);
    }

    const blockedMem = consumeSlidingWindow({ store: memory, key: "k", now: now + 3, ...policy });
    const blockedRed = await consumeRedisSlidingWindow({
      eval: evalFn,
      keys,
      now: now + 3,
      policy,
      nonce: "blocked",
    });
    expect(blockedRed).toEqual(blockedMem);
    expect(blockedRed).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 60 });
  });

  it("does not count hits after the window slides", async () => {
    const redis: RedisZSetStore = new Map();
    const evalFn = fakeRedisEval(redis);
    const policy = { limit: 1, windowMs: 10_000 };
    expect((await consumeRedisSlidingWindow({ eval: evalFn, keys: ["k"], now: 0, policy, nonce: "a" })).allowed).toBe(
      true,
    );
    expect((await consumeRedisSlidingWindow({ eval: evalFn, keys: ["k"], now: 9_999, policy, nonce: "b" })).allowed).toBe(
      false,
    );
    expect((await consumeRedisSlidingWindow({ eval: evalFn, keys: ["k"], now: 10_001, policy, nonce: "c" })).allowed).toBe(
      true,
    );
  });

  it("reserves Test-grid cost atomically so a 4-still burst is all-or-nothing", async () => {
    const memory = new Map<string, number[]>();
    const redis: RedisZSetStore = new Map();
    const evalFn = fakeRedisEval(redis);
    const policy = RATE_LIMIT_POLICIES.generateStill;
    const now = 5_000;
    const key = userActionKey("generateStill", "u1");

    expect(consumeSlidingWindow({ store: memory, key, now, ...policy, cost: 9 }).allowed).toBe(true);
    expect(
      (await consumeRedisSlidingWindow({ eval: evalFn, keys: [key], now, policy, cost: 9, nonce: "nine" })).allowed,
    ).toBe(true);

    const memBlocked = consumeSlidingWindow({ store: memory, key, now, ...policy, cost: TEST_GRID_SIZE });
    const redBlocked = await consumeRedisSlidingWindow({
      eval: evalFn,
      keys: [key],
      now,
      policy,
      cost: TEST_GRID_SIZE,
      nonce: "grid",
    });
    expect(redBlocked).toEqual(memBlocked);
    expect(redBlocked.allowed).toBe(false);
  });

  it("peeks every invite key before consuming so a blocked IP does not burn the email budget", async () => {
    const memory = new Map<string, number[]>();
    const redis: RedisZSetStore = new Map();
    const backend = redisRateLimitBackend(fakeRedisEval(redis));
    const policy = { limit: 1, windowMs: 60_000 };
    const now = 0;
    const keys = inviteRedeemKeys({ email: "a@example.com", ip: "1.1.1.1" });

    expect(consumeAllKeys({ store: memory, keys, now, policy }).allowed).toBe(true);
    expect((await backend.consume({ keys, now, policy })).allowed).toBe(true);

    const otherEmail = inviteRedeemKeys({ email: "b@example.com", ip: "1.1.1.1" });
    expect(consumeAllKeys({ store: memory, keys: otherEmail, now, policy }).allowed).toBe(false);
    expect((await backend.consume({ keys: otherEmail, now, policy })).allowed).toBe(false);

    const sameEmailNewIp = inviteRedeemKeys({ email: "a@example.com", ip: "8.8.8.8" });
    expect(consumeAllKeys({ store: memory, keys: sameEmailNewIp, now, policy }).allowed).toBe(false);
    expect((await backend.consume({ keys: sameEmailNewIp, now, policy })).allowed).toBe(false);

    const burnedEmail = [...redis.keys()].some((key) => key.endsWith("invite:email:b@example.com"));
    const burnedIp = [...redis.keys()].some((key) => key.endsWith("invite:ip:8.8.8.8"));
    expect(burnedEmail).toBe(false);
    expect(burnedIp).toBe(false);
  });
});

describe("Redis fallback to memory", () => {
  it("falls back when Redis eval throws so enqueue still 429s locally", async () => {
    const memoryHits = new Map<string, number[]>();
    const memory = memoryRateLimitBackend(memoryHits);
    const redis = {
      async consume() {
        throw new Error("Stream isn't writeable");
      },
    };
    let logged = 0;
    const backend = redisBackendWithMemoryFallback(redis, memory, () => {
      logged += 1;
    });
    const policy = { limit: 1, windowMs: 60_000 };
    const keys = ["generateStill:user:u1"];
    expect((await backend.consume({ keys, now: 0, policy })).allowed).toBe(true);
    expect((await backend.consume({ keys, now: 0, policy })).allowed).toBe(false);
    expect(logged).toBe(2);
  });
});
