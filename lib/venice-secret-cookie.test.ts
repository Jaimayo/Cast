import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, VENICE_SECRET_COOKIE } from "@/lib/constants";
import { decodeSignedPayload, encodeSignedPayload } from "@/lib/session-cookie";
import {
  decodeVeniceSecretCookie,
  encodeVeniceSecretCookie,
  parseVeniceSecretCookiePayload,
  veniceSecretCookieAttrs,
  veniceSecretCookieMatches,
  veniceSecretCookieScope,
  type VeniceSecretCookiePayload,
} from "@/lib/venice-secret-cookie";

const secret = "test-session-secret-not-for-prod-use-32b";
const otherSecret = "different-session-secret-also-32bytes!!";

function payload(overrides: Partial<VeniceSecretCookiePayload> = {}): VeniceSecretCookiePayload {
  return {
    v: 1,
    sub: "user-1",
    emailHash: "abc123abc123abc123abc123abc123ab",
    kind: "key",
    ciphertext: "cipher",
    iv: "iv",
    authTag: "tag",
    last4: "9f3a",
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

describe("signed Venice secret cookie", () => {
  it("round-trips a packed overlay and never stores a raw API key field", async () => {
    const rawKey = "sk-live-settings-secret-9f3a";
    const encoded = await encodeVeniceSecretCookie(payload(), secret);
    const decoded = await decodeVeniceSecretCookie(encoded, secret);
    expect(decoded?.sub).toBe("user-1");
    expect(decoded?.last4).toBe("9f3a");
    expect(decoded?.kind).toBe("key");
    expect(JSON.stringify(decoded)).not.toContain(rawKey);
    expect(encoded).not.toContain(rawKey);
    expect(VENICE_SECRET_COOKIE).toBe("cast_venice");
    expect(VENICE_SECRET_COOKIE).not.toBe("cast_session");
  });

  it("rejects a tampered payload, the wrong secret, and expiry", async () => {
    const encoded = await encodeVeniceSecretCookie(payload(), secret);
    const [body, signature] = encoded.split(".");
    expect(body && signature).toBeTruthy();
    const json = JSON.parse(new TextDecoder().decode(Buffer.from(body!, "base64url"))) as {
      last4: string;
    };
    json.last4 = "zzzz";
    const tamperedBody = Buffer.from(JSON.stringify(json)).toString("base64url");
    expect(await decodeVeniceSecretCookie(`${tamperedBody}.${signature}`, secret)).toBeNull();
    expect(await decodeVeniceSecretCookie(encoded, otherSecret)).toBeNull();
    expect(await decodeVeniceSecretCookie("not.a.token", secret)).toBeNull();
    expect(
      await decodeVeniceSecretCookie(
        await encodeVeniceSecretCookie(payload({ exp: Math.floor(Date.now() / 1000) - 10 }), secret),
        secret,
      ),
    ).toBeNull();
  });

  it("matches by user id or stub email hash", () => {
    const packed = payload();
    expect(veniceSecretCookieMatches(packed, { userId: "user-1" })).toBe(true);
    expect(
      veniceSecretCookieMatches(packed, {
        userId: "other-user",
        emailHash: "abc123abc123abc123abc123abc123ab",
      }),
    ).toBe(true);
    expect(veniceSecretCookieMatches(packed, { userId: "other-user", emailHash: "nope" })).toBe(false);
    expect(veniceSecretCookieScope("user-1", packed.emailHash)).toBe(`stub-email:${packed.emailHash}`);
    expect(veniceSecretCookieScope("user-1")).toBe("user:user-1");
  });

  it("uses the same httpOnly path attrs as the session cookie and keeps maxAge on save", () => {
    const attrs = veniceSecretCookieAttrs({ production: true });
    expect(attrs).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    expect(parseVeniceSecretCookiePayload({ v: 1, sub: "x", exp: 1, kind: "nope" })).toBeNull();
  });

  it("shares HMAC encoding with the session token helper", async () => {
    const token = await encodeSignedPayload({ hello: "world" }, secret);
    expect(await decodeSignedPayload(token, secret)).toEqual({ hello: "world" });
    expect(await decodeSignedPayload(token, otherSecret)).toBeNull();
  });
});
