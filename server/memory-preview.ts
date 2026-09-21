import "server-only";

import type { User } from "@/db/schema";
import { isMemoryPreviewMode } from "@/lib/memory-preview";
import { roleForReviewUser } from "@/lib/review-preview";
import type { SessionPayload } from "@/lib/session-cookie";
import { getEnv } from "@/server/env";

export function isMemoryPreview(): boolean {
  const env = getEnv();
  return isMemoryPreviewMode({ providerMode: env.providerMode, databaseUrl: env.databaseUrl });
}

export function previewUserFromSession(payload: SessionPayload): User {
  const now = new Date();
  const env = getEnv();
  const email = payload.email ?? `preview+${payload.sub.replaceAll("-", "").slice(0, 8)}@cast.review`;
  const role = roleForReviewUser(email, {
    adminEmails: env.adminEmails,
    stubReviewGrantsAdmin: env.stubReviewGrantsAdmin,
  });
  return {
    id: payload.sub,
    email,
    passwordHash: "preview",
    role,
    ageAttestedAt: payload.age ? now : null,
    createdAt: now,
    updatedAt: now,
  };
}
