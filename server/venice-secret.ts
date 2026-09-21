import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { operatorSecrets } from "@/db/schema";
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

export const VENICE_OPERATOR_SECRET_ID = "venice_api_key";

const ENCRYPTION_VERSION = 1;

type Overlay =
  | { kind: "key"; key: string; last4: string }
  | { kind: "disconnected" }
  | null;

const globalForSecrets = globalThis as unknown as {
  veniceOperatorOverlay?: Overlay;
};

function encryptionKey(secret: string): Buffer {
  return createHash("sha256").update(`cast.operator-secret.v${ENCRYPTION_VERSION}:${secret}`).digest();
}

export function encryptOperatorSecret(plaintext: string, sessionSecret: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(sessionSecret), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptOperatorSecret(
  packed: { ciphertext: string; iv: string; authTag: string },
  sessionSecret: string,
): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(sessionSecret),
    Buffer.from(packed.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(packed.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(packed.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function readOverlay(): Overlay {
  return globalForSecrets.veniceOperatorOverlay ?? null;
}

function writeOverlay(next: Overlay): void {
  globalForSecrets.veniceOperatorOverlay = next;
}

export function resetVeniceSecretOverlayForTests(): void {
  globalForSecrets.veniceOperatorOverlay = null;
}

function envVeniceApiKey(): string | undefined {
  return getEnv().venice.apiKey;
}

function durableSecretsEnabled(): boolean {
  if (process.env.NODE_ENV === "test" && process.env.CAST_TEST_OPERATOR_SECRETS !== "1") {
    return false;
  }
  const env = getEnv();
  if (isMemoryPreviewMode({ providerMode: env.providerMode, databaseUrl: env.databaseUrl })) {
    return false;
  }
  return Boolean(env.databaseUrl);
}

async function readDurableOverlay(): Promise<Overlay> {
  if (!durableSecretsEnabled()) {
    return null;
  }
  try {
    const rows = await getDb()
      .select()
      .from(operatorSecrets)
      .where(eq(operatorSecrets.id, VENICE_OPERATOR_SECRET_ID))
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
    const key = decryptOperatorSecret(
      { ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag },
      getEnv().sessionSecret,
    );
    return { kind: "key", key, last4: row.keyLast4 || key.slice(-4) };
  } catch {
    return null;
  }
}

async function writeDurableOverlay(overlay: Overlay, actorId: string | null): Promise<void> {
  if (!durableSecretsEnabled()) {
    return;
  }
  const now = new Date();
  const values =
    overlay?.kind === "key"
      ? {
          id: VENICE_OPERATOR_SECRET_ID,
          ...encryptOperatorSecret(overlay.key, getEnv().sessionSecret),
          keyLast4: overlay.last4,
          disabled: false,
          updatedAt: now,
          updatedByUserId: actorId,
        }
      : {
          id: VENICE_OPERATOR_SECRET_ID,
          ciphertext: null,
          iv: null,
          authTag: null,
          keyLast4: null,
          disabled: true,
          updatedAt: now,
          updatedByUserId: actorId,
        };

  await getDb()
    .insert(operatorSecrets)
    .values(values)
    .onConflictDoUpdate({
      target: operatorSecrets.id,
      set: {
        ciphertext: values.ciphertext,
        iv: values.iv,
        authTag: values.authTag,
        keyLast4: values.keyLast4,
        disabled: values.disabled,
        updatedAt: values.updatedAt,
        updatedByUserId: values.updatedByUserId,
      },
    });
}

async function persistOverlay(overlay: Overlay, actorId: string | null): Promise<void> {
  const previous = readOverlay();
  writeOverlay(overlay);
  try {
    await writeDurableOverlay(overlay, actorId);
  } catch {
    writeOverlay(previous);
    throw new VeniceConnectError("Could not update Venice settings.", 503);
  }
}

async function resolvedOverlay(): Promise<Overlay> {
  const memory = readOverlay();
  if (memory) {
    return memory;
  }
  return readDurableOverlay();
}

/** Server-only. Never log the return value. */
export async function resolveVeniceApiKey(): Promise<string | undefined> {
  const overlay = await resolvedOverlay();
  if (overlay?.kind === "disconnected") {
    return undefined;
  }
  if (overlay?.kind === "key") {
    return overlay.key;
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
  actorId: string | null;
}): Promise<VenicePublicStatus> {
  const key = assertVeniceApiKeyShape(input.apiKey);
  const overlay: Overlay = { kind: "key", key, last4: key.slice(-4) };
  await persistOverlay(overlay, input.actorId);
  return publicVeniceStatusFromResolved(key, "settings");
}

export async function disconnectVeniceApiKey(actorId: string | null): Promise<VenicePublicStatus> {
  await persistOverlay({ kind: "disconnected" }, actorId);
  return publicVeniceStatusFromResolved(undefined, "none");
}

function publicVeniceStatusFromResolved(
  key: string | undefined,
  storage: VeniceSecretStorage,
): VenicePublicStatus {
  const env = getEnv();
  const connected = Boolean(key);
  return {
    connected,
    status: veniceStatusLabel(connected),
    maskedKey: key ? maskVeniceApiKey(key) : null,
    storage: connected ? storage : "none",
    generateStillUsesVenice:
      connected && env.providerMode === "live" && env.generateStillProvider === "venice",
    providerMode: env.providerMode,
  };
}

export async function getVenicePublicStatus(): Promise<VenicePublicStatus> {
  const overlay = await resolvedOverlay();
  if (overlay?.kind === "disconnected") {
    return publicVeniceStatusFromResolved(undefined, "none");
  }
  if (overlay?.kind === "key") {
    return publicVeniceStatusFromResolved(overlay.key, "settings");
  }
  const envKey = envVeniceApiKey();
  return publicVeniceStatusFromResolved(envKey, envKey ? "env" : "none");
}
