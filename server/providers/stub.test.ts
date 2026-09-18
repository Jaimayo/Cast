import { afterEach, describe, expect, it, vi } from "vitest";
import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import { stubGenerateAdapter, stubTrainAdapter } from "@/server/providers/stub";

const generateInput = {
  jobId: "job-1",
  prompt: "compiled prompt must never leak",
  negativePrompt: "neg",
  attempt: 1,
};

const trainInput = {
  jobId: "job-train-1",
  characterPackId: "pack-1",
  name: "Mara",
  referenceKeys: ["ref/a.webp"],
  attempt: 1,
};

describe("stub adapters honor STUB_JOB_SCENARIO", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("succeeds by default without calling vendors", async () => {
    const still = await stubGenerateAdapter.generateStill(generateInput);
    expect(still.provider).toBe("stub");
    expect(still.imageBytes.byteLength).toBeGreaterThan(0);
    const train = await stubTrainAdapter.trainPack(trainInput);
    expect(train.status).toBe("succeeded");
    expect(train.adapterStorageKey).toMatch(/adapters\/stub/);
  });

  it("fails Generate with a user-safe timeout code", async () => {
    vi.stubEnv("STUB_JOB_SCENARIO", "timeout-generate");
    try {
      await stubGenerateAdapter.generateStill(generateInput);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(JobError);
      expect((err as JobError).code).toBe(JOB_ERROR_CODES.GENERATE_TIMEOUT);
      expect((err as JobError).retryable).toBe(false);
      expect((err as JobError).userMessage).not.toMatch(/compiled prompt|neg/);
    }
  });

  it("retries then succeeds Generate on attempt 3", async () => {
    vi.stubEnv("STUB_JOB_SCENARIO", "retry-then-succeed");
    await expect(stubGenerateAdapter.generateStill({ ...generateInput, attempt: 1 })).rejects.toMatchObject({
      code: JOB_ERROR_CODES.NETWORK_ERROR,
      retryable: true,
    });
    const still = await stubGenerateAdapter.generateStill({ ...generateInput, attempt: 3 });
    expect(still.provider).toBe("stub");
  });

  it("fails Train closed and omits the adapter for no-adapter", async () => {
    vi.stubEnv("STUB_JOB_SCENARIO", "fail-train");
    await expect(stubTrainAdapter.trainPack(trainInput)).rejects.toMatchObject({
      code: JOB_ERROR_CODES.TRAIN_PACK_FAILED,
      retryable: false,
    });
    vi.stubEnv("STUB_JOB_SCENARIO", "no-adapter");
    const result = await stubTrainAdapter.trainPack(trainInput);
    expect(result.status).toBe("succeeded");
    expect(result.adapterStorageKey).toBeNull();
    expect(result.adapterMeta).toMatchObject({ omitAdapter: true });
  });
});
