import { AuthError } from "@/lib/auth-error";
import { z } from "zod";

export type InviteRedemptionState = {
  revokedAt: Date | string | null;
  expiresAt: Date | string | null;
  useCount: number;
  maxUses: number;
};

export type InviteIssue = "ok" | "invalid" | "revoked" | "used" | "expired";

export const INVITE_ERROR_MESSAGE: Record<Exclude<InviteIssue, "ok">, string> = {
  invalid: "This invite code is invalid.",
  revoked: "This invite code has been revoked.",
  used: "This invite code has already been used.",
  expired: "This invite code has expired.",
};

export const inviteRedeemBodySchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(10, "Password must be at least 10 characters"),
  inviteCode: z.string().min(4, INVITE_ERROR_MESSAGE.invalid),
});

export function normalizeInviteCode(code: string): string {
  return code.trim();
}

export function classifyInvite(
  invite: InviteRedemptionState | null | undefined,
  now: Date = new Date(),
): InviteIssue {
  if (!invite) {
    return "invalid";
  }
  if (invite.revokedAt) {
    return "revoked";
  }
  if (invite.useCount >= invite.maxUses) {
    return "used";
  }
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= now.getTime()) {
    return "expired";
  }
  return "ok";
}

export function throwIfInviteUnusable(issue: InviteIssue): asserts issue is "ok" {
  if (issue === "ok") {
    return;
  }
  throw new AuthError(INVITE_ERROR_MESSAGE[issue], 400);
}
