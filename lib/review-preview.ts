import { classifyInvite, normalizeInviteCode, type InviteIssue } from "@/lib/invite-status";
import { roleForEmail } from "@/lib/auth-guards";

export const DEFAULT_REVIEW_INVITE_CODE = "castreview";
export const DEFAULT_REVIEW_ADMIN_EMAIL = "jai@cast.review";
export const REVIEW_INVITE_MAX_USES = 50;
export const REVIEW_INVITE_NOTE = "stub product-review";
export const STUB_REVIEW_ADMIN_HINT =
  "Product review: redeem as jai@cast.review with invite code castreview, then open Settings.";

export function parseAdminEmails(raw: string | undefined | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** Stub always includes the documented review admin so Invites (/admin/invites) is reachable. */
export function adminEmailsForMode(providerMode: string, envEmails: readonly string[]): string[] {
  const emails = [...envEmails];
  if (providerMode !== "stub") {
    return emails;
  }
  const documented = DEFAULT_REVIEW_ADMIN_EMAIL.toLowerCase();
  if (!emails.includes(documented)) {
    emails.push(documented);
  }
  return emails;
}

/**
 * Cookie-only stub review (no DATABASE_URL, ADMIN_EMAILS unset): every redeemed
 * invite is admin so the studio rail shows Invites without a secret allow-list.
 */
export function stubReviewGrantsAdmin(input: {
  providerMode: string;
  memoryPreview: boolean;
  envAdminEmails: readonly string[];
}): boolean {
  return input.providerMode === "stub" && input.memoryPreview && input.envAdminEmails.length === 0;
}

export function roleForReviewUser(
  email: string,
  input: { adminEmails: readonly string[]; stubReviewGrantsAdmin: boolean },
): "admin" | "consumer" {
  if (input.stubReviewGrantsAdmin) {
    return "admin";
  }
  return roleForEmail(email, input.adminEmails);
}

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
