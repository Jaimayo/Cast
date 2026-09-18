import { describe, expect, it } from "vitest";
import { MEDIA_PRESIGN_TTL_SECONDS } from "@/lib/constants";
import {
  canAccessMedia,
  clampPresignTtlSeconds,
  isPreviewExpired,
  mediaPreviewPath,
  mediaPreviewRefreshPath,
  previewExpiresAt,
  publicJob,
  publicMediaAsset,
  publicPack,
} from "@/lib/media";

describe("media preview paths", () => {
  it("builds an authenticated same-origin preview path", () => {
    expect(mediaPreviewPath("asset-1")).toBe("/api/media/asset-1");
  });

  it("rejects ids that look like storage keys or traversal", () => {
    expect(() => mediaPreviewPath("../secret")).toThrow(/Invalid media id/);
    expect(() => mediaPreviewPath("still/user/id.webp")).toThrow(/Invalid media id/);
    expect(() => mediaPreviewPath("")).toThrow(/Invalid media id/);
  });

  it("refreshes expired previews through the same-origin route, not a bucket URL", () => {
    const path = mediaPreviewRefreshPath("asset-1", 1_700_000_000_000);
    expect(path).toBe("/api/media/asset-1?r=1700000000000");
    expect(path).not.toMatch(/s3|r2|amazonaws|storage/i);
  });
});

describe("signed URL expiry helpers", () => {
  it("documents a short presign TTL and never lengthens it", () => {
    expect(MEDIA_PRESIGN_TTL_SECONDS).toBe(120);
    expect(clampPresignTtlSeconds()).toBe(120);
    expect(clampPresignTtlSeconds(30)).toBe(30);
    expect(clampPresignTtlSeconds(3600)).toBe(120);
    expect(clampPresignTtlSeconds(0)).toBe(120);
    expect(clampPresignTtlSeconds(-5)).toBe(120);
  });

  it("treats a preview as expired at the TTL boundary", () => {
    const now = Date.parse("2026-09-18T08:00:00.000Z");
    const expires = previewExpiresAt(now, 120);
    expect(expires.toISOString()).toBe("2026-09-18T08:02:00.000Z");
    expect(isPreviewExpired(expires, now)).toBe(false);
    expect(isPreviewExpired(expires, now + 120_000)).toBe(true);
  });
});

describe("media authorization", () => {
  it("allows the asset owner", () => {
    expect(
      canAccessMedia({ viewerId: "user-a", assetUserId: "user-a" }),
    ).toBe(true);
  });

  it("allows pack or job owners even if the asset row is on another user id", () => {
    expect(
      canAccessMedia({
        viewerId: "owner",
        assetUserId: "other",
        packOwnerId: "owner",
      }),
    ).toBe(true);
    expect(
      canAccessMedia({
        viewerId: "owner",
        assetUserId: "other",
        jobOwnerId: "owner",
      }),
    ).toBe(true);
  });

  it("denies strangers and empty viewers", () => {
    expect(
      canAccessMedia({
        viewerId: "stranger",
        assetUserId: "owner",
        packOwnerId: "owner",
        jobOwnerId: "owner",
      }),
    ).toBe(false);
    expect(canAccessMedia({ viewerId: "", assetUserId: "" })).toBe(false);
  });
});

describe("public preview DTOs", () => {
  it("strips bucket keys from packs, jobs, and media sent to the client", () => {
    const pack = publicPack({
      id: "pack-1",
      name: "Mara",
      status: "locked",
      adapterStorageKey: "adapters/u1/pack-1.lora",
      adapterMimeType: "application/octet-stream",
      adapterMeta: { sourceUrl: "https://bucket.example/adapters/u1/pack-1.lora" },
      providerJobId: "rp-1",
    });
    expect(pack).toMatchObject({
      id: "pack-1",
      name: "Mara",
      status: "locked",
      hasAdapter: true,
      adapterStatus: "ready",
      adapterSource: "live",
    });
    expect("adapterId" in pack).toBe(false);
    expect("adapterStorageKey" in pack).toBe(false);
    expect(JSON.stringify(pack)).not.toMatch(/adapters|bucket\.example|lora|rp-1/i);

    const job = publicJob({
      id: "job-1",
      kind: "generate_still",
      status: "succeeded",
      resultAssetKey: "still/u1/job-1.webp",
      previewUrl: mediaPreviewPath("asset-1"),
    });
    expect(job.previewUrl).toBe("/api/media/asset-1");
    expect(job.ageSeconds).toBe(0);
    expect(job.attemptCount).toBe(0);
    expect(job.lastErrorCode).toBeNull();
    expect(job.lastError).toBeNull();
    expect(JSON.stringify(job)).not.toMatch(/still\/u1|resultAssetKey/);
    expect("attemptsMade" in job).toBe(false);

    const media = publicMediaAsset({
      id: "asset-1",
      kind: "still",
      storageKey: "still/u1/asset-1.webp",
    });
    expect(media).toMatchObject({
      id: "asset-1",
      kind: "still",
      previewUrl: "/api/media/asset-1",
      previewExpiresInSeconds: MEDIA_PRESIGN_TTL_SECONDS,
    });
    expect(JSON.stringify(media)).not.toMatch(/still\/u1|storageKey/);
  });
});

describe("job observability DTO", () => {
  const now = new Date("2026-09-18T09:10:00.000Z");

  it("exposes ageSeconds from createdAt, attemptCount, and user-safe lastError aliases", () => {
    const job = publicJob(
      {
        id: "job-fail",
        kind: "generate_still",
        status: "failed",
        createdAt: new Date("2026-09-18T09:08:30.000Z"),
        attemptsMade: 3,
        errorCode: "NETWORK_ERROR",
        errorMessage: "Network error talking to the image service. Try again.",
        resultAssetKey: "still/u1/secret.webp",
        previewUrl: null,
      },
      { now },
    );
    expect(job).toMatchObject({
      id: "job-fail",
      status: "failed",
      ageSeconds: 90,
      attemptCount: 3,
      lastErrorCode: "NETWORK_ERROR",
      lastError: "Network error talking to the image service. Try again.",
      errorCode: "NETWORK_ERROR",
      errorMessage: "Network error talking to the image service. Try again.",
      previewUrl: null,
    });
    expect(JSON.stringify(job)).not.toMatch(/still\/u1|resultAssetKey|attemptsMade/);
  });

  it("uses catalog copy when a failed job has a code but no message", () => {
    const job = publicJob(
      {
        id: "job-old",
        kind: "train_pack",
        status: "failed",
        createdAt: "2026-09-18T08:10:00.000Z",
        errorCode: "TRAIN_POLL_TIMEOUT",
        errorMessage: null,
      },
      { now },
    );
    expect(job.ageSeconds).toBe(3600);
    expect(job.attemptCount).toBe(0);
    expect(job.lastErrorCode).toBe("TRAIN_POLL_TIMEOUT");
    expect(job.lastError).toBe("Training took too long. You can try Train & lock again.");
  });

  it("does not leak stacks or prompts through lastError", () => {
    const job = publicJob({
      id: "job-raw",
      kind: "generate_still",
      status: "failed",
      errorCode: "GENERATE_STILL_FAILED",
      errorMessage: "Venice explode\n    at generateStill (workers/generateStill.ts:12)\ncompiled prompt: secret pose",
      resultAssetKey: "still/u1/x.webp",
    });
    expect(job.lastError).toBe("Still generation failed. Try again from Create.");
    expect(job.lastError).not.toMatch(/compiled prompt|at generateStill|secret pose/);
    expect(JSON.stringify(job)).not.toMatch(/still\/u1/);
  });
});
