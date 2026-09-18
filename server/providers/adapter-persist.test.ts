import { afterEach, describe, expect, it, vi } from "vitest";
import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import {
  fetchAdapterArtifact,
  persistAdapterPointer,
  planAdapterPersist,
} from "@/server/providers/adapter-persist";

const baseInput = {
  packUserId: "user-1",
  packId: "pack-1",
  providerJobId: "rp_train_1",
};

describe("planAdapterPersist", () => {
  it("writes stub adapter bytes so Lock has a pointer", () => {
    const plan = planAdapterPersist({
      ...baseInput,
      result: {
        provider: "stub",
        adapterStorageKey: "adapters/stub/pack-1.lora",
        adapterMimeType: "application/octet-stream",
        adapterBytesBase64: null,
        adapterMeta: { stub: true },
      },
    });
    expect(plan.action).toBe("write-bytes");
    if (plan.action === "write-bytes") {
      expect(plan.storageKey).toBe("adapters/stub/pack-1.lora");
      expect(plan.body.toString("utf8")).toBe("stub-lora-adapter");
      expect(plan.meta).toMatchObject({
        stub: true,
        adapterSource: "stub",
        adapterId: "rp_train_1",
        provider: "stub",
      });
    }
  });

  it("writes live-shaped base64 LoRA bytes into owned storage", () => {
    const plan = planAdapterPersist({
      ...baseInput,
      result: {
        provider: "runpod",
        adapterStorageKey: null,
        adapterMimeType: "application/octet-stream",
        adapterBytesBase64: Buffer.from("lora-bytes").toString("base64"),
        adapterMeta: { filename: "pack.safetensors" },
      },
    });
    expect(plan.action).toBe("write-bytes");
    if (plan.action === "write-bytes") {
      expect(plan.storageKey).toBe("adapters/user-1/pack-1.lora");
      expect(plan.body.toString("utf8")).toBe("lora-bytes");
    }
  });

  it("keeps an existing object-storage key from the worker", () => {
    const plan = planAdapterPersist({
      ...baseInput,
      result: {
        provider: "runpod",
        adapterStorageKey: "adapters/runpod/pack-1.safetensors",
        adapterMimeType: "application/octet-stream",
        adapterBytesBase64: null,
        adapterMeta: null,
      },
    });
    expect(plan).toMatchObject({
      action: "keep-external-key",
      storageKey: "adapters/runpod/pack-1.safetensors",
    });
  });

  it("fetches a sourceUrl from live-shaped RunPod output", () => {
    const plan = planAdapterPersist({
      ...baseInput,
      result: {
        provider: "runpod",
        adapterStorageKey: null,
        adapterMimeType: "application/octet-stream",
        adapterBytesBase64: null,
        adapterMeta: { sourceUrl: "https://example.invalid/pack.safetensors" },
      },
    });
    expect(plan).toMatchObject({
      action: "fetch-url",
      sourceUrl: "https://example.invalid/pack.safetensors",
      storageKey: "adapters/user-1/pack-1.lora",
    });
  });

  it("fails closed when train succeeded with no adapter pointer", () => {
    const plan = planAdapterPersist({
      ...baseInput,
      result: {
        provider: "runpod",
        adapterStorageKey: null,
        adapterMimeType: null,
        adapterBytesBase64: null,
        adapterMeta: { runpodStatus: "COMPLETED" },
      },
    });
    expect(plan).toEqual({
      action: "fail",
      errorCode: JOB_ERROR_CODES.TRAIN_NO_ADAPTER,
      message: "Train pack finished without a LoRA / adapter pointer",
    });
  });
});

describe("persistAdapterPointer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws TRAIN_NO_ADAPTER instead of locking with an empty pointer", async () => {
    await expect(
      persistAdapterPointer({
        ...baseInput,
        result: {
          provider: "runpod",
          adapterStorageKey: null,
          adapterMimeType: null,
          adapterBytesBase64: null,
          adapterMeta: null,
        },
      }),
    ).rejects.toMatchObject({ code: JOB_ERROR_CODES.TRAIN_NO_ADAPTER });
  });

  it("fetches adapter bytes from a live-shaped sourceUrl", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(Buffer.from("fetched-lora"), {
          status: 200,
          headers: { "content-type": "application/octet-stream" },
        });
      }),
    );

    const artifact = await persistAdapterPointer({
      ...baseInput,
      packId: `pack-fetch-${Date.now()}`,
      result: {
        provider: "runpod",
        adapterStorageKey: null,
        adapterMimeType: "application/octet-stream",
        adapterBytesBase64: null,
        adapterMeta: { sourceUrl: "https://example.invalid/pack.safetensors" },
      },
    });
    expect(artifact.storageKey).toMatch(/^adapters\/user-1\/pack-fetch-/);
    expect(artifact.adapterPath).toBe(artifact.storageKey);
    expect(artifact.adapterStatus).toBe("ready");
    expect(artifact.adapterSource).toBe("live");
    expect(artifact.adapterId).toBe("rp_train_1");
    expect(artifact.meta.sourceUrl).toBe("https://example.invalid/pack.safetensors");
    expect(artifact.meta.adapterId).toBe("rp_train_1");
    expect(artifact.meta.adapterSource).toBe("live");
    expect(JSON.stringify(artifact.meta)).not.toMatch(/prompt|Bearer|at /i);
  });

  it("persists stub and live pointers with the same identity fields", async () => {
    const stub = await persistAdapterPointer({
      ...baseInput,
      packId: `pack-stub-${Date.now()}`,
      providerJobId: "stub-train-pack-1",
      result: {
        provider: "stub",
        adapterStorageKey: `adapters/stub/pack-stub.lora`,
        adapterMimeType: "application/octet-stream",
        adapterBytesBase64: null,
        adapterMeta: { stub: true },
      },
    });
    const live = await persistAdapterPointer({
      ...baseInput,
      packId: `pack-live-${Date.now()}`,
      result: {
        provider: "runpod",
        adapterStorageKey: "adapters/runpod/pack-live.safetensors",
        adapterMimeType: "application/octet-stream",
        adapterBytesBase64: null,
        adapterMeta: { runpodStatus: "COMPLETED" },
      },
    });
    expect(Object.keys(stub).sort()).toEqual(Object.keys(live).sort());
    expect(stub.adapterStatus).toBe("ready");
    expect(live.adapterStatus).toBe("ready");
    expect(stub.adapterSource).toBe("stub");
    expect(live.adapterSource).toBe("live");
    expect(stub.adapterId).toBe("stub-train-pack-1");
    expect(live.adapterId).toBe("rp_train_1");
  });
});

describe("fetchAdapterArtifact", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks HTTP failures as retryable TRAIN_ADAPTER_FETCH_FAILED", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 503 })),
    );
    try {
      await fetchAdapterArtifact("https://example.invalid/pack.safetensors");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(JobError);
      expect((err as JobError).code).toBe(JOB_ERROR_CODES.TRAIN_ADAPTER_FETCH_FAILED);
      expect((err as JobError).retryable).toBe(true);
    }
  });
});
