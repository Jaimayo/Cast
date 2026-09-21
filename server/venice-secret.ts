import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { userSecrets } from "@/db/schema";
import { isMemoryPreviewMode } from "@/lib/memory-preview";
import {
  VENICE_EMPTY,
  VENICE_INVALID_KEY,
  VENICE_KEY_MAX_LENGTH,
  VENICE_KEY_MIN_LENGTH,
  maskVeniceApiKey,
  normalizeVeniceApiKey,
  VeniceConnectError,
  veniceStatusLabel,
  type VenicePublicStatus,
  type VeniceSecretStorage,
} from "@/lib/venice-settings";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";

export { VeniceConnectError };

const ENCRYPTION_VERSION = 1;

type Overlay =
  | { kind: "key"; key: string; last4: string }
  | { kind: "disconnected" }
  | null;

const globalForSecrets = globalThis as unknown as {
  veniceUserOverlay?: Record<string, Overlay>;
};

function overlayMap(): Record<string, Overlay> {
  if (!globalForSecrets.veniceUserOverlay) {
    globalForSecrets.veniceUserOverlay = {};
  }
  return globalForSecrets.veniceUserOverlay;
}

function encryptionKey(secret: string, scope: string): Buffer {
  return createHash("sha256")
    .update(`cast.secret.v${ENCRYPTION_VERSION}:${scope}:${secret}`)
    .digest();
}

export function encryptSecret(
  plaintext: string,
  sessionSecret: string,
  scope = "operator",
): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(sessionSecret, scope), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(
  packed: { ciphertext: string; iv: string; authTag: string },
  sessionSecret: string,
  scope = "operator",
): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(sessionSecret, scope),
    Buffer.from(packed.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(packed.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(packed.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** @deprecated Use encryptSecret. Kept for round-trip tests. */
export function encryptOperatorSecret(plaintext: string, sessionSecret: string) {
  return encryptSecret(plaintext, sessionSecret, "operator");
}

/** @deprecated Use decryptSecret. Kept for round-trip tests. */
export function decryptOperatorSecret(
  packed: { ciphertext: string; iv: string; authTag: string },
  sessionSecret: string,
) {
  return decryptSecret(packed, sessionSecret, "operator");
}

function userSecretScope(userId: string): string {
  return `user:${userId}`;
}

function readOverlay(userId: string): Overlay {
  return overlayMap()[userId] ?? null;
}

function writeOverlay(userId: string, next: Overlay): void {
  const map = overlayMap();
  if (!next) {
    delete map[userId];
    return;
  }
  map[userId] = next;
}

export function resetVeniceSecretOverlayForTests(): void {
  globalForSecrets.veniceUserOverlay = {};
}

function envVeniceApiKey(): string | undefined {
  return getEnv().venice.apiKey;
}

function durableSecretsEnabled(): boolean {
  if (process.env.NODE_ENV === "test" && process.env.CAST_TEST_USER_SECRETS !== "1") {
    return false;
  }
  const env = getEnv();
  if (isMemoryPreviewMode({ providerMode: env.providerMode, databaseUrl: env.databaseUrl })) {
    return false;
  }
  return Boolean(env.databaseUrl);
}

async function readDurableOverlay(userId: string): Promise<Overlay> {
  if (!durableSecretsEnabled()) {
    return null;
  }
  try {
    const rows = await getDb()
      .select()
      .from(userSecrets)
      .where(eq(userSecrets.userId, userId))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    if (row.disabled) {
      return { kind: "disconnected" };
    }
    if (!row.ciphertext || !row.iv || !row.authTag) {
      return null;
    }
    const key = decryptSecret(
      { ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag },
      getEnv().sessionSecret,
      userSecretScope(userId),
    );
    return { kind: "key", key, last4: row.keyLast4 || key.slice(-4) };
  } catch {
    return null;
  }
}

async function writeDurableOverlay(userId: string, overlay: Overlay): Promise<void> {
  if (!durableSecretsEnabled()) {
    return;
  }
  const now = new Date();
  const values =
    overlay?.kind === "key"
      ? {
          userId,
          ...encryptSecret(overlay.key, getEnv().sessionSecret, userSecretScope(userId)),
          keyLast4: overlay.last4,
          disabled: false,
          updatedAt: now,
        }
      : {
          userId,
          ciphertext: null,
          iv: null,
          authTag: null,
          keyLast4: null,
          disabled: true,
          updatedAt: now,
        };

  await getDb()
    .insert(userSecrets)
    .values(values)
    .onConflictDoUpdate({
      target: userSecrets.userId,
      set: {
        ciphertext: values.ciphertext,
        iv: values.iv,
        authTag: values.authTag,
        keyLast4: values.keyLast4,
        disabled: values.disabled,
        updatedAt: values.updatedAt,
      },
    });
}

async function persistOverlay(userId: string, overlay: Overlay): Promise<void> {
  const previous = readOverlay(userId);
  writeOverlay(userId, overlay);
  try {
    await writeDurableOverlay(userId, overlay);
  } catch {
    writeOverlay(userId, previous);
    throw new VeniceConnectError("Could not update Venice settings.", 503);
  }
}

async function resolvedOverlay(userId: string): Promise<Overlay> {
  const memory = readOverlay(userId);
  if (memory) {
    return memory;
  }
  return readDurableOverlay(userId);
}

/**
 * Server-only. Never log the return value.
 * Prefers this user's Settings key. Disconnect opts that user out of env.
 * If the user has never saved, falls back to deploy `VENICE_API_KEY`.
 */
export async function resolveVeniceApiKey(userId?: string | null): Promise<string | undefined> {
  if (userId) {
    const overlay = await resolvedOverlay(userId);
    if (overlay?.kind === "disconnected") {
      return undefined;
    }
    if (overlay?.kind === "key") {
      return overlay.key;
    }
  }
  return envVeniceApiKey();
}

export function assertVeniceApiKeyShape(raw: unknown): string {
  const key = normalizeVeniceApiKey(raw);
  if (!key) {
    throw new VeniceConnectError(VENICE_EMPTY);
  }
  if (key.length < VENICE_KEY_MIN_LENGTH || key.length > VENICE_KEY_MAX_LENGTH) {
    throw new VeniceConnectError(VENICE_INVALID_KEY);
  }
  return key;
}

export async function saveVeniceApiKey(input: {
  apiKey: string;
  userId: string;
}): Promise<VenicePublicStatus> {
  const key = assertVeniceApiKeyShape(input.apiKey);
  const overlay: Overlay = { kind: "key", key, last4: key.slice(-4) };
  await persistOverlay(input.userId, overlay);
  return publicVeniceStatusFromUserKey(key);
}

export async function disconnectVeniceApiKey(userId: string): Promise<VenicePublicStatus> {
  await persistOverlay(userId, { kind: "disconnected" });
  return publicVeniceStatusFromUserKey(undefined);
}

function publicVeniceStatusFromUserKey(key: string | undefined): VenicePublicStatus {
  const env = getEnv();
  const connected = Boolean(key);
  const storage: VeniceSecretStorage = connected ? "settings" : "none";
  return {
    connected,
    status: veniceStatusLabel(connected),
    maskedKey: key ? maskVeniceApiKey(key) : null,
    storage,
    generateStillUsesVenice:
      connected && env.providerMode === "live" && env.generateStillProvider === "venice",
    providerMode: env.providerMode,
  };
}

/** Public status for this user only. Env keys never appear as Connected. */
export async function getVenicePublicStatus(userId: string): Promise<VenicePublicStatus> {
  const overlay = await resolvedOverlay(userId);
  if (overlay?.kind === "disconnected") {
    return publicVeniceStatusFromUserKey(undefined);
  }
  if (overlay?.kind === "key") {
    return publicVeniceStatusFromUserKey(overlay.key);
  }
  return publicVeniceStatusFromUserKey(undefined);
}
