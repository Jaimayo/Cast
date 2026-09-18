import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertSafeStorageKey,
  mediaKey,
  ObjectNotFoundError,
  presignGetUrl,
  putObject,
  readObject,
} from "@/server/storage";
import { MEDIA_PRESIGN_TTL_SECONDS } from "@/lib/constants";
import { clampPresignTtlSeconds } from "@/lib/media";

const tempKeys: string[] = [];

afterEach(async () => {
  for (const key of tempKeys.splice(0)) {
    const full = path.join(process.cwd(), ".data", "storage", key);
    await rm(path.dirname(full), { recursive: true, force: true });
  }
});

describe("storage keys", () => {
  it("builds kind/user/id keys", () => {
    expect(mediaKey({ kind: "still", userId: "u1", id: "j1" })).toBe("still/u1/j1.webp");
  });

  it("rejects path traversal, directories, and absolute keys", () => {
    expect(() => assertSafeStorageKey("../secret")).toThrow(/Invalid storage key/);
    expect(() => assertSafeStorageKey("/etc/passwd")).toThrow(/Invalid storage key/);
    expect(() => assertSafeStorageKey("still/u1/")).toThrow(/Invalid storage key/);
    expect(() => assertSafeStorageKey("still//u1.webp")).toThrow(/Invalid storage key/);
    expect(() => assertSafeStorageKey("ok/path.webp")).not.toThrow();
  });
});

describe("local storage fallback", () => {
  it("round-trips bytes when R2 is unset", async () => {
    const key = `still/test/${Date.now()}.webp`;
    tempKeys.push(key);
    const body = Buffer.from("cast-local-preview");
    await putObject({ key, body, mimeType: "image/webp" });
    const read = await readObject(key);
    expect(read.equals(body)).toBe(true);
  });

  it("does not list directories and hides missing paths", async () => {
    const dirKey = `still/test-dir/${Date.now()}`;
    const dirPath = path.join(process.cwd(), ".data", "storage", dirKey);
    await mkdir(dirPath, { recursive: true });
    tempKeys.push(`${dirKey}/placeholder.webp`);

    await expect(readObject(dirKey)).rejects.toBeInstanceOf(ObjectNotFoundError);
    await expect(readObject(`${dirKey}/missing.webp`)).rejects.toMatchObject({
      name: "ObjectNotFoundError",
      message: "Media not found",
      status: 404,
    });

    try {
      await readObject(`${dirKey}/missing.webp`);
    } catch (err) {
      expect(String(err)).not.toMatch(/\.data|storage|still\/test-dir/);
    }
  });
});

describe("presigned GET expiry", () => {
  it("does not mint an R2 URL when S3 is unset", async () => {
    await expect(presignGetUrl("still/test/x.webp")).rejects.toThrow(/S3 is not configured/);
  });

  it("clamps TTL so callers cannot mint a long-lived GET", () => {
    expect(clampPresignTtlSeconds(86_400)).toBe(MEDIA_PRESIGN_TTL_SECONDS);
    expect(MEDIA_PRESIGN_TTL_SECONDS).toBeLessThanOrEqual(120);
  });
});
