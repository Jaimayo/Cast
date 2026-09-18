import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MEDIA_PRESIGN_TTL_SECONDS, TRAIN_REF_PRESIGN_TTL_SECONDS } from "@/lib/constants";
import { clampPresignTtlSeconds } from "@/lib/media";
import { getEnv } from "@/server/env";

export type StoredObject = {
  key: string;
  byteSize: number;
  mimeType: string;
};

/** Re-export so storage callers document the same TTL as `/api/media`. */
export { MEDIA_PRESIGN_TTL_SECONDS };

export class ObjectNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("Media not found");
    this.name = "ObjectNotFoundError";
  }
}

function localRoot(): string {
  return path.resolve(process.cwd(), ".data", "storage");
}

export function isS3Configured(): boolean {
  const s3 = getEnv().s3;
  return Boolean(s3.endpoint && s3.accessKeyId && s3.secretAccessKey);
}

export function assertSafeStorageKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) {
    throw new Error("Invalid storage key");
  }
  if (trimmed.endsWith("/") || trimmed.endsWith("\\")) {
    throw new Error("Invalid storage key");
  }
  if (
    trimmed.includes("\0") ||
    trimmed.includes("..") ||
    trimmed.startsWith("/") ||
    trimmed.includes("\\") ||
    trimmed.split("/").some((part) => !part)
  ) {
    throw new Error("Invalid storage key");
  }
  return trimmed;
}

function localPathForKey(key: string): string {
  const safe = assertSafeStorageKey(key);
  const root = localRoot();
  const full = path.resolve(root, safe);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (full !== root && !full.startsWith(prefix)) {
    throw new Error("Invalid storage key");
  }
  return full;
}

function client(): S3Client {
  const s3 = getEnv().s3;
  return new S3Client({
    region: s3.region,
    endpoint: s3.endpoint,
    credentials: {
      accessKeyId: s3.accessKeyId ?? "",
      secretAccessKey: s3.secretAccessKey ?? "",
    },
    forcePathStyle: s3.forcePathStyle,
  });
}

function isMissingObjectError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false;
  }
  const anyErr = err as { name?: string; Code?: string; code?: string; $metadata?: { httpStatusCode?: number } };
  if (anyErr.name === "NoSuchKey" || anyErr.name === "NotFound" || anyErr.Code === "NoSuchKey") {
    return true;
  }
  if (anyErr.code === "ENOENT" || anyErr.code === "EISDIR" || anyErr.code === "ENOTDIR") {
    return true;
  }
  if (anyErr.$metadata?.httpStatusCode === 404) {
    return true;
  }
  return err instanceof ObjectNotFoundError;
}

export async function putObject(input: {
  key: string;
  body: Buffer;
  mimeType: string;
}): Promise<StoredObject> {
  const key = assertSafeStorageKey(input.key);
  if (isS3Configured()) {
    const s3 = getEnv().s3;
    await client().send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: key,
        Body: input.body,
        ContentType: input.mimeType,
      }),
    );
    return { key, byteSize: input.body.byteLength, mimeType: input.mimeType };
  }

  const full = localPathForKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, input.body);
  return { key, byteSize: input.body.byteLength, mimeType: input.mimeType };
}

export async function readObject(key: string): Promise<Buffer> {
  const safe = assertSafeStorageKey(key);
  if (isS3Configured()) {
    try {
      const s3 = getEnv().s3;
      const out = await client().send(
        new GetObjectCommand({
          Bucket: s3.bucket,
          Key: safe,
        }),
      );
      const bytes = await out.Body?.transformToByteArray();
      if (!bytes) {
        throw new ObjectNotFoundError();
      }
      return Buffer.from(bytes);
    } catch (err) {
      if (err instanceof ObjectNotFoundError || isMissingObjectError(err)) {
        throw new ObjectNotFoundError();
      }
      throw new ObjectNotFoundError();
    }
  }

  try {
    const full = localPathForKey(safe);
    const info = await stat(full);
    if (info.isDirectory()) {
      throw new ObjectNotFoundError();
    }
    return await readFile(full);
  } catch (err) {
    if (err instanceof ObjectNotFoundError || isMissingObjectError(err)) {
      throw new ObjectNotFoundError();
    }
    throw new ObjectNotFoundError();
  }
}

/**
 * Time-limited R2/S3 GET (`MEDIA_PRESIGN_TTL_SECONDS`, default 120s, never longer).
 * Local storage has no bucket — callers must use `/api/media/:id` (auth-gated, same-origin).
 * Do not persist the returned URL or send the object key to the browser.
 */
export async function presignGetUrl(key: string, expiresInSeconds?: number): Promise<string> {
  return signedGetUrl(key, clampPresignTtlSeconds(expiresInSeconds));
}

/**
 * Server-to-server GET for RunPod trainPack refs. Caps at TRAIN_REF_PRESIGN_TTL_SECONDS.
 * Do not use for browser `<img>` — studio previews stay on `/api/media/:id` (120s).
 */
export async function presignGetUrlForTrain(key: string, expiresInSeconds: number): Promise<string> {
  const ttl = Math.min(Math.max(1, Math.floor(expiresInSeconds)), TRAIN_REF_PRESIGN_TTL_SECONDS);
  return signedGetUrl(key, ttl);
}

async function signedGetUrl(key: string, expiresIn: number): Promise<string> {
  const safe = assertSafeStorageKey(key);
  if (!isS3Configured()) {
    throw new Error("S3 is not configured");
  }
  const s3 = getEnv().s3;
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: s3.bucket,
      Key: safe,
    }),
    { expiresIn },
  );
}

export function mediaKey(parts: { kind: string; userId: string; id: string; ext?: string }): string {
  const ext = parts.ext ?? "webp";
  return `${parts.kind}/${parts.userId}/${parts.id}.${ext}`;
}
