import { describe, expect, it } from "vitest";
import { MEDIA_PRESIGN_TTL_SECONDS, TRAIN_REF_PRESIGN_TTL_SECONDS } from "@/lib/constants";
import { clampPresignTtlSeconds } from "@/lib/media";
import { clampTrainRefPresignTtlSeconds, planTrainReferences } from "@/server/providers/train-refs";

describe("planTrainReferences", () => {
  it("keeps object keys only in stub or local-disk mode", async () => {
    const keys = ["still/u1/a.webp", "still/u1/b.webp"];
    await expect(
      planTrainReferences({
        referenceKeys: keys,
        live: false,
        s3Configured: true,
        presign: async () => "https://should-not-run.example/x",
      }),
    ).resolves.toEqual({ referenceKeys: keys });

    await expect(
      planTrainReferences({
        referenceKeys: keys,
        live: true,
        s3Configured: false,
        presign: async () => "https://should-not-run.example/x",
      }),
    ).resolves.toEqual({ referenceKeys: keys });
  });

  it("attaches time-limited GET URLs for live RunPod when R2 is configured", async () => {
    const planned = await planTrainReferences({
      referenceKeys: ["still/u1/a.webp", "still/u1/b.webp"],
      live: true,
      s3Configured: true,
      presign: async (key, ttl) => `https://r2.example/${key}?ttl=${ttl}`,
    });
    expect(planned.referenceKeys).toEqual(["still/u1/a.webp", "still/u1/b.webp"]);
    expect(planned.referenceUrls).toEqual([
      "https://r2.example/still/u1/a.webp?ttl=3600",
      "https://r2.example/still/u1/b.webp?ttl=3600",
    ]);
    expect(TRAIN_REF_PRESIGN_TTL_SECONDS).toBe(3600);
    expect(TRAIN_REF_PRESIGN_TTL_SECONDS).toBeGreaterThan(MEDIA_PRESIGN_TTL_SECONDS);
  });

  it("rejects unsafe keys before presigning", async () => {
    await expect(
      planTrainReferences({
        referenceKeys: ["../secret"],
        live: true,
        s3Configured: true,
        presign: async () => "https://r2.example/x",
      }),
    ).rejects.toThrow(/Invalid storage key/);
  });
});

describe("train ref TTL vs studio preview TTL", () => {
  it("does not let train-ref TTL lengthen browser preview links", () => {
    expect(clampPresignTtlSeconds(TRAIN_REF_PRESIGN_TTL_SECONDS)).toBe(MEDIA_PRESIGN_TTL_SECONDS);
    expect(clampTrainRefPresignTtlSeconds(86_400)).toBe(TRAIN_REF_PRESIGN_TTL_SECONDS);
    expect(clampTrainRefPresignTtlSeconds(30)).toBe(30);
    expect(clampTrainRefPresignTtlSeconds()).toBe(TRAIN_REF_PRESIGN_TTL_SECONDS);
  });
});
