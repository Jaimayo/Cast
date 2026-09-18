/**
 * Per-user (and invite) enqueue abuse guards.
 * Sliding-window math is pure + in-memory so stub tests never need Redis.
 */

export const RATE_LIMIT_CODES = {
  INVITE_REDEEM_RATE_LIMIT: "INVITE_REDEEM_RATE_LIMIT",
  GENERATE_STILL_RATE_LIMIT: "GENERATE_STILL_RATE_LIMIT",
  TRAIN_PACK_RATE_LIMIT: "TRAIN_PACK_RATE_LIMIT",
  GENERATE_STARTER_RATE_LIMIT: "GENERATE_STARTER_RATE_LIMIT",
  GENERATE_STILL_BUSY: "GENERATE_STILL_BUSY",
  TRAIN_PACK_BUSY: "TRAIN_PACK_BUSY",
  GENERATE_STARTER_BUSY: "GENERATE_STARTER_BUSY",
} as const;

export type RateLimitCode = (typeof RATE_LIMIT_CODES)[keyof typeof RATE_LIMIT_CODES];

export const RATE_LIMIT_MESSAGES: Record<RateLimitCode, string> = {
  INVITE_REDEEM_RATE_LIMIT: "Too many invite attempts. Wait a few minutes and try again.",
  GENERATE_STILL_RATE_LIMIT: "You're generating stills too quickly. Wait a moment, then try again.",
  TRAIN_PACK_RATE_LIMIT: "Train & lock was requested too many times. Wait a bit, then try again.",
  GENERATE_STARTER_RATE_LIMIT: "You're generating starters too quickly. Wait a moment, then try again.",
  GENERATE_STILL_BUSY: "You already have several stills in progress. Check Jobs and wait for them to finish.",
  TRAIN_PACK_BUSY: "A Train & lock job is already running. Check Jobs.",
  GENERATE_STARTER_BUSY: "You already have starter stills in progress. Wait for them to finish.",
};

export type RateLimitAction = "inviteRedeem" | "generateStill" | "trainPack" | "generateStarter";

export type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

/** Caps are Stage 1 product limits, not vendor quotas. Burst fits Test grid (4 stills). */
export const RATE_LIMIT_POLICIES: Record<RateLimitAction, RateLimitPolicy> = {
  inviteRedeem: { limit: 8, windowMs: 15 * 60_000 },
  generateStill: { limit: 12, windowMs: 60_000 },
  trainPack: { limit: 4, windowMs: 60 * 60_000 },
  generateStarter: { limit: 12, windowMs: 10 * 60_000 },
};

export const IN_FLIGHT_CAPS: Record<Exclude<RateLimitAction, "inviteRedeem">, number> = {
  generateStill: 8,
  trainPack: 1,
  generateStarter: 6,
};

/** Jobs UI can retry shortly after the queue drains; not a sliding-window wait. */
export const BUSY_RETRY_AFTER_SECONDS = 15;

const ACTION_RATE_CODES: Record<Exclude<RateLimitAction, "inviteRedeem">, RateLimitCode> = {
  generateStill: RATE_LIMIT_CODES.GENERATE_STILL_RATE_LIMIT,
  trainPack: RATE_LIMIT_CODES.TRAIN_PACK_RATE_LIMIT,
  generateStarter: RATE_LIMIT_CODES.GENERATE_STARTER_RATE_LIMIT,
};

const ACTION_BUSY_CODES: Record<Exclude<RateLimitAction, "inviteRedeem">, RateLimitCode> = {
  generateStill: RATE_LIMIT_CODES.GENERATE_STILL_BUSY,
  trainPack: RATE_LIMIT_CODES.TRAIN_PACK_BUSY,
  generateStarter: RATE_LIMIT_CODES.GENERATE_STARTER_BUSY,
};

export class RateLimitError extends Error {
  readonly status = 429;
  readonly code: RateLimitCode;
  readonly retryAfterSeconds: number;

  constructor(code: RateLimitCode, retryAfterSeconds: number) {
    super(RATE_LIMIT_MESSAGES[code]);
    this.name = "RateLimitError";
    this.code = code;
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
  }
}

export type HitStore = Map<string, number[]>;

export type WindowDecision =
  | { allowed: true; remaining: number; retryAfterSeconds: 0 }
  | { allowed: false; remaining: 0; retryAfterSeconds: number };

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  return "unknown";
}

export function inviteRedeemKeys(input: { email: string; ip: string }): string[] {
  const email = input.email.trim().toLowerCase();
  const ip = input.ip.trim() || "unknown";
  return [`invite:email:${email}`, `invite:ip:${ip}`];
}

export function userActionKey(action: Exclude<RateLimitAction, "inviteRedeem">, userId: string): string {
  return `${action}:user:${userId}`;
}

export function rateLimitCodeForAction(action: Exclude<RateLimitAction, "inviteRedeem">): RateLimitCode {
  return ACTION_RATE_CODES[action];
}

export function busyCodeForAction(action: Exclude<RateLimitAction, "inviteRedeem">): RateLimitCode {
  return ACTION_BUSY_CODES[action];
}

function pruneHits(hits: number[], now: number, windowMs: number): number[] {
  const cutoff = now - windowMs;
  return hits.filter((stamp) => stamp > cutoff);
}

function retryAfterFromHits(hits: number[], now: number, windowMs: number): number {
  const oldest = hits[0] ?? now;
  return Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
}

export function inspectSlidingWindow(input: {
  store: HitStore;
  key: string;
  now: number;
  limit: number;
  windowMs: number;
  cost?: number;
}): WindowDecision {
  const cost = input.cost ?? 1;
  const hits = pruneHits(input.store.get(input.key) ?? [], input.now, input.windowMs);
  if (cost < 1 || hits.length + cost > input.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: retryAfterFromHits(hits, input.now, input.windowMs),
    };
  }
  return { allowed: true, remaining: input.limit - hits.length - cost, retryAfterSeconds: 0 };
}

export function consumeSlidingWindow(input: {
  store: HitStore;
  key: string;
  now: number;
  limit: number;
  windowMs: number;
  cost?: number;
}): WindowDecision {
  const cost = input.cost ?? 1;
  const inspected = inspectSlidingWindow(input);
  if (!inspected.allowed) {
    return inspected;
  }
  const hits = pruneHits(input.store.get(input.key) ?? [], input.now, input.windowMs);
  for (let i = 0; i < cost; i += 1) {
    hits.push(input.now);
  }
  if (hits.length === 0) {
    input.store.delete(input.key);
  } else {
    input.store.set(input.key, hits);
  }
  return inspected;
}

/** Peek every key, then consume only if all are under the limit (no partial burns). */
export function consumeAllKeys(input: {
  store: HitStore;
  keys: readonly string[];
  now: number;
  policy: RateLimitPolicy;
  cost?: number;
}): WindowDecision {
  let worstRetry = 0;
  let blocked = false;
  for (const key of input.keys) {
    const inspected = inspectSlidingWindow({
      store: input.store,
      key,
      now: input.now,
      limit: input.policy.limit,
      windowMs: input.policy.windowMs,
      cost: input.cost,
    });
    if (!inspected.allowed) {
      blocked = true;
      worstRetry = Math.max(worstRetry, inspected.retryAfterSeconds);
    }
  }
  if (blocked) {
    return { allowed: false, remaining: 0, retryAfterSeconds: worstRetry };
  }
  let remaining = Number.POSITIVE_INFINITY;
  for (const key of input.keys) {
    const consumed = consumeSlidingWindow({
      store: input.store,
      key,
      now: input.now,
      limit: input.policy.limit,
      windowMs: input.policy.windowMs,
      cost: input.cost,
    });
    if (consumed.allowed) {
      remaining = Math.min(remaining, consumed.remaining);
    }
  }
  return { allowed: true, remaining: Number.isFinite(remaining) ? remaining : 0, retryAfterSeconds: 0 };
}

export function inFlightDecision(input: { inFlight: number; adding: number; cap: number }): "ok" | "busy" {
  if (input.adding < 1) return "busy";
  return input.inFlight + input.adding > input.cap ? "busy" : "ok";
}

export function assertInFlightCap(
  action: Exclude<RateLimitAction, "inviteRedeem">,
  inFlight: number,
  adding = 1,
): void {
  const cap = IN_FLIGHT_CAPS[action];
  if (inFlightDecision({ inFlight, adding, cap }) === "busy") {
    throw new RateLimitError(busyCodeForAction(action), BUSY_RETRY_AFTER_SECONDS);
  }
}
