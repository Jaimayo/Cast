/** Documented fallback so a stub product-review deploy can sign cookies without extra secrets. */
export const STUB_PREVIEW_SESSION_SECRET = "cast-stage1-review-stub-session";

/** Cookie-only invite/session when stub mode has no Postgres. */
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
