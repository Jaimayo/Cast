import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS } from "@/lib/constants";
import { decodeSession, encodeSession, sessionCookieAttrs } from "@/lib/session-cookie";

const secret = "test-session-secret-not-for-prod-use-32b";
const otherSecret = "different-session-secret-also-32bytes!!";

async function token(overrides: { sub?: string; exp?: number; age?: boolean } = {}) {
  return encodeSession(
    {
      sub: overrides.sub ?? "user-1",
      exp: overrides.exp ?? Math.floor(Date.now() / 1000) + 3600,
      age: overrides.age ?? false,
    },
    secret,
  );
}

describe("signed session cookies", () => {
  it("round-trips a valid payload including the age flag", async () => {
    const encoded = await token({ age: true });
    const payload = await decodeSession(encoded, secret);
    expect(payload?.sub).toBe("user-1");
    expect(payload?.age).toBe(true);
  });

  it("round-trips optional email and role for stub memory preview", async () => {
    const encoded = await encodeSession(
      {
        sub: "user-1",
        exp: Math.floor(Date.now() / 1000) + 3600,
        age: true,
        email: "jai@example.com",
        role: "consumer",
      },
      secret,
    );
    const payload = await decodeSession(encoded, secret);
    expect(payload).toMatchObject({
      sub: "user-1",
      age: true,
      email: "jai@example.com",
      role: "consumer",
    });
  });

  it("rejects a tampered payload that tries to flip the age flag", async () => {
    const encoded = await token({ age: false });
    const [body, signature] = encoded.split(".");
    expect(body && signature).toBeTruthy();
    const json = JSON.parse(new TextDecoder().decode(Buffer.from(body!, "base64url"))) as {
      sub: string;
      exp: number;
      age: boolean;
    };
    json.age = true;
    const tamperedBody = Buffer.from(JSON.stringify(json)).toString("base64url");
    expect(await decodeSession(`${tamperedBody}.${signature}`, secret)).toBeNull();
  });

  it("rejects a tampered signature, extra segments, and the wrong secret", async () => {
    const encoded = await token();
    const [body, signature] = encoded.split(".");
    expect(await decodeSession(`${body}.${signature}aa`, secret)).toBeNull();
    expect(await decodeSession(`${encoded}.extra`, secret)).toBeNull();
    expect(await decodeSession(encoded, otherSecret)).toBeNull();
    expect(await decodeSession("not-a-token", secret)).toBeNull();
    expect(await decodeSession("", secret)).toBeNull();
  });

  it("rejects expired cookies and invalid base64 without throwing", async () => {
    const expired = await token({ exp: Math.floor(Date.now() / 1000) - 10 });
    expect(await decodeSession(expired, secret)).toBeNull();
    expect(await decodeSession("%%%notbase64.%%%notbase64", secret)).toBeNull();
  });

  it("signs out by clearing the same httpOnly path cookie the session used", () => {
    const set = sessionCookieAttrs({ production: true, maxAge: SESSION_TTL_SECONDS });
    const clear = sessionCookieAttrs({ production: true, maxAge: 0 });
    expect(set).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    expect(clear.path).toBe(set.path);
    expect(clear.httpOnly).toBe(true);
    expect(clear.sameSite).toBe("lax");
    expect(clear.secure).toBe(set.secure);
    expect(clear.maxAge).toBe(0);
    expect(clear.expires?.getTime()).toBe(0);
  });
});
