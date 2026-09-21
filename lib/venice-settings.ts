/**
 * Connect Venice copy and public (non-secret) helpers.
 * Safe to import from client components — never holds the API key.
 */

export const VENICE_CONNECT_TITLE = "Connect Venice";
export const VENICE_STATUS_CONNECTED = "Connected";
export const VENICE_STATUS_DISCONNECTED = "Not connected";
export const VENICE_SAVE_KEY = "Save key";
export const VENICE_DISCONNECT = "Disconnect";
export const VENICE_API_SETTINGS_URL = "https://venice.ai/settings/api";
export const VENICE_CONNECT_HELP =
  "Create an API key at venice.ai/settings/api. Cast stores it on the server — it never appears in the browser after you save.";

export const VENICE_KEY_MIN_LENGTH = 16;
export const VENICE_KEY_MAX_LENGTH = 512;

export type VeniceConnectionStatus = typeof VENICE_STATUS_CONNECTED | typeof VENICE_STATUS_DISCONNECTED;
export type VeniceSecretStorage = "settings" | "env" | "none";

export type VenicePublicStatus = {
  connected: boolean;
  status: VeniceConnectionStatus;
  /** Masked as ••••last4. Never the full key. */
  maskedKey: string | null;
  storage: VeniceSecretStorage;
  /** Live generateStill uses Venice when connected and PROVIDER_MODE=live. */
  generateStillUsesVenice: boolean;
  providerMode: "stub" | "live";
};

export function maskVeniceApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) {
    return "";
  }
  return `••••${trimmed.slice(-4)}`;
}

export function normalizeVeniceApiKey(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export function veniceStatusLabel(connected: boolean): VeniceConnectionStatus {
  return connected ? VENICE_STATUS_CONNECTED : VENICE_STATUS_DISCONNECTED;
}

export class VeniceConnectError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "VeniceConnectError";
    this.status = status;
  }
}
