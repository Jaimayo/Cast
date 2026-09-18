import { describe, expect, it } from "vitest";
import { TEST_GRID_SIZE } from "@/lib/test-grid";
import {
  BUSY_RETRY_AFTER_SECONDS,
  IN_FLIGHT_CAPS,
  RATE_LIMIT_CODES,
  RATE_LIMIT_MESSAGES,
  RATE_LIMIT_POLICIES,
  RateLimitError,
  assertInFlightCap,
  busyCodeForAction,
  clientIpFromHeaders,
  consumeAllKeys,
  consumeSlidingWindow,
  inFlightDecision,
  inspectSlidingWindow,
  inviteRedeemKeys,
  rateLimitCodeForAction,
  userActionKey,
} from "@/lib/rate-limit";

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("rate-limit product copy and Stage 1 caps", () => {
  it("keeps Test grid inside generateStill burst and in-flight caps", () => {
    expect(TEST_GRID_SIZE).toBe(4);
    expect(RATE_LIMIT_POLICIES.generateStill.limit).toBeGreaterThanOrEqual(TEST_GRID_SIZE);
    expect(IN_FLIGHT_CAPS.generateStill).toBeGreaterThanOrEqual(TEST_GRID_SIZE);
    expect(IN_FLIGHT_CAPS.trainPack).toBe(1);
  });

  it("exposes distinct 429 UX codes and user-safe messages", () => {
    expect(RATE_LIMIT_MESSAGES.INVITE_REDEEM_RATE_LIMIT).toMatch(/invite attempts/i);
    expect(RATE_LIMIT_MESSAGES.GENERATE_STILL_RATE_LIMIT).toMatch(/stills too quickly/i);
    expect(RATE_LIMIT_MESSAGES.TRAIN_PACK_RATE_LIMIT).toMatch(/Train & lock/i);
    expect(RATE_LIMIT_MESSAGES.GENERATE_STARTER_RATE_LIMIT).toMatch(/starters too quickly/i);
    expect(RATE_LIMIT_MESSAGES.GENERATE_STILL_BUSY).toMatch(/Jobs/);
    expect(RATE_LIMIT_MESSAGES.TRAIN_PACK_BUSY).toMatch(/already running/);
    expect(RATE_LIMIT_MESSAGES.GENERATE_STARTER_BUSY).toMatch(/starter stills/);

    expect(rateLimitCodeForAction("generateStill")).toBe(RATE_LIMIT_CODES.GENERATE_STILL_RATE_LIMIT);
    expect(rateLimitCodeForAction("trainPack")).toBe(RATE_LIMIT_CODES.TRAIN_PACK_RATE_LIMIT);
    expect(rateLimitCodeForAction("generateStarter")).toBe(RATE_LIMIT_CODES.GENERATE_STARTER_RATE_LIMIT);
    expect(busyCodeForAction("trainPack")).toBe(RATE_LIMIT_CODES.TRAIN_PACK_BUSY);
  });
});

describe("invite identity keys", () => {
  it("reads the first forwarded IP and falls back", () => {
    expect(clientIpFromHeaders(headers({ "x-forwarded-for": " 203.0.113.9, 10.0.0.1 " }))).toBe("203.0.113.9");
    expect(clientIpFromHeaders(headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIpFromHeaders(headers({}))).toBe("unknown");
  });

  it("keys invite attempts by email and IP so neither axis can brute-force alone", () => {
    expect(inviteRedeemKeys({ email: "  Jai@Example.com ", ip: "203.0.113.9" })).toEqual([
      "invite:email:jai@example.com",
      "invite:ip:203.0.113.9",
    ]);
    expect(userActionKey("generateStill", "user-1")).toBe("generateStill:user:user-1");
  });
});

describe("sliding window (in-memory, no Redis)", () => {
  it("allows up to the limit then 429s with Retry-After", () => {
    const store = new Map<string, number[]>();
    const now = 1_000_000;
    const policy = { limit: 3, windowMs: 60_000 };

    for (let i = 0; i < 3; i += 1) {
      const allowed = consumeSlidingWindow({ store, key: "k", now: now + i, ...policy });
      expect(allowed.allowed).toBe(true);
    }

    const blocked = consumeSlidingWindow({ store, key: "k", now: now + 3, ...policy });
    expect(blocked).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 60 });
  });

  it("does not count hits after the window slides", () => {
    const store = new Map<string, number[]>();
    const policy = { limit: 1, windowMs: 10_000 };
    expect(consumeSlidingWindow({ store, key: "k", now: 0, ...policy }).allowed).toBe(true);
    expect(consumeSlidingWindow({ store, key: "k", now: 9_999, ...policy }).allowed).toBe(false);
    expect(consumeSlidingWindow({ store, key: "k", now: 10_001, ...policy }).allowed).toBe(true);
  });

  it("reserves Test-grid cost atomically so a 4-still burst is all-or-nothing", () => {
    const store = new Map<string, number[]>();
    const policy = RATE_LIMIT_POLICIES.generateStill;
    const now = 5_000;
    expect(consumeSlidingWindow({ store, key: "u1", now, ...policy, cost: 9 }).allowed).toBe(true);
    const peek = inspectSlidingWindow({ store, key: "u1", now, ...policy, cost: TEST_GRID_SIZE });
    expect(peek.allowed).toBe(false);
    const before = store.get("u1")?.length;
    expect(consumeSlidingWindow({ store, key: "u1", now, ...policy, cost: TEST_GRID_SIZE }).allowed).toBe(false);
    expect(store.get("u1")?.length).toBe(before);
  });

  it("peeks every invite key before consuming so a blocked IP does not burn the email budget", () => {
    const store = new Map<string, number[]>();
    const policy = { limit: 1, windowMs: 60_000 };
    const now = 0;
    const keys = inviteRedeemKeys({ email: "a@example.com", ip: "1.1.1.1" });
    expect(consumeAllKeys({ store, keys, now, policy }).allowed).toBe(true);

    const otherEmail = inviteRedeemKeys({ email: "b@example.com", ip: "1.1.1.1" });
    const blocked = consumeAllKeys({ store, keys: otherEmail, now, policy });
    expect(blocked.allowed).toBe(false);

    const sameEmailNewIp = inviteRedeemKeys({ email: "a@example.com", ip: "8.8.8.8" });
    expect(consumeAllKeys({ store, keys: sameEmailNewIp, now, policy }).allowed).toBe(false);
    expect(store.get("invite:email:b@example.com")).toBeUndefined();
    expect(store.get("invite:ip:8.8.8.8")).toBeUndefined();
  });
});

describe("in-flight enqueue caps", () => {
  it("lets Test grid through when there is room, and busy when there is not", () => {
    expect(inFlightDecision({ inFlight: 3, adding: TEST_GRID_SIZE, cap: IN_FLIGHT_CAPS.generateStill })).toBe("ok");
    expect(inFlightDecision({ inFlight: 5, adding: TEST_GRID_SIZE, cap: IN_FLIGHT_CAPS.generateStill })).toBe("busy");
    expect(inFlightDecision({ inFlight: 1, adding: 1, cap: IN_FLIGHT_CAPS.trainPack })).toBe("busy");
    expect(inFlightDecision({ inFlight: 0, adding: 1, cap: IN_FLIGHT_CAPS.trainPack })).toBe("ok");
  });

  it("throws RateLimitError 429 with a busy code", () => {
    try {
      assertInFlightCap("trainPack", 1, 1);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      const limited = err as RateLimitError;
      expect(limited.status).toBe(429);
      expect(limited.code).toBe(RATE_LIMIT_CODES.TRAIN_PACK_BUSY);
      expect(limited.retryAfterSeconds).toBe(BUSY_RETRY_AFTER_SECONDS);
      expect(limited.message).toBe(RATE_LIMIT_MESSAGES.TRAIN_PACK_BUSY);
    }
  });
});
