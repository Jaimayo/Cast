import { randomUUID } from "node:crypto";
import {
  redisRateLimitKey,
  type RateLimitBackend,
  type RateLimitPolicy,
  type WindowDecision,
} from "@/lib/rate-limit";

/**
 * Atomic multi-key sliding window. Matches `consumeAllKeys`:
 * prune + peek every key, then ZADD only if all are under the limit.
 *
 * KEYS = prefixed rate-limit keys
 * ARGV = nowMs, windowMs, limit, cost, nonce
 * Returns { allowed (0|1), remaining, retryAfterSeconds }
 */
export const REDIS_SLIDING_WINDOW_LUA = `
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local nonce = ARGV[5]
local cutoff = now - windowMs

local blocked = 0
local worstRetry = 0

for i = 1, #KEYS do
  local key = KEYS[i]
  redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
  local count = redis.call('ZCARD', key)
  if count == 0 then
    redis.call('DEL', key)
  else
    redis.call('PEXPIRE', key, windowMs)
  end
  if cost < 1 or (count + cost) > limit then
    blocked = 1
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry
    if oldest[2] then
      retry = math.ceil((tonumber(oldest[2]) + windowMs - now) / 1000)
    else
      retry = math.max(1, math.ceil(windowMs / 1000))
    end
    if retry < 1 then retry = 1 end
    if retry > worstRetry then worstRetry = retry end
  end
end

if blocked == 1 then
  return {0, 0, worstRetry}
end

local remaining = limit
for i = 1, #KEYS do
  local key = KEYS[i]
  for c = 1, cost do
    redis.call('ZADD', key, now, nonce .. ':' .. i .. ':' .. c)
  end
  redis.call('PEXPIRE', key, windowMs)
  local count = redis.call('ZCARD', key)
  local left = limit - count
  if left < remaining then remaining = left end
end

return {1, remaining, 0}
`.trim();

export type RedisEvalFn = (
  script: string,
  numKeys: number,
  ...args: Array<string | number>
) => Promise<unknown>;

/** member → score (timestamp ms) */
export type RedisZSet = Map<string, number>;
export type RedisZSetStore = Map<string, RedisZSet>;

export function parseRedisEvalResult(result: unknown): WindowDecision {
  if (!Array.isArray(result) || result.length < 3) {
    throw new Error("Unexpected rate-limit Redis result");
  }
  const allowed = Number(result[0]) === 1;
  const remaining = Math.max(0, Number(result[1]) || 0);
  const retryAfterSeconds = Math.max(0, Number(result[2]) || 0);
  if (!Number.isFinite(Number(result[0])) || !Number.isFinite(Number(result[1])) || !Number.isFinite(Number(result[2]))) {
    throw new Error("Unexpected rate-limit Redis result");
  }
  if (!allowed) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }
  return { allowed: true, remaining, retryAfterSeconds: 0 };
}

/**
 * In-process zset steps matching REDIS_SLIDING_WINDOW_LUA (no TTL).
 * Used as a fake Redis eval so tests never need a broker.
 */
export function applyRedisSlidingWindowLua(
  store: RedisZSetStore,
  keys: readonly string[],
  argv: ReadonlyArray<string | number>,
): [number, number, number] {
  const now = Number(argv[0]);
  const windowMs = Number(argv[1]);
  const limit = Number(argv[2]);
  const cost = Number(argv[3]);
  const nonce = String(argv[4] ?? "n");
  const cutoff = now - windowMs;

  let blocked = false;
  let worstRetry = 0;

  for (const key of keys) {
    const zset = pruneZSet(store.get(key) ?? new Map(), cutoff);
    if (zset.size === 0) {
      store.delete(key);
    } else {
      store.set(key, zset);
    }
    const count = zset.size;
    if (cost < 1 || count + cost > limit) {
      blocked = true;
      const oldest = oldestScore(zset);
      const retry =
        oldest !== null
          ? Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
          : Math.max(1, Math.ceil(windowMs / 1000));
      worstRetry = Math.max(worstRetry, retry);
    }
  }

  if (blocked) {
    return [0, 0, worstRetry];
  }

  let remaining = limit;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]!;
    const zset = store.get(key) ?? new Map<string, number>();
    for (let c = 1; c <= cost; c += 1) {
      zset.set(`${nonce}:${i + 1}:${c}`, now);
    }
    store.set(key, zset);
    remaining = Math.min(remaining, limit - zset.size);
  }
  return [1, remaining, 0];
}

function pruneZSet(zset: RedisZSet, cutoff: number): RedisZSet {
  const next = new Map<string, number>();
  for (const [member, score] of zset) {
    if (score > cutoff) next.set(member, score);
  }
  return next;
}

function oldestScore(zset: RedisZSet): number | null {
  let oldest: number | null = null;
  for (const score of zset.values()) {
    if (oldest === null || score < oldest) oldest = score;
  }
  return oldest;
}

export function fakeRedisEval(store: RedisZSetStore): RedisEvalFn {
  return async (_script, numKeys, ...args) => {
    const keys = args.slice(0, numKeys).map(String);
    const argv = args.slice(numKeys);
    return applyRedisSlidingWindowLua(store, keys, argv);
  };
}

export async function consumeRedisSlidingWindow(input: {
  eval: RedisEvalFn;
  keys: readonly string[];
  now: number;
  policy: RateLimitPolicy;
  cost?: number;
  nonce?: string;
}): Promise<WindowDecision> {
  const cost = input.cost ?? 1;
  const redisKeys = input.keys.map(redisRateLimitKey);
  const nonce = input.nonce ?? randomUUID();
  const raw = await input.eval(
    REDIS_SLIDING_WINDOW_LUA,
    redisKeys.length,
    ...redisKeys,
    input.now,
    input.policy.windowMs,
    input.policy.limit,
    cost,
    nonce,
  );
  return parseRedisEvalResult(raw);
}

export function redisRateLimitBackend(evalFn: RedisEvalFn): RateLimitBackend {
  return {
    consume(input) {
      return consumeRedisSlidingWindow({ eval: evalFn, ...input });
    },
  };
}

export function redisBackendWithMemoryFallback(
  redis: RateLimitBackend,
  memory: RateLimitBackend,
  onFallback?: (err: unknown) => void,
): RateLimitBackend {
  return {
    async consume(input) {
      try {
        return await redis.consume(input);
      } catch (err) {
        onFallback?.(err);
        return memory.consume(input);
      }
    },
  };
}
