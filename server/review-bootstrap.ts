import "server-only";

import { eq } from "drizzle-orm";
import { inviteCodes } from "@/db/schema";
import {
  REVIEW_INVITE_MAX_USES,
  REVIEW_INVITE_NOTE,
  stubReviewInviteCode,
} from "@/lib/review-preview";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";

export function previewReviewInviteCode(): string | null {
  const providerMode = process.env.PROVIDER_MODE ?? "stub";
  return stubReviewInviteCode(providerMode, process.env.REVIEW_INVITE_CODE);
}

/** Mint (or keep) the known stub invite so product can enter without a CLI mint. */
export async function ensureStubReviewInvite(): Promise<string | null> {
  const env = getEnv();
  const code = stubReviewInviteCode(env.providerMode, process.env.REVIEW_INVITE_CODE);
  if (!code) {
    return null;
  }

  const db = getDb();
  const existing = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
  const row = existing[0];
  if (!row) {
    await db.insert(inviteCodes).values({
      code,
      note: REVIEW_INVITE_NOTE,
      maxUses: REVIEW_INVITE_MAX_USES,
    });
    return code;
  }

  if (row.revokedAt || (row.expiresAt && row.expiresAt.getTime() <= Date.now())) {
    await db
      .update(inviteCodes)
      .set({
        revokedAt: null,
        expiresAt: null,
        maxUses: REVIEW_INVITE_MAX_USES,
        note: REVIEW_INVITE_NOTE,
      })
      .where(eq(inviteCodes.id, row.id));
  } else if (row.maxUses < REVIEW_INVITE_MAX_USES) {
    await db
      .update(inviteCodes)
      .set({ maxUses: REVIEW_INVITE_MAX_USES, note: REVIEW_INVITE_NOTE })
      .where(eq(inviteCodes.id, row.id));
  }

  return code;
}
