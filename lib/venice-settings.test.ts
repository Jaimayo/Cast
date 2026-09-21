import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AGE_ATTEST_COPY } from "@/lib/age-attest";
import {
  VENICE_API_SETTINGS_URL,
  VENICE_CONNECT_HELP,
  VENICE_CONNECT_TITLE,
  VENICE_DISCONNECT,
  VENICE_DISCONNECT_CONFIRM_BODY,
  VENICE_DISCONNECT_CONFIRM_TITLE,
  VENICE_DISCONNECT_SUCCESS,
  VENICE_EMPTY,
  VENICE_FIELD_LABEL,
  VENICE_FIELD_PLACEHOLDER,
  VENICE_INVALID_KEY,
  VENICE_KEEP_CONNECTED,
  VENICE_NETWORK_ERROR,
  VENICE_SAVE,
  VENICE_SAVE_SUCCESS,
  VENICE_SETTINGS_API,
  VENICE_SETTINGS_PATH,
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
  it("locks Branding-canonical labels and errors", () => {
    expect(VENICE_CONNECT_TITLE).toBe("Venice");
    expect(VENICE_STATUS_CONNECTED).toBe("Connected");
    expect(VENICE_STATUS_DISCONNECTED).toBe("Not connected");
    expect(VENICE_FIELD_LABEL).toBe("API key");
    expect(VENICE_FIELD_PLACEHOLDER).toBe("Paste your API key");
    expect(VENICE_CONNECT_HELP).toBe(
      "Create a key at venice.ai/settings/api. Cast uses it only for still generation.",
    );
    expect(VENICE_SAVE).toBe("Save");
    expect(VENICE_DISCONNECT).toBe("Disconnect");
    expect(VENICE_KEEP_CONNECTED).toBe("Keep connected");
    expect(VENICE_EMPTY).toBe("Enter an API key to connect.");
    expect(VENICE_INVALID_KEY).toBe(
      "That API key didn’t work. Check it at venice.ai/settings/api and try again.",
    );
    expect(VENICE_NETWORK_ERROR).toBe("Couldn’t reach Venice. Try again in a moment.");
    expect(VENICE_SAVE_SUCCESS).toBe("Venice connected.");
    expect(VENICE_DISCONNECT_CONFIRM_TITLE).toBe("Disconnect Venice?");
    expect(VENICE_DISCONNECT_CONFIRM_BODY).toBe("Still generation pauses until you reconnect.");
    expect(VENICE_DISCONNECT_SUCCESS).toBe("Venice disconnected.");
    expect(VENICE_API_SETTINGS_URL).toBe("https://venice.ai/settings/api");
  });

  it("forbids OAuth / Login-with-Venice language", () => {
    const ui = [
      readRepo("components/connect-venice.tsx"),
      readRepo("lib/venice-settings.ts"),
      readRepo("app/app/settings/page.tsx"),
    ].join("\n");
    expect(ui).not.toMatch(/Login with Venice|Sign in with Venice|OAuth|Authorize|Sync account|Connect with browser/i);
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

  it("keeps Connect Venice UI client-safe on per-user Settings", () => {
    const ui = readRepo("components/connect-venice.tsx");
    expect(ui).toContain("VENICE_CONNECT_TITLE");
    expect(ui).toContain("VENICE_CONNECT_HELP");
    expect(ui).toContain("VENICE_SAVE");
    expect(ui).toContain("VENICE_DISCONNECT");
    expect(ui).toContain("VENICE_KEEP_CONNECTED");
    expect(ui).toContain("VENICE_DISCONNECT_CONFIRM_TITLE");
    expect(ui).toContain("VENICE_DISCONNECT_CONFIRM_BODY");
    expect(ui).toContain('type={showKey ? "text" : "password"}');
    expect(ui).toContain("disabled={!canSave}");
    expect(ui).toContain("VENICE_CONNECTED_PLACEHOLDER");
    expect(ui.indexOf('htmlFor="venice-api-key"')).toBeLessThan(ui.indexOf("venice-help"));
    expect(ui).toContain("VENICE_SETTINGS_API");
    expect(ui).not.toContain("/api/admin/venice");
    expect(ui).not.toMatch(/venice-secret|resolveVeniceApiKey|encryptOperatorSecret|ciphertext/);
    expect(VENICE_SETTINGS_PATH).toBe("/app/settings");
    expect(VENICE_SETTINGS_API).toBe("/api/settings/venice");
    expect(readRepo("app/app/settings/page.tsx")).toContain("ConnectVenicePanel");
    expect(readRepo("app/api/settings/venice/route.ts")).toContain("requireAttestedUser");
    expect(readRepo("app/api/settings/venice/route.ts")).not.toContain("requireAdmin");
    expect(readRepo("app/api/settings/venice/route.ts")).toContain("validateVeniceApiKey");
    expect(readRepo("app/api/settings/venice/route.ts")).not.toMatch(/image\/generate|generateStill/);
    expect(readRepo("app/admin/page.tsx")).not.toContain("ConnectVenicePanel");
    expect(readRepo("components/studio-chrome.tsx")).toContain('href="/app/settings"');
    expect(readRepo("components/studio-chrome.tsx")).toContain('href="/app/settings">Settings</a>');
    expect(readRepo("components/studio-chrome.tsx")).not.toContain("{props.admin ? <a href=\"/admin\">Settings</a> : null}");
    expect(readRepo("components/studio-chrome.tsx")).toContain("{props.admin ? <a href=\"/admin/invites\">Invites</a> : null}");
    expect(readRepo("next.config.ts")).toContain('source: "/studio/settings"');
    expect(readRepo("next.config.ts")).toContain('destination: "/app/settings"');
    expect(readRepo("workers/generateStill.ts")).toContain("userId: job.userId");
    expect(readRepo("server/providers/venice.ts")).toContain("resolveVeniceApiKey(input.userId)");
    expect(readRepo("db/schema.ts")).toContain("user_secrets");
    expect(readRepo("db/migrations/0011_user_secrets.sql")).toContain("user_secrets");
  });
});
