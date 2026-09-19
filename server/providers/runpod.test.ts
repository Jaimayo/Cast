import { afterEach, describe, expect, it, vi } from "vitest";
import { JOB_ERROR_CODES, JobError, classifyJobError } from "@/lib/job-errors";
import workflowPlaceholder from "@/server/providers/comfy/train-pack-workflow.json";
import {
  TRAIN_BALANCE_MESSAGE,
  TRAIN_HTTP_REJECT_MESSAGE,
  TRAIN_NOT_CONFIGURED_MESSAGE,
  TRAIN_RATE_LIMIT_MESSAGE,
  buildRunPodTrainInput,
  runpodTrainAdapter,
  runpodTrainErrorFromHttp,
  runpodTrainRunUrl,
  runpodTrainStatusUrl,
} from "@/server/providers/runpod";

const trainInput = {
  jobId: "job-train-1",
  characterPackId: "pack-1",
  name: "Mara",
  referenceKeys: ["still/u1/a.webp", "still/u1/b.webp"],
  referenceUrls: [
    "https://r2.example/still/u1/a.webp?ttl=3600",
    "https://r2.example/still/u1/b.webp?ttl=3600",
  ],
  attempt: 1,
};

function jsonResponse(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}

describe("RunPod trainPack request mapping", () => {
  it("posts keys, optional signed URLs, and the Comfy placeholder — never Venice fields", () => {
    expect(runpodTrainRunUrl("https://api.runpod.ai/v2/", "train-ep")).toBe(
      "https://api.runpod.ai/v2/train-ep/run",
    );
    expect(runpodTrainStatusUrl("https://api.runpod.ai/v2", "train-ep", "rp/job 1")).toBe(
      "https://api.runpod.ai/v2/train-ep/status/rp%2Fjob%201",
    );

    const body = buildRunPodTrainInput(trainInput);
    expect(body.jobId).toBe("job-train-1");
    expect(body.characterPackId).toBe("pack-1");
    expect(body.name).toBe("Mara");
    expect(body.referenceKeys).toEqual(trainInput.referenceKeys);
    expect(body.referenceUrls).toEqual(trainInput.referenceUrls);
    expect(body.workflow).toEqual(workflowPlaceholder);
    expect(body).not.toHaveProperty("prompt");
    expect(body).not.toHaveProperty("negative_prompt");
    expect(body).not.toHaveProperty("adapterStorageKey");
    expect(JSON.stringify(body)).not.toMatch(/venice|lora_strength|Bearer|apiKey/i);
  });

  it("omits referenceUrls when stub/local did not mint any", () => {
    const body = buildRunPodTrainInput({
      ...trainInput,
      referenceUrls: undefined,
    });
    expect(body).not.toHaveProperty("referenceUrls");
    expect(body.referenceKeys).toEqual(trainInput.referenceKeys);
  });
});

describe("RunPod train HTTP error mapping", () => {
  it("maps 401/402/429 without echoing vendor payloads", () => {
    const unauthorized = runpodTrainErrorFromHttp(401);
    expect(unauthorized).toBeInstanceOf(JobError);
    expect(unauthorized.code).toBe(JOB_ERROR_CODES.PROVIDER_NOT_CONFIGURED);
    expect(unauthorized.userMessage).toBe(TRAIN_NOT_CONFIGURED_MESSAGE);

    const balance = runpodTrainErrorFromHttp(402);
    expect(balance.code).toBe(JOB_ERROR_CODES.PROVIDER_INSUFFICIENT_BALANCE);
    expect(balance.userMessage).toBe(TRAIN_BALANCE_MESSAGE);
    expect(balance.message).not.toMatch(/prompt|Bearer|runpod|traceback/i);

    const rate = runpodTrainErrorFromHttp(429);
    expect(rate.code).toBe(JOB_ERROR_CODES.PROVIDER_RATE_LIMIT);
    expect(rate.retryable).toBe(true);
    expect(rate.userMessage).toBe(TRAIN_RATE_LIMIT_MESSAGE);

    const reject = runpodTrainErrorFromHttp(400);
    expect(reject.code).toBe(JOB_ERROR_CODES.PROVIDER_HTTP_ERROR);
    expect(reject.retryable).toBe(false);
    expect(reject.userMessage).toBe(TRAIN_HTTP_REJECT_MESSAGE);
    expect(classifyJobError(reject).userMessage).not.toMatch(/Bearer|at /);
  });
});

describe("RunPod trainPack adapter (mocked HTTP)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubRunPodTrainEnv() {
    vi.stubEnv("RUNPOD_API_KEY", "test-runpod-key");
    vi.stubEnv("RUNPOD_API_BASE_URL", "https://api.runpod.ai/v2");
    vi.stubEnv("RUNPOD_TRAIN_ENDPOINT_ID", "train-endpoint-1");
  }

  it("throws a user-safe not-configured error when keys are missing", async () => {
    vi.stubEnv("RUNPOD_API_KEY", "");
    vi.stubEnv("RUNPOD_TRAIN_ENDPOINT_ID", "");
    await expect(runpodTrainAdapter.trainPack(trainInput)).rejects.toMatchObject({
      code: JOB_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      userMessage: TRAIN_NOT_CONFIGURED_MESSAGE,
    });
    const classified = classifyJobError(
      await runpodTrainAdapter.trainPack(trainInput).catch((err: unknown) => err),
    );
    expect(classified.userMessage).toBe(TRAIN_NOT_CONFIGURED_MESSAGE);
    expect(classified.userMessage).not.toMatch(/runpod|Bearer|endpoint/i);
  });

  it("POSTs /run with refs and returns a queued provider job id", async () => {
    stubRunPodTrainEnv();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "rp-train-99",
        status: "IN_QUEUE",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await runpodTrainAdapter.trainPack(trainInput);
    expect(result.provider).toBe("runpod");
    expect(result.providerJobId).toBe("rp-train-99");
    expect(result.status).toBe("queued");
    expect(result.adapterStorageKey).toBeNull();
    expect(result.errorCode).toBeNull();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.runpod.ai/v2/train-endpoint-1/run");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-runpod-key");
    const posted = JSON.parse(String(init.body)) as { input: Record<string, unknown> };
    expect(posted.input.referenceKeys).toEqual(trainInput.referenceKeys);
    expect(posted.input.referenceUrls).toEqual(trainInput.referenceUrls);
    expect(posted.input.workflow).toEqual(workflowPlaceholder);
    expect(JSON.stringify(posted)).not.toMatch(/prompt|venice|test-runpod-key/);
  });

  it("polls /status and persists live-shaped adapter pointers without vendor dumps", async () => {
    stubRunPodTrainEnv();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "rp-train-99",
        status: "COMPLETED",
        output: {
          output: { lora_url: "https://example.invalid/pack.safetensors" },
        },
        error: "worker dumped prompt=secret pose Authorization: Bearer sk-live",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await runpodTrainAdapter.getTrainStatus("rp-train-99");
    expect(result.status).toBe("succeeded");
    expect(result.adapterMeta).toMatchObject({
      sourceUrl: "https://example.invalid/pack.safetensors",
    });
    expect(JSON.stringify(result.adapterMeta)).not.toMatch(/prompt|Bearer|sk-live|secret pose/);
    expect(result.errorCode).toBeNull();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://api.runpod.ai/v2/train-endpoint-1/status/rp-train-99");
  });

  it("maps failed / timed-out vendor status onto stored train codes", async () => {
    stubRunPodTrainEnv();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ id: "rp-fail", status: "FAILED" })));
    await expect(runpodTrainAdapter.getTrainStatus("rp-fail")).resolves.toMatchObject({
      status: "failed",
      errorCode: JOB_ERROR_CODES.TRAIN_PACK_FAILED,
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ id: "rp-to", status: "TIMED_OUT" })));
    await expect(runpodTrainAdapter.getTrainStatus("rp-to")).resolves.toMatchObject({
      status: "failed",
      errorCode: JOB_ERROR_CODES.TRAIN_PACK_TIMEOUT,
    });
  });

  it("returns user-safe 402, 429, timeout, and reject errors", async () => {
    stubRunPodTrainEnv();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ error: "top up at runpod prompt=secret pose Authorization: Bearer sk" }, { status: 402 }),
      ),
    );
    await expect(runpodTrainAdapter.trainPack(trainInput)).rejects.toMatchObject({
      code: JOB_ERROR_CODES.PROVIDER_INSUFFICIENT_BALANCE,
      userMessage: TRAIN_BALANCE_MESSAGE,
      retryable: false,
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "slow down" }, { status: 429 })));
    await expect(runpodTrainAdapter.trainPack(trainInput)).rejects.toMatchObject({
      code: JOB_ERROR_CODES.PROVIDER_RATE_LIMIT,
      retryable: true,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "bad workflow dump" }, { status: 400 })),
    );
    try {
      await runpodTrainAdapter.trainPack(trainInput);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(JobError);
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toBe(TRAIN_HTTP_REJECT_MESSAGE);
      expect(message).not.toMatch(/workflow dump|prompt|Bearer/);
      expect(classifyJobError(err).userMessage).not.toMatch(/\n {4}at /);
    }

    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));
    await expect(runpodTrainAdapter.trainPack(trainInput)).rejects.toMatchObject({
      code: JOB_ERROR_CODES.TRAIN_PACK_TIMEOUT,
      retryable: false,
    });
    expect(
      classifyJobError(await runpodTrainAdapter.trainPack(trainInput).catch((err: unknown) => err)).userMessage,
    ).toBe("The training service timed out. You can try Train & lock again.");
  });
});
