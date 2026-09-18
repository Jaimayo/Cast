/**
 * Edge-safe HMAC session token. Payload is JSON `{ sub, exp }`.
 * DB lookups happen in `server/auth.ts` after verification.
 */

const encoder = new TextEncoder();

export type SessionPayload = {
  sub: string;
  exp: number;
};

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

export async function encodeSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function decodeSession(token: string, secret: string): Promise<SessionPayload | null> {
  const [body, signature] = token.split(".");
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

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(body));
    const parsed = JSON.parse(json) as SessionPayload;
    if (typeof parsed.sub !== "string" || typeof parsed.exp !== "number") {
      return null;
    }
    if (parsed.exp * 1000 < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
