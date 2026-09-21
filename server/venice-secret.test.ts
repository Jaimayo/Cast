import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertVeniceApiKeyShape,
  decryptOperatorSecret,
  disconnectVeniceApiKey,
  encryptOperatorSecret,
  getVenicePublicStatus,
  resetVeniceSecretOverlayForTests,
  resolveVeniceApiKey,
  saveVeniceApiKey,
} from "@/server/venice-secret";
import { VeniceConnectError } from "@/lib/venice-settings";

const SESSION = "test-session-secret-not-for-prod-use-32b";
const KEY = "sk-live-settings-secret-9f3a";

describe("operator Venice secret", () => {
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

  it("saves a settings key, masks last4, and never echoes the full key", async () => {
    vi.stubEnv("VENICE_API_KEY", "");
    vi.stubEnv("PROVIDER_MODE", "stub");
    const saved = await saveVeniceApiKey({ apiKey: `  ${KEY}  `, actorId: "admin-1" });
    expect(saved.connected).toBe(true);
    expect(saved.status).toBe("Connected");
    expect(saved.maskedKey).toBe("••••9f3a");
    expect(saved.storage).toBe("settings");
    expect(saved.generateStillUsesVenice).toBe(false);
    expect(JSON.stringify(saved)).not.toContain(KEY);
    expect(await resolveVeniceApiKey()).toBe(KEY);

    const status = await getVenicePublicStatus();
    expect(status.maskedKey).toBe("••••9f3a");
    expect(JSON.stringify(status)).not.toContain(KEY);
  });

  it("prefers the settings overlay over VENICE_API_KEY env", async () => {
    vi.stubEnv("VENICE_API_KEY", "env-key-should-not-win-xxxx");
    await saveVeniceApiKey({ apiKey: KEY, actorId: "admin-1" });
    expect(await resolveVeniceApiKey()).toBe(KEY);
    const status = await getVenicePublicStatus();
    expect(status.storage).toBe("settings");
    expect(status.maskedKey).toBe("••••9f3a");
    expect(JSON.stringify(status)).not.toContain("env-key-should-not-win-xxxx");
  });

  it("disconnects so generateStill cannot use env until a new key is saved", async () => {
    vi.stubEnv("VENICE_API_KEY", "env-key-after-disconnect-zzzz");
    vi.stubEnv("PROVIDER_MODE", "live");
    await saveVeniceApiKey({ apiKey: KEY, actorId: "admin-1" });
    const disconnected = await disconnectVeniceApiKey("admin-1");
    expect(disconnected.connected).toBe(false);
    expect(disconnected.status).toBe("Not connected");
    expect(disconnected.maskedKey).toBeNull();
    expect(disconnected.generateStillUsesVenice).toBe(false);
    expect(await resolveVeniceApiKey()).toBeUndefined();
    expect(JSON.stringify(disconnected)).not.toMatch(/env-key-after-disconnect|sk-live/i);
  });

  it("falls back to env when nothing is saved", async () => {
    vi.stubEnv("VENICE_API_KEY", "env-only-key-abcd");
    vi.stubEnv("PROVIDER_MODE", "live");
    expect(await resolveVeniceApiKey()).toBe("env-only-key-abcd");
    const status = await getVenicePublicStatus();
    expect(status.connected).toBe(true);
    expect(status.storage).toBe("env");
    expect(status.maskedKey).toBe("••••abcd");
    expect(status.generateStillUsesVenice).toBe(true);
    expect(JSON.stringify(status)).not.toContain("env-only-key-abcd");
  });

  it("rejects short or empty keys with user-safe copy", () => {
    expect(() => assertVeniceApiKeyShape("")).toThrow(VeniceConnectError);
    expect(() => assertVeniceApiKeyShape("short")).toThrow(/doesn't look valid/);
    expect(() => assertVeniceApiKeyShape(KEY)).not.toThrow();
  });
});
