import "server-only";

import type { User } from "@/db/schema";
import { isMemoryPreviewMode } from "@/lib/memory-preview";
import type { SessionPayload } from "@/lib/session-cookie";
import { getEnv } from "@/server/env";

export function isMemoryPreview(): boolean {
  const env = getEnv();
  return isMemoryPreviewMode({ providerMode: env.providerMode, databaseUrl: env.databaseUrl });
}

export function previewUserFromSession(payload: SessionPayload): User {
  const now = new Date();
  const role = payload.role === "admin" ? "admin" : "consumer";
  return {
    id: payload.sub,
    email: payload.email ?? `preview+${payload.sub.replaceAll("-", "").slice(0, 8)}@cast.review`,
    passwordHash: "preview",
    role,
    ageAttestedAt: payload.age ? now : null,
    createdAt: now,
    updatedAt: now,
  };
}
