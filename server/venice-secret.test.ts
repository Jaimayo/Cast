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
} from "@/server/venice-secret";
import { VeniceConnectError } from "@/lib/venice-settings";

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
