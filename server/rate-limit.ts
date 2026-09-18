import {
  RATE_LIMIT_CODES,
  RATE_LIMIT_POLICIES,
  RateLimitError,
  assertInFlightCap,
  inviteRedeemKeys,
  memoryRateLimitBackend,
  rateLimitCodeForAction,
  shouldUseRedisRateLimits,
  userActionKey,
  type HitStore,
  type RateLimitAction,
  type RateLimitBackend,
} from "@/lib/rate-limit";
import { redisBackendWithMemoryFallback, redisRateLimitBackend } from "@/lib/rate-limit-redis";
import { jobLog } from "@/lib/job-log";
import { getEnv } from "@/server/env";
import { getRateLimitRedis } from "@/server/redis";

const memoryHits: HitStore = new Map();
const memoryBackend = memoryRateLimitBackend(memoryHits);

let injectedBackend: RateLimitBackend | null = null;

export function memoryRateLimitStore(): HitStore {
  return memoryHits;
}

export function resetMemoryRateLimits(): void {
  memoryHits.clear();
}

/** Test seam: inject a fake Redis/memory backend. Pass null to restore selection. */
export function setRateLimitBackendForTests(backend: RateLimitBackend | null): void {
  injectedBackend = backend;
}

function liveRedisBackend(): RateLimitBackend {
  const redis = getRateLimitRedis();
  return redisRateLimitBackend(async (script, numKeys, ...args) => redis.eval(script, numKeys, ...args));
}

function selectedBackend(): RateLimitBackend {
  if (injectedBackend) return injectedBackend;
  const env = getEnv();
  if (
    !shouldUseRedisRateLimits({
      providerMode: env.providerMode,
      nodeEnv: env.nodeEnv,
    })
  ) {
    return memoryBackend;
  }
  return redisBackendWithMemoryFallback(liveRedisBackend(), memoryBackend, (err) => {
    jobLog("rate_limit.redis_fallback", {
      error: err instanceof Error ? err.message : "unknown",
    });
  });
}

export async function consumeInviteRedeemLimit(input: { email: string; ip: string; now?: number }): Promise<void> {
  const now = input.now ?? Date.now();
  const result = await selectedBackend().consume({
    keys: inviteRedeemKeys(input),
    now,
    policy: RATE_LIMIT_POLICIES.inviteRedeem,
  });
  if (!result.allowed) {
    throw new RateLimitError(RATE_LIMIT_CODES.INVITE_REDEEM_RATE_LIMIT, result.retryAfterSeconds);
  }
}

export async function consumeUserActionLimit(
  action: Exclude<RateLimitAction, "inviteRedeem">,
  userId: string,
  cost = 1,
  now = Date.now(),
): Promise<void> {
  const policy = RATE_LIMIT_POLICIES[action];
  const result = await selectedBackend().consume({
    keys: [userActionKey(action, userId)],
    now,
    policy,
    cost,
  });
  if (!result.allowed) {
    throw new RateLimitError(rateLimitCodeForAction(action), result.retryAfterSeconds);
  }
}

export function assertUserInFlightCap(
  action: Exclude<RateLimitAction, "inviteRedeem">,
  inFlight: number,
  adding = 1,
): void {
  assertInFlightCap(action, inFlight, adding);
}
