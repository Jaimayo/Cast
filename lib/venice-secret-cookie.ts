/**
 * Signed httpOnly overlay for per-user Venice secrets when Postgres is unavailable.
 * Ciphertext is AES-256-GCM (SESSION_SECRET); this file only HMAC-wraps that packed payload.
 */

import { SESSION_TTL_SECONDS, VENICE_SECRET_COOKIE } from "@/lib/constants";
import { decodeSignedPayload, encodeSignedPayload, sessionCookieAttrs } from "@/lib/session-cookie";

export { VENICE_SECRET_COOKIE };

export type VeniceSecretCookieKind = "key" | "disconnected";

export type VeniceSecretCookiePayload = {
  v: 1;
  sub: string;
  emailHash?: string;
  kind: VeniceSecretCookieKind;
  ciphertext?: string;
  iv?: string;
  authTag?: string;
  last4?: string;
  exp: number;
};

export function veniceSecretCookieAttrs(input: { production: boolean; maxAge?: number }) {
  return sessionCookieAttrs({
    production: input.production,
    maxAge: input.maxAge ?? SESSION_TTL_SECONDS,
  });
}

export function veniceSecretCookieScope(userId: string, emailHash?: string): string {
  if (emailHash) {
    return `stub-email:${emailHash}`;
  }
  return `user:${userId}`;
}

function isKind(value: unknown): value is VeniceSecretCookieKind {
  return value === "key" || value === "disconnected";
}

export function parseVeniceSecretCookiePayload(raw: unknown): VeniceSecretCookiePayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const parsed = raw as Partial<VeniceSecretCookiePayload>;
  if (parsed.v !== 1) {
    return null;
  }
  if (typeof parsed.sub !== "string" || parsed.sub.length === 0 || typeof parsed.exp !== "number") {
    return null;
  }
  if (!Number.isFinite(parsed.exp) || parsed.exp * 1000 < Date.now()) {
    return null;
  }
  if (!isKind(parsed.kind)) {
    return null;
  }
  const emailHash =
    typeof parsed.emailHash === "string" && parsed.emailHash.length >= 16 ? parsed.emailHash : undefined;
  if (parsed.kind === "disconnected") {
    return { v: 1, sub: parsed.sub, emailHash, kind: "disconnected", exp: parsed.exp };
  }
  if (
    typeof parsed.ciphertext !== "string" ||
    typeof parsed.iv !== "string" ||
    typeof parsed.authTag !== "string" ||
    typeof parsed.last4 !== "string" ||
    parsed.last4.length < 1
  ) {
    return null;
  }
  return {
    v: 1,
    sub: parsed.sub,
    emailHash,
    kind: "key",
    ciphertext: parsed.ciphertext,
    iv: parsed.iv,
    authTag: parsed.authTag,
    last4: parsed.last4,
    exp: parsed.exp,
  };
}

export async function encodeVeniceSecretCookie(
  payload: VeniceSecretCookiePayload,
  secret: string,
): Promise<string> {
  return encodeSignedPayload(payload, secret);
}

export async function decodeVeniceSecretCookie(
  token: string,
  secret: string,
): Promise<VeniceSecretCookiePayload | null> {
  return parseVeniceSecretCookiePayload(await decodeSignedPayload(token, secret));
}

export function veniceSecretCookieMatches(
  payload: VeniceSecretCookiePayload,
  identity: { userId: string; emailHash?: string },
): boolean {
  if (payload.sub === identity.userId) {
    return true;
  }
  return Boolean(identity.emailHash && payload.emailHash && payload.emailHash === identity.emailHash);
}
