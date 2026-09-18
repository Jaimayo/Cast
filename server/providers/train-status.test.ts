import { describe, expect, it } from "vitest";
import { mediaPreviewPath } from "@/lib/media";
import {
  extractAdapterPointer,
  mapRunPodJobStatus,
  publicAdapterMeta,
  shouldContinuePolling,
  TRAIN_POLL_MAX_ATTEMPTS,
  trainPollDelayMs,
} from "@/server/providers/train-status";
import { assertSafeStorageKey, mediaKey, putObject, readObject, presignGetUrl } from "@/server/storage";

describe("media previews", () => {
  it("builds an authenticated same-origin preview path", () => {
    expect(mediaPreviewPath("asset-1")).toBe("/api/media/asset-1");
  });
});

describe("storage keys", () => {
  it("builds kind/user/id keys", () => {
    expect(mediaKey({ kind: "still", userId: "u1", id: "j1" })).toBe("still/u1/j1.webp");
  });

  it("rejects path traversal and absolute keys", () => {
    expect(() => assertSafeStorageKey("../secret")).toThrow(/Invalid storage key/);
    expect(() => assertSafeStorageKey("/etc/passwd")).toThrow(/Invalid storage key/);
    expect(() => assertSafeStorageKey("ok/path.webp")).not.toThrow();
  });

  it("round-trips bytes in local storage when R2 is unset", async () => {
    const key = `still/test/${Date.now()}.webp`;
    const body = Buffer.from("cast-local-preview");
    await putObject({ key, body, mimeType: "image/webp" });
    const read = await readObject(key);
    expect(read.equals(body)).toBe(true);
  });

  it("does not mint an R2 URL when S3 is unset", async () => {
    await expect(presignGetUrl("still/test/x.webp")).rejects.toThrow(/S3 is not configured/);
  });
});

describe("RunPod train status", () => {
  it("maps RunPod lifecycle strings", () => {
    expect(mapRunPodJobStatus("IN_QUEUE")).toBe("queued");
    expect(mapRunPodJobStatus("IN_PROGRESS")).toBe("running");
    expect(mapRunPodJobStatus("COMPLETED")).toBe("succeeded");
    expect(mapRunPodJobStatus("FAILED")).toBe("failed");
    expect(mapRunPodJobStatus("CANCELLED")).toBe("failed");
    expect(mapRunPodJobStatus("TIMED_OUT")).toBe("failed");
  });

  it("polls only while queued or running", () => {
    expect(shouldContinuePolling("queued")).toBe(true);
    expect(shouldContinuePolling("running")).toBe(true);
    expect(shouldContinuePolling("succeeded")).toBe(false);
    expect(shouldContinuePolling("failed")).toBe(false);
  });

  it("backs off poll delay and caps attempts", () => {
    expect(trainPollDelayMs(1)).toBe(5_000);
    expect(trainPollDelayMs(10)).toBe(15_000);
    expect(trainPollDelayMs(40)).toBe(30_000);
    expect(TRAIN_POLL_MAX_ATTEMPTS).toBeGreaterThan(20);
  });

  it("extracts adapter pointers from worker output", () => {
    expect(
      extractAdapterPointer({
        adapter_storage_key: "adapters/u/p.lora",
        mime_type: "application/octet-stream",
      }),
    ).toMatchObject({ storageKey: "adapters/u/p.lora" });

    expect(
      extractAdapterPointer({
        output: { loraUrl: "https://example.invalid/pack.safetensors" },
      }),
    ).toMatchObject({ sourceUrl: "https://example.invalid/pack.safetensors" });

    expect(
      extractAdapterPointer({
        lora: "https://example.invalid/pack.safetensors",
      }),
    ).toMatchObject({ sourceUrl: "https://example.invalid/pack.safetensors" });

    expect(extractAdapterPointer({ hello: "nope" })).toBeNull();
  });

  it("strips prompt/base64 fields from persisted adapter meta", () => {
    const meta = publicAdapterMeta({
      provider: "runpod",
      lora_base64: "AAAA",
      prompt: "secret",
      sourceUrl: "https://example.invalid/a",
    });
    expect(meta).toEqual({ provider: "runpod", sourceUrl: "https://example.invalid/a" });
  });
});
