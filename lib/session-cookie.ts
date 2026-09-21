/**
 * Edge-safe HMAC session token. Payload is JSON `{ sub, exp, age }`.
 * DB lookups happen in `server/auth.ts` after verification.
 */

import { SESSION_REFRESH_REMAINING_SECONDS } from "@/lib/constants";

const encoder = new TextEncoder();

export type SessionPayload = {
  sub: string;
  exp: number;
  /** True after ageAttestedAt is set. Middleware reads this — no DB on the edge. */
  age: boolean;
  /** Present in stub memory preview so layouts can render without Postgres. */
  email?: string;
  role?: "admin" | "consumer";
};

export type SessionCookieAttrs = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
  expires?: Date;
};

export function sessionCookieAttrs(input: {
  production: boolean;
  maxAge: number;
}): SessionCookieAttrs {
  const attrs: SessionCookieAttrs = {
    httpOnly: true,
    sameSite: "lax",
    secure: input.production,
    path: "/",
    maxAge: input.maxAge,
  };
  if (input.maxAge <= 0) {
    attrs.expires = new Date(0);
  }
  return attrs;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function encodeSignedPayload(payload: unknown, secret: string): Promise<string> {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function decodeSignedPayload(token: string, secret: string): Promise<unknown | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return null;
    }
    const [body, signature] = parts;
    if (!body || !signature) {
      return null;
    }

    const key = await importKey(secret);
    const expected = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const actual = base64UrlToBytes(signature);
    const expectedBytes = new Uint8Array(expected);
    if (expectedBytes.length !== actual.length) {
      return null;
    }

    let mismatch = 0;
    for (let i = 0; i < expectedBytes.length; i += 1) {
      mismatch |= (expectedBytes[i] ?? 0) ^ (actual[i] ?? 0);
    }
    if (mismatch !== 0) {
      return null;
    }

    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as unknown;
  } catch {
    return null;
  }
}

export async function encodeSession(payload: SessionPayload, secret: string): Promise<string> {
  return encodeSignedPayload(payload, secret);
}

export async function decodeSession(token: string, secret: string): Promise<SessionPayload | null> {
  const parsed = (await decodeSignedPayload(token, secret)) as Partial<SessionPayload> | null;
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  if (typeof parsed.sub !== "string" || parsed.sub.length === 0 || typeof parsed.exp !== "number") {
    return null;
  }
  if (!Number.isFinite(parsed.exp) || parsed.exp * 1000 < Date.now()) {
    return null;
  }
  const role = parsed.role === "admin" || parsed.role === "consumer" ? parsed.role : undefined;
  const email = typeof parsed.email === "string" && parsed.email.includes("@") ? parsed.email : undefined;
  return { sub: parsed.sub, exp: parsed.exp, age: Boolean(parsed.age), email, role };
}

export function sessionNeedsRefresh(
  payload: Pick<SessionPayload, "sub" | "exp" | "age"> | null,
  expected: { sub: string; age: boolean },
  nowSeconds = Math.floor(Date.now() / 1000),
  refreshWhenRemaining = SESSION_REFRESH_REMAINING_SECONDS,
): boolean {
  if (!payload) {
    return true;
  }
  if (payload.sub !== expected.sub || payload.age !== expected.age) {
    return true;
  }
  return payload.exp - nowSeconds < refreshWhenRemaining;
}
