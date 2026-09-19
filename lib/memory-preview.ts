/** Documented fallback so a stub Vercel preview can sign cookies without extra secrets. */
export const STUB_PREVIEW_SESSION_SECRET = "cast-stage1-review-stub-session";

export function isMemoryPreviewMode(input: {
  providerMode: string;
  databaseUrl?: string | null;
}): boolean {
  return input.providerMode === "stub" && !input.databaseUrl;
}

/** Use a real SESSION_SECRET when set. Stub-only default is for product review, never live. */
export function stubSessionSecret(providerMode: string, envSecret?: string | null): string | undefined {
  const secret = envSecret?.trim();
  if (secret) {
    return secret;
  }
  if (providerMode === "stub") {
    return STUB_PREVIEW_SESSION_SECRET;
  }
  return undefined;
}

/** Deterministic UUID derived from the session user so Mara/Iris survive across serverless instances. */
export function previewPackId(userId: string, slot: "locked" | "draft"): string {
  const suffix = slot === "locked" ? "000000000001" : "000000000002";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return `${userId.slice(0, 24)}${suffix}`;
  }
  return slot === "locked"
    ? "00000000-0000-4000-8000-000000000001"
    : "00000000-0000-4000-8000-000000000002";
}
