import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertVeniceApiKeyShape,
  decryptOperatorSecret,
  decryptSecret,
  disconnectVeniceApiKey,
  encryptOperatorSecret,
  encryptSecret,
  getVenicePublicStatus,
  resetVeniceSecretOverlayForTests,
  resolveVeniceApiKey,
  saveVeniceApiKey,
  setVeniceCookieJarForTests,
} from "@/server/venice-secret";
import { VeniceConnectError } from "@/lib/venice-settings";
import { VENICE_SECRET_COOKIE } from "@/lib/constants";
import { stubPreviewUserId } from "@/lib/stub-user-id";
import { decodeVeniceSecretCookie } from "@/lib/venice-secret-cookie";

const SESSION = "test-session-secret-not-for-prod-use-32b";
const KEY = "sk-live-settings-secret-9f3a";
const USER_A = "user-a-1111-1111-1111-111111111111";
const USER_B = "user-b-2222-2222-2222-222222222222";

describe("per-user Venice secret", () => {
  afterEach(() => {
    resetVeniceSecretOverlayForTests();
    vi.unstubAllEnvs();
  });

  it("round-trips AES-256-GCM without putting plaintext in the packed payload", () => {
    const packed = encryptOperatorSecret(KEY, SESSION);
    expect(packed.ciphertext).not.toContain(KEY);
    expect(packed.iv).toBeTruthy();
    expect(packed.authTag).toBeTruthy();
    expect(JSON.stringify(packed)).not.toContain(KEY);
    expect(decryptOperatorSecret(packed, SESSION)).toBe(KEY);
  });

  it("binds ciphertext to the user id so another user's key cannot decrypt it", () => {
    const packed = encryptSecret(KEY, SESSION, `user:${USER_A}`);
    expect(decryptSecret(packed, SESSION, `user:${USER_A}`)).toBe(KEY);
    expect(() => decryptSecret(packed, SESSION, `user:${USER_B}`)).toThrow();
  });

  it("saves a settings key, masks last4, and never echoes the full key", async () => {
    vi.stubEnv("VENICE_API_KEY", "");
    vi.stubEnv("PROVIDER_MODE", "stub");
    const saved = await saveVeniceApiKey({ apiKey: `  ${KEY}  `, userId: USER_A });
    expect(saved.connected).toBe(true);
    expect(saved.status).toBe("Connected");
    expect(saved.maskedKey).toBe("••••9f3a");
    expect(saved.storage).toBe("settings");
    expect(saved.generateStillUsesVenice).toBe(false);
    expect(JSON.stringify(saved)).not.toContain(KEY);
    expect(await resolveVeniceApiKey(USER_A)).toBe(KEY);

    const status = await getVenicePublicStatus(USER_A);
    expect(status.maskedKey).toBe("••••9f3a");
    expect(JSON.stringify(status)).not.toContain(KEY);
  });

  it("keeps two users' keys isolated", async () => {
    const keyA = "sk-live-user-a-key-aaaa";
    const keyB = "sk-live-user-b-key-bbbb";
    await saveVeniceApiKey({ apiKey: keyA, userId: USER_A });
    await saveVeniceApiKey({ apiKey: keyB, userId: USER_B });
    expect(await resolveVeniceApiKey(USER_A)).toBe(keyA);
    expect(await resolveVeniceApiKey(USER_B)).toBe(keyB);
    const statusA = await getVenicePublicStatus(USER_A);
    const statusB = await getVenicePublicStatus(USER_B);
    expect(statusA.maskedKey).toBe("••••aaaa");
    expect(statusB.maskedKey).toBe("••••bbbb");
    expect(JSON.stringify(statusA)).not.toContain(keyA);
    expect(JSON.stringify(statusA)).not.toContain(keyB);
    expect(JSON.stringify(statusB)).not.toContain(keyA);
  });

  it("prefers the user's settings overlay over VENICE_API_KEY env", async () => {
    vi.stubEnv("VENICE_API_KEY", "env-key-should-not-win-xxxx");
    await saveVeniceApiKey({ apiKey: KEY, userId: USER_A });
    expect(await resolveVeniceApiKey(USER_A)).toBe(KEY);
    const status = await getVenicePublicStatus(USER_A);
    expect(status.storage).toBe("settings");
    expect(status.maskedKey).toBe("••••9f3a");
    expect(JSON.stringify(status)).not.toContain("env-key-should-not-win-xxxx");
  });

  it("disconnects so that user's generateStill cannot use env until a new key is saved", async () => {
    vi.stubEnv("VENICE_API_KEY", "env-key-after-disconnect-zzzz");
    vi.stubEnv("PROVIDER_MODE", "live");
    await saveVeniceApiKey({ apiKey: KEY, userId: USER_A });
    const disconnected = await disconnectVeniceApiKey(USER_A);
    expect(disconnected.connected).toBe(false);
    expect(disconnected.status).toBe("Not connected");
    expect(disconnected.maskedKey).toBeNull();
    expect(disconnected.generateStillUsesVenice).toBe(false);
    expect(await resolveVeniceApiKey(USER_A)).toBeUndefined();
    expect(JSON.stringify(disconnected)).not.toMatch(/env-key-after-disconnect|sk-live/i);
  });

  it("does not treat a deploy env key as this user Connected", async () => {
    vi.stubEnv("VENICE_API_KEY", "env-only-key-abcd");
    vi.stubEnv("PROVIDER_MODE", "live");
    expect(await resolveVeniceApiKey(USER_A)).toBe("env-only-key-abcd");
    const status = await getVenicePublicStatus(USER_A);
    expect(status.connected).toBe(false);
    expect(status.storage).toBe("none");
    expect(status.maskedKey).toBeNull();
    expect(status.generateStillUsesVenice).toBe(false);
    expect(JSON.stringify(status)).not.toContain("env-only-key-abcd");
  });

  it("leaves another user's key in place when this user disconnects", async () => {
    await saveVeniceApiKey({ apiKey: KEY, userId: USER_A });
    await saveVeniceApiKey({ apiKey: "sk-live-user-b-key-bbbb", userId: USER_B });
    await disconnectVeniceApiKey(USER_A);
    expect(await resolveVeniceApiKey(USER_A)).toBeUndefined();
    expect(await resolveVeniceApiKey(USER_B)).toBe("sk-live-user-b-key-bbbb");
  });

  it("rejects short or empty keys with user-safe copy", () => {
    expect(() => assertVeniceApiKeyShape("")).toThrow(VeniceConnectError);
    expect(() => assertVeniceApiKeyShape("short")).toThrow(VeniceConnectError);
    expect(() => assertVeniceApiKeyShape("short")).toThrow(/didn’t work/);
    expect(() => assertVeniceApiKeyShape(KEY)).not.toThrow();
  });
});

function memoryCookieJar() {
  const store = new Map<string, string>();
  return {
    store,
    jar: {
      get(name: string) {
        const value = store.get(name);
        return value === undefined ? undefined : { value };
      },
      set(name: string, value: string) {
        if (!value) {
          store.delete(name);
          return;
        }
        store.set(name, value);
      },
    },
  };
}

describe("stub review Venice cookie persistence", () => {
  const email = "venice-qa@cast.review";

  afterEach(() => {
    resetVeniceSecretOverlayForTests();
    setVeniceCookieJarForTests(null);
    vi.unstubAllEnvs();
  });

  function stubReviewEnv() {
    vi.stubEnv("PROVIDER_MODE", "stub");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("SESSION_SECRET", SESSION);
    vi.stubEnv("VENICE_API_KEY", "");
    vi.stubEnv("NODE_ENV", "test");
  }

  it("survives a new isolate and a later login as the same email", async () => {
    stubReviewEnv();
    const { jar, store } = memoryCookieJar();
    setVeniceCookieJarForTests(jar);
    const userId = stubPreviewUserId(email);

    const saved = await saveVeniceApiKey({ apiKey: KEY, userId, email });
    expect(saved.connected).toBe(true);
    expect(saved.status).toBe("Connected");
    expect(saved.maskedKey).toBe("••••9f3a");
    expect(JSON.stringify(saved)).not.toContain(KEY);

    const token = store.get(VENICE_SECRET_COOKIE);
    expect(token).toBeTruthy();
    const packed = await decodeVeniceSecretCookie(token!, SESSION);
    expect(packed?.kind).toBe("key");
    expect(packed?.last4).toBe("9f3a");
    expect(JSON.stringify(packed)).not.toContain(KEY);
    expect(token).not.toContain(KEY);

    resetVeniceSecretOverlayForTests();
    expect(store.get(VENICE_SECRET_COOKIE)).toBe(token);

    const afterColdStart = await getVenicePublicStatus({ userId, email });
    expect(afterColdStart.connected).toBe(true);
    expect(afterColdStart.status).toBe("Connected");
    expect(afterColdStart.maskedKey).toBe("••••9f3a");
    expect(afterColdStart.storage).toBe("settings");
    expect(JSON.stringify(afterColdStart)).not.toContain(KEY);
    expect(await resolveVeniceApiKey(userId, email)).toBe(KEY);

    resetVeniceSecretOverlayForTests();
    const reloginId = stubPreviewUserId("  Venice-QA@cast.review ");
    expect(reloginId).toBe(userId);
    const afterRelogin = await getVenicePublicStatus({ userId: reloginId, email: "Venice-QA@cast.review" });
    expect(afterRelogin.connected).toBe(true);
    expect(afterRelogin.maskedKey).toBe("••••9f3a");
  });

  it("keys the stub cookie by email hash when user ids are not reused", async () => {
    stubReviewEnv();
    const { jar } = memoryCookieJar();
    setVeniceCookieJarForTests(jar);
    await saveVeniceApiKey({
      apiKey: KEY,
      userId: "11111111-1111-4111-8111-111111111111",
      email,
    });
    resetVeniceSecretOverlayForTests();
    const status = await getVenicePublicStatus({
      userId: "22222222-2222-4222-8222-222222222222",
      email,
    });
    expect(status.connected).toBe(true);
    expect(status.maskedKey).toBe("••••9f3a");
    expect(JSON.stringify(status)).not.toContain(KEY);
    expect(await resolveVeniceApiKey("22222222-2222-4222-8222-222222222222", email)).toBe(KEY);
  });

  it("does not leak another email's stub cookie", async () => {
    stubReviewEnv();
    const { jar } = memoryCookieJar();
    setVeniceCookieJarForTests(jar);
    await saveVeniceApiKey({ apiKey: KEY, userId: stubPreviewUserId(email), email });
    resetVeniceSecretOverlayForTests();
    const other = await getVenicePublicStatus({
      userId: stubPreviewUserId("other@cast.review"),
      email: "other@cast.review",
    });
    expect(other.connected).toBe(false);
    expect(other.status).toBe("Not connected");
    expect(other.maskedKey).toBeNull();
    expect(await resolveVeniceApiKey(stubPreviewUserId("other@cast.review"), "other@cast.review")).toBeUndefined();
  });

  it("persists Disconnect across a cold start so env is not treated as Connected", async () => {
    stubReviewEnv();
    vi.stubEnv("VENICE_API_KEY", "env-key-after-disconnect-zzzz");
    const { jar } = memoryCookieJar();
    setVeniceCookieJarForTests(jar);
    const userId = stubPreviewUserId(email);
    await saveVeniceApiKey({ apiKey: KEY, userId, email });
    await disconnectVeniceApiKey(userId, email);
    resetVeniceSecretOverlayForTests();
    const status = await getVenicePublicStatus({ userId, email });
    expect(status.connected).toBe(false);
    expect(status.status).toBe("Not connected");
    expect(status.maskedKey).toBeNull();
    expect(await resolveVeniceApiKey(userId, email)).toBeUndefined();
    expect(JSON.stringify(status)).not.toMatch(/env-key-after-disconnect|sk-live/i);
  });
});
