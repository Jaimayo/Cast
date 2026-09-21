/**
 * Connect Venice copy and public (non-secret) helpers.
 * Safe to import from client components — never holds the API key.
 */

export const VENICE_CONNECT_TITLE = "Venice";
export const VENICE_STATUS_CONNECTED = "Connected";
export const VENICE_STATUS_DISCONNECTED = "Not connected";
export const VENICE_FIELD_LABEL = "API key";
export const VENICE_FIELD_PLACEHOLDER = "Paste your API key";
export const VENICE_SAVE = "Save";
export const VENICE_DISCONNECT = "Disconnect";
export const VENICE_KEEP_CONNECTED = "Keep connected";
export const VENICE_API_SETTINGS_URL = "https://venice.ai/settings/api";
export const VENICE_CONNECT_HELP =
  "Create a key at venice.ai/settings/api. Cast uses it only for still generation.";
export const VENICE_EMPTY = "Enter an API key to connect.";
export const VENICE_INVALID_KEY =
  "That API key didn’t work. Check it at venice.ai/settings/api and try again.";
export const VENICE_NETWORK_ERROR = "Couldn’t reach Venice. Try again in a moment.";
export const VENICE_SAVE_SUCCESS = "Venice connected.";
export const VENICE_DISCONNECT_CONFIRM_TITLE = "Disconnect Venice?";
export const VENICE_DISCONNECT_CONFIRM_BODY = "Still generation pauses until you reconnect.";
export const VENICE_DISCONNECT_SUCCESS = "Venice disconnected.";
export const VENICE_CONNECTED_PLACEHOLDER = "••••••••";
/** Studio Settings surface — every signed-in (attested) user. */
export const VENICE_SETTINGS_PATH = "/app/settings";
export const VENICE_SETTINGS_API = "/api/settings/venice";

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
