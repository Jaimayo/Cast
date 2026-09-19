import { classifyInvite, normalizeInviteCode, type InviteIssue } from "@/lib/invite-status";

export const DEFAULT_REVIEW_INVITE_CODE = "castreview";

/** Known invite for Stage 1 product review when PROVIDER_MODE=stub (no mint required). */
export function stubReviewInviteCode(providerMode: string, envCode?: string): string | null {
  if (providerMode !== "stub") {
    return null;
  }
  const code = (envCode ?? DEFAULT_REVIEW_INVITE_CODE).trim();
  return code.length >= 4 ? code : DEFAULT_REVIEW_INVITE_CODE;
}

/**
 * Stub-without-Postgres invite states. Wrong code → invalid.
 * Used/expired/revoked still come from the Postgres invite row when a database is configured.
 */
export function classifyStubReviewInvite(
  code: string,
  expected: string | null,
  now: Date = new Date(),
): InviteIssue {
  if (!expected) {
    return "invalid";
  }
  if (normalizeInviteCode(code) !== expected) {
    return "invalid";
  }
  return classifyInvite(
    {
      revokedAt: null,
      expiresAt: null,
      useCount: 0,
      maxUses: 1,
    },
    now,
  );
}
