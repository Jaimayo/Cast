import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "@/server/env";

export type StoredObject = {
  key: string;
  byteSize: number;
  mimeType: string;
};

const PRESIGN_TTL_SECONDS = 120;

function localRoot(): string {
  return path.join(process.cwd(), ".data", "storage");
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
  if (
    trimmed.includes("\0") ||
    trimmed.includes("..") ||
    trimmed.startsWith("/") ||
    trimmed.includes("\\")
  ) {
    throw new Error("Invalid storage key");
  }
  return trimmed;
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

  const full = path.join(localRoot(), key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, input.body);
  return { key, byteSize: input.body.byteLength, mimeType: input.mimeType };
}

export async function readObject(key: string): Promise<Buffer> {
  const safe = assertSafeStorageKey(key);
  if (isS3Configured()) {
    const s3 = getEnv().s3;
    const out = await client().send(
      new GetObjectCommand({
        Bucket: s3.bucket,
        Key: safe,
      }),
    );
    const bytes = await out.Body?.transformToByteArray();
    if (!bytes) {
      throw new Error("Empty object");
    }
    return Buffer.from(bytes);
  }
  return readFile(path.join(localRoot(), safe));
}

/** Time-limited R2/S3 GET. Local storage has no bucket — callers should use `/api/media/:id` instead. */
export async function presignGetUrl(key: string, expiresInSeconds = PRESIGN_TTL_SECONDS): Promise<string> {
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
    { expiresIn: expiresInSeconds },
  );
}

export function mediaKey(parts: { kind: string; userId: string; id: string; ext?: string }): string {
  const ext = parts.ext ?? "webp";
  return `${parts.kind}/${parts.userId}/${parts.id}.${ext}`;
}
