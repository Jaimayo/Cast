import { describe, expect, it } from "vitest";
import { mediaPreviewPath } from "@/lib/media";
import {
  extractAdapterPointer,
  mapRunPodJobStatus,
  publicAdapterMeta,
  runPodTrainErrorCode,
  shouldContinuePolling,
  TRAIN_POLL_MAX_ATTEMPTS,
  trainPollDecision,
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
    const key = `still/train-status-test/${Date.now()}.webp`;
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
    expect(trainPollDecision({ status: "queued", attempt: 0 })).toEqual({ action: "poll", nextAttempt: 1 });
    expect(trainPollDecision({ status: "succeeded", attempt: 2 })).toEqual({ action: "persist" });
    expect(trainPollDecision({ status: "failed", attempt: 2 })).toEqual({
      action: "fail",
      errorCode: "TRAIN_PACK_FAILED",
    });
    expect(trainPollDecision({ status: "running", attempt: TRAIN_POLL_MAX_ATTEMPTS })).toEqual({
      action: "timeout",
      errorCode: "TRAIN_POLL_TIMEOUT",
    });
  });

  it("maps live RunPod failure strings onto stored error codes", () => {
    expect(runPodTrainErrorCode("COMPLETED")).toBeNull();
    expect(runPodTrainErrorCode("FAILED")).toBe("TRAIN_PACK_FAILED");
    expect(runPodTrainErrorCode("TIMED_OUT")).toBe("TRAIN_PACK_TIMEOUT");
    expect(runPodTrainErrorCode("CANCELLED")).toBe("TRAIN_PACK_CANCELED");
    expect(runPodTrainErrorCode("FAILED", "OOM_KILL")).toBe("OOM_KILL");
    expect(runPodTrainErrorCode("FAILED", "something exploded in the worker")).toBe("TRAIN_PACK_FAILED");
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

    expect(
      extractAdapterPointer({
        output: {
          artifacts: { adapterKey: "adapters/u/p.safetensors" },
        },
      }),
    ).toMatchObject({ storageKey: "adapters/u/p.safetensors" });

    expect(
      extractAdapterPointer({
        output: {
          output: { lora_url: "https://example.invalid/nested.safetensors" },
        },
      }),
    ).toMatchObject({ sourceUrl: "https://example.invalid/nested.safetensors" });

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
