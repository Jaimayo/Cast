import { describe, expect, it } from "vitest";
import { MEDIA_AUTH_ERRORS, MEDIA_PREVIEW_HEADERS, MEDIA_PRESIGN_TTL_SECONDS } from "@/lib/media";
import { mediaPreviewResponse, resolveMediaPreview } from "@/server/media";
import type { MediaAsset } from "@/db/schema";

const attested = {
  id: "user-a",
  ageAttestedAt: new Date("2026-09-18T00:00:00.000Z"),
};

const ownAsset = {
  id: "asset-1",
  userId: "user-a",
  kind: "still",
  storageKey: "still/user-a/asset-1.webp",
  mimeType: "image/webp",
  byteSize: 12,
  generationJobId: null,
  characterPackId: null,
  createdAt: new Date("2026-09-18T00:00:00.000Z"),
} as MediaAsset;

describe("resolveMediaPreview auth deny", () => {
  it("returns 401 without a session and never loads the object", async () => {
    let loaded = false;
    const result = await resolveMediaPreview(
      { sessionUserId: null, user: null, mediaId: "asset-1" },
      {
        loadAsset: async () => {
          loaded = true;
          return ownAsset;
        },
      },
    );
    expect(result).toEqual({
      kind: "error",
      status: 401,
      error: MEDIA_AUTH_ERRORS.signInRequired,
    });
    expect(loaded).toBe(false);
  });

  it("returns 403 when the session cookie is leftover after the user is gone", async () => {
    const result = await resolveMediaPreview(
      { sessionUserId: "user-a", user: null, mediaId: "asset-1" },
      { loadAsset: async () => ownAsset },
    );
    expect(result).toEqual({
      kind: "error",
      status: 403,
      error: MEDIA_AUTH_ERRORS.sessionRevoked,
    });
  });

  it("returns 403 before 18+ attestation", async () => {
    const result = await resolveMediaPreview(
      {
        sessionUserId: "user-a",
        user: { id: "user-a", ageAttestedAt: null },
        mediaId: "asset-1",
      },
      { loadAsset: async () => ownAsset },
    );
    expect(result).toEqual({
      kind: "error",
      status: 403,
      error: MEDIA_AUTH_ERRORS.ageRequired,
    });
  });

  it("returns 404 for another user's still without the storage key", async () => {
    const result = await resolveMediaPreview(
      {
        sessionUserId: "stranger",
        user: { id: "stranger", ageAttestedAt: attested.ageAttestedAt },
        mediaId: "asset-1",
      },
      { loadAsset: async () => null },
    );
    expect(result).toEqual({
      kind: "error",
      status: 404,
      error: MEDIA_AUTH_ERRORS.notFound,
    });
    expect(JSON.stringify(result)).not.toMatch(/still\/user-a|storageKey/);
  });
});

describe("resolveMediaPreview happy path", () => {
  it("streams local/stub bytes when R2 is unset", async () => {
    const body = Buffer.from("cast-stub-still");
    const result = await resolveMediaPreview(
      { sessionUserId: "user-a", user: attested, mediaId: "asset-1" },
      {
        loadAsset: async (userId, mediaId) => {
          expect(userId).toBe("user-a");
          expect(mediaId).toBe("asset-1");
          return ownAsset;
        },
        s3Configured: () => false,
        read: async (key) => {
          expect(key).toBe("still/user-a/asset-1.webp");
          return body;
        },
        presign: async () => {
          throw new Error("stub mode must not mint an R2 URL");
        },
      },
    );
    expect(result).toEqual({ kind: "bytes", body, mimeType: "image/webp" });
  });

  it("302s to a short-lived signed GET when R2 is configured", async () => {
    const signed = "https://r2.example/cast-media/still/user-a/asset-1.webp?X-Amz-Expires=120";
    const result = await resolveMediaPreview(
      { sessionUserId: "user-a", user: attested, mediaId: "asset-1" },
      {
        loadAsset: async () => ownAsset,
        s3Configured: () => true,
        presign: async (key) => {
          expect(key).toBe("still/user-a/asset-1.webp");
          return signed;
        },
        read: async () => {
          throw new Error("R2 path should presign, not stream");
        },
      },
    );
    expect(result).toEqual({ kind: "redirect", location: signed });
    expect(MEDIA_PRESIGN_TTL_SECONDS).toBe(120);
  });

  it("treats a thrown asset lookup as 404", async () => {
    const result = await resolveMediaPreview(
      { sessionUserId: "user-a", user: attested, mediaId: "not-a-uuid" },
      {
        loadAsset: async () => {
          throw new Error('invalid input syntax for type uuid: "not-a-uuid"');
        },
      },
    );
    expect(result).toEqual({
      kind: "error",
      status: 404,
      error: MEDIA_AUTH_ERRORS.notFound,
    });
    expect(JSON.stringify(result)).not.toMatch(/uuid|not-a-uuid/i);
  });

  it("hides missing local files as 404 without a filesystem path", async () => {
    const result = await resolveMediaPreview(
      { sessionUserId: "user-a", user: attested, mediaId: "asset-1" },
      {
        loadAsset: async () => ownAsset,
        s3Configured: () => false,
        read: async () => {
          throw Object.assign(new Error("ENOENT: open '/workspace/.data/storage/still/user-a/asset-1.webp'"), {
            code: "ENOENT",
          });
        },
      },
    );
    expect(result).toEqual({
      kind: "error",
      status: 404,
      error: MEDIA_AUTH_ERRORS.notFound,
    });
    expect(JSON.stringify(result)).not.toMatch(/\.data|storage|ENOENT/);
  });
});

describe("mediaPreviewResponse", () => {
  it("puts Cache-Control private, no-store on 401/403 and stub bytes", async () => {
    const denied = mediaPreviewResponse({
      kind: "error",
      status: 401,
      error: MEDIA_AUTH_ERRORS.signInRequired,
    });
    expect(denied.status).toBe(401);
    expect(denied.headers.get("Cache-Control")).toBe(MEDIA_PREVIEW_HEADERS["Cache-Control"]);
    expect(await denied.json()).toEqual({ error: MEDIA_AUTH_ERRORS.signInRequired });

    const revoked = mediaPreviewResponse({
      kind: "error",
      status: 403,
      error: MEDIA_AUTH_ERRORS.sessionRevoked,
    });
    expect(revoked.status).toBe(403);
    expect(revoked.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await revoked.json()).toEqual({ error: MEDIA_AUTH_ERRORS.sessionRevoked });

    const bytes = mediaPreviewResponse({
      kind: "bytes",
      body: Buffer.from("webp"),
      mimeType: "image/webp",
    });
    expect(bytes.status).toBe(200);
    expect(bytes.headers.get("Content-Type")).toBe("image/webp");
    expect(bytes.headers.get("Cache-Control")).toBe("private, no-store");
    expect(Buffer.from(await bytes.arrayBuffer()).toString()).toBe("webp");

    const redirect = mediaPreviewResponse({
      kind: "redirect",
      location: "https://r2.example/object?X-Amz-Expires=120",
    });
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toBe("https://r2.example/object?X-Amz-Expires=120");
    expect(redirect.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
