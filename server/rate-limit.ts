import {
  RATE_LIMIT_CODES,
  RATE_LIMIT_POLICIES,
  RateLimitError,
  assertInFlightCap,
  consumeAllKeys,
  consumeSlidingWindow,
  inviteRedeemKeys,
  rateLimitCodeForAction,
  userActionKey,
  type HitStore,
  type RateLimitAction,
} from "@/lib/rate-limit";

const memoryHits: HitStore = new Map();

export function memoryRateLimitStore(): HitStore {
  return memoryHits;
}

export function resetMemoryRateLimits(): void {
  memoryHits.clear();
}

export function consumeInviteRedeemLimit(input: { email: string; ip: string; now?: number }): void {
  const now = input.now ?? Date.now();
  const result = consumeAllKeys({
    store: memoryHits,
    keys: inviteRedeemKeys(input),
    now,
    policy: RATE_LIMIT_POLICIES.inviteRedeem,
  });
  if (!result.allowed) {
    throw new RateLimitError(RATE_LIMIT_CODES.INVITE_REDEEM_RATE_LIMIT, result.retryAfterSeconds);
  }
}

export function consumeUserActionLimit(
  action: Exclude<RateLimitAction, "inviteRedeem">,
  userId: string,
  cost = 1,
  now = Date.now(),
): void {
  const policy = RATE_LIMIT_POLICIES[action];
  const result = consumeSlidingWindow({
    store: memoryHits,
    key: userActionKey(action, userId),
    now,
    limit: policy.limit,
    windowMs: policy.windowMs,
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
