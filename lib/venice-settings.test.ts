import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AGE_ATTEST_COPY } from "@/lib/age-attest";
import {
  VENICE_API_SETTINGS_URL,
  VENICE_CONNECT_HELP,
  VENICE_CONNECT_TITLE,
  VENICE_DISCONNECT,
  VENICE_SAVE_KEY,
  VENICE_STATUS_CONNECTED,
  VENICE_STATUS_DISCONNECTED,
  maskVeniceApiKey,
  normalizeVeniceApiKey,
  veniceStatusLabel,
  type VenicePublicStatus,
} from "@/lib/venice-settings";

function readRepo(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Connect Venice copy", () => {
  it("locks Branding-ready labels and the API settings URL", () => {
    expect(VENICE_CONNECT_TITLE).toBe("Connect Venice");
    expect(VENICE_STATUS_CONNECTED).toBe("Connected");
    expect(VENICE_STATUS_DISCONNECTED).toBe("Not connected");
    expect(VENICE_SAVE_KEY).toBe("Save key");
    expect(VENICE_DISCONNECT).toBe("Disconnect");
    expect(VENICE_API_SETTINGS_URL).toBe("https://venice.ai/settings/api");
    expect(VENICE_CONNECT_HELP).toContain("venice.ai/settings/api");
  });

  it("does not change locked 18+ copy or landing strings", () => {
    expect(AGE_ATTEST_COPY).toBe("I confirm I am 18+.");
    expect(readRepo("lib/age-attest.ts")).toContain('export const AGE_ATTEST_COPY = "I confirm I am 18+.";');
    expect(readRepo("lib/landing-copy.ts")).toContain("Private studio for all your imaginations.");
  });
});

describe("Venice key masking", () => {
  it("masks as ••••last4 and never returns the full key", () => {
    const key = "sk-live-secret-key-9f3a";
    expect(maskVeniceApiKey(key)).toBe("••••9f3a");
    expect(maskVeniceApiKey(key)).not.toBe(key);
    expect(maskVeniceApiKey("abcd")).toBe("••••abcd");
    expect(maskVeniceApiKey("  padded-key-xy  ")).toBe("••••y-xy");
    expect(maskVeniceApiKey("")).toBe("");
  });

  it("keeps public status payloads free of the raw key", () => {
    const key = "sk-live-do-not-echo-this-value";
    const status: VenicePublicStatus = {
      connected: true,
      status: veniceStatusLabel(true),
      maskedKey: maskVeniceApiKey(key),
      storage: "settings",
      generateStillUsesVenice: false,
      providerMode: "stub",
    };
    expect(JSON.stringify(status)).not.toContain(key);
    expect(status.maskedKey).toBe("••••alue");
    expect(normalizeVeniceApiKey(` ${key} `)).toBe(key);
    expect(normalizeVeniceApiKey(null)).toBe("");
  });

  it("keeps Connect Venice UI client-safe and invite-gated", () => {
    const ui = readRepo("components/connect-venice.tsx");
    expect(ui).toContain("VENICE_CONNECT_TITLE");
    expect(ui).toContain("VENICE_SAVE_KEY");
    expect(ui).toContain("VENICE_DISCONNECT");
    expect(ui).toContain('type="password"');
    expect(ui).toContain("/api/admin/venice");
    expect(ui).not.toMatch(/venice-secret|resolveVeniceApiKey|encryptOperatorSecret|ciphertext/);
    expect(readRepo("app/admin/page.tsx")).toContain("ConnectVenice");
    expect(readRepo("app/api/admin/venice/route.ts")).toContain("requireAdmin");
    expect(readRepo("components/studio-chrome.tsx")).toContain('href="/admin"');
  });
});
