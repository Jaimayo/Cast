import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getEnv } from "@/server/env";

export type StoredObject = {
  key: string;
  byteSize: number;
  mimeType: string;
};

function localRoot(): string {
  return path.join(process.cwd(), ".data", "storage");
}

function s3Configured(): boolean {
  const s3 = getEnv().s3;
  return Boolean(s3.endpoint && s3.accessKeyId && s3.secretAccessKey);
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
  if (s3Configured()) {
    const s3 = getEnv().s3;
    await client().send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.mimeType,
      }),
    );
    return { key: input.key, byteSize: input.body.byteLength, mimeType: input.mimeType };
  }

  const full = path.join(localRoot(), input.key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, input.body);
  return { key: input.key, byteSize: input.body.byteLength, mimeType: input.mimeType };
}

export async function readObject(key: string): Promise<Buffer> {
  if (s3Configured()) {
    throw new Error("readObject via S3 is a Build TODO — use presigned GET");
  }
  return readFile(path.join(localRoot(), key));
}

export function mediaKey(parts: { kind: string; userId: string; id: string; ext?: string }): string {
  const ext = parts.ext ?? "webp";
  return `${parts.kind}/${parts.userId}/${parts.id}.${ext}`;
}
