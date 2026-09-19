import { soulAdapterSourceUrl } from "@/lib/generate-route";
import { isRetryableHttpStatus, JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import workflowPlaceholder from "@/server/providers/comfy/train-pack-workflow.json";
import { getEnv } from "@/server/env";
import {
  extractGenerateImage,
  GENERATE_POLL_DELAY_MS,
  generateStillTimedOut,
  shouldKeepPollingGenerate,
  type GenerateImagePointer,
} from "@/server/providers/generate-output";
import {
  extractAdapterPointer,
  mapRunPodJobStatus,
  publicAdapterMeta,
  runPodTrainErrorCode,
} from "@/server/providers/train-status";
import { providerFetch } from "@/server/providers/http";
import {
  ProviderHttpError,
  ProviderNetworkError,
  ProviderNotConfiguredError,
  ProviderTimeoutError,
  type GenerateStillAdapter,
  type GenerateStillInput,
  type GenerateStillResult,
  type TrainPackAdapter,
  type TrainPackInput,
  type TrainPackResult,
} from "@/server/providers/types";

export const TRAIN_NOT_CONFIGURED_MESSAGE = "Training isn't configured on this server.";
export const TRAIN_BALANCE_MESSAGE = "The training service is out of credits. Try again after balance is restored.";
export const TRAIN_RATE_LIMIT_MESSAGE = "The training service is rate-limiting requests. Try again in a moment.";
export const TRAIN_HTTP_UNAVAILABLE_MESSAGE = "The training service is temporarily unavailable. Try again in a moment.";
export const TRAIN_HTTP_REJECT_MESSAGE = "The training service rejected this request.";
export const TRAIN_NETWORK_MESSAGE = "Network error talking to the training service. Try again.";

export function runpodTrainRunUrl(baseUrl: string, endpointId: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${endpointId}/run`;
}

export function runpodTrainStatusUrl(baseUrl: string, endpointId: string, providerJobId: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${endpointId}/status/${encodeURIComponent(providerJobId)}`;
}

/**
 * Body posted to RunPod `/run` for Soul ID trainPack.
 * Never attach Venice / generate fields (prompt, LoRA strength, API keys).
 */
export function buildRunPodTrainInput(input: TrainPackInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    jobId: input.jobId,
    characterPackId: input.characterPackId,
    name: input.name,
    referenceKeys: input.referenceKeys,
    workflow: workflowPlaceholder,
  };
  if (input.referenceUrls && input.referenceUrls.length > 0) {
    body.referenceUrls = input.referenceUrls;
  }
  return body;
}

/** Map RunPod HTTP status onto user-safe train JobErrors. Never echo vendor JSON. */
export function runpodTrainErrorFromHttp(status: number): JobError {
  if (status === 401 || status === 403) {
    return new JobError({
      code: JOB_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      userMessage: TRAIN_NOT_CONFIGURED_MESSAGE,
      retryable: false,
    });
  }
  if (status === 402) {
    return new JobError({
      code: JOB_ERROR_CODES.PROVIDER_INSUFFICIENT_BALANCE,
      userMessage: TRAIN_BALANCE_MESSAGE,
      retryable: false,
    });
  }
  if (status === 429) {
    return new JobError({
      code: JOB_ERROR_CODES.PROVIDER_RATE_LIMIT,
      userMessage: TRAIN_RATE_LIMIT_MESSAGE,
      retryable: true,
    });
  }
  if (isRetryableHttpStatus(status)) {
    return new JobError({
      code: JOB_ERROR_CODES.PROVIDER_HTTP_ERROR,
      userMessage: TRAIN_HTTP_UNAVAILABLE_MESSAGE,
      retryable: true,
    });
  }
  return new JobError({
    code: JOB_ERROR_CODES.PROVIDER_HTTP_ERROR,
    userMessage: TRAIN_HTTP_REJECT_MESSAGE,
    retryable: false,
  });
}

function requireRunPodTrain(): {
  apiKey: string;
  baseUrl: string;
  trainEndpointId: string;
  generateEndpointId?: string;
} {
  const env = getEnv().runpod;
  const apiKey = env.apiKey;
  const trainEndpointId = env.trainEndpointId;
  if (!apiKey || !trainEndpointId) {
    throw new JobError({
      code: JOB_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      userMessage: TRAIN_NOT_CONFIGURED_MESSAGE,
      retryable: false,
    });
  }
  return { ...env, apiKey, trainEndpointId };
}

function mapRunPodTrainCaught(err: unknown): never {
  if (err instanceof JobError) {
    throw err;
  }
  if (err instanceof ProviderNotConfiguredError) {
    throw new JobError({
      code: JOB_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      userMessage: TRAIN_NOT_CONFIGURED_MESSAGE,
      retryable: false,
    });
  }
  if (err instanceof ProviderTimeoutError) {
    throw new JobError({
      code: JOB_ERROR_CODES.TRAIN_PACK_TIMEOUT,
      retryable: false,
    });
  }
  if (err instanceof ProviderNetworkError) {
    throw new JobError({
      code: JOB_ERROR_CODES.NETWORK_ERROR,
      userMessage: TRAIN_NETWORK_MESSAGE,
      retryable: true,
    });
  }
  if (err instanceof ProviderHttpError) {
    throw runpodTrainErrorFromHttp(err.status);
  }
  throw err;
}

type RunPodRunResponse = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: string;
};

function runpodHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function runpodPost(endpointId: string, input: Record<string, unknown>): Promise<RunPodRunResponse> {
  const env = getEnv().runpod;
  if (!env.apiKey) {
    throw new ProviderNotConfiguredError("runpod");
  }

  const response = await providerFetch(`${env.baseUrl.replace(/\/$/, "")}/${endpointId}/run`, {
    method: "POST",
    headers: runpodHeaders(env.apiKey),
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    throw new ProviderHttpError("runpod", response.status);
  }

  return (await response.json()) as RunPodRunResponse;
}

async function runpodStatus(endpointId: string, providerJobId: string): Promise<RunPodRunResponse> {
  const env = getEnv().runpod;
  if (!env.apiKey) {
    throw new ProviderNotConfiguredError("runpod");
  }

  const response = await providerFetch(
    `${env.baseUrl.replace(/\/$/, "")}/${endpointId}/status/${encodeURIComponent(providerJobId)}`,
    {
      method: "GET",
      headers: runpodHeaders(env.apiKey),
    },
  );

  if (!response.ok) {
    throw new ProviderHttpError("runpod", response.status);
  }

  return (await response.json()) as RunPodRunResponse;
}

function toTrainResult(payload: RunPodRunResponse, fallbackJobId: string): TrainPackResult {
  const status = mapRunPodJobStatus(payload.status);
  const pointer = extractAdapterPointer(payload.output);
  const meta = publicAdapterMeta({
    runpodStatus: payload.status ?? null,
    ...(pointer?.storageKey ? { storageKey: pointer.storageKey } : {}),
    ...(pointer?.sourceUrl ? { sourceUrl: pointer.sourceUrl } : {}),
    ...(pointer?.filename ? { filename: pointer.filename } : {}),
  });

  return {
    provider: "runpod",
    providerJobId: payload.id ?? fallbackJobId,
    status,
    adapterStorageKey: pointer?.storageKey ?? null,
    adapterMimeType: pointer?.mimeType ?? (pointer ? "application/octet-stream" : null),
    adapterMeta: Object.keys(meta).length > 0 ? meta : null,
    adapterBytesBase64: pointer?.bytesBase64 ?? null,
    errorCode: runPodTrainErrorCode(payload.status, payload.error),
  };
}

export const runpodTrainAdapter: TrainPackAdapter = {
  name: "runpod",
  async trainPack(input: TrainPackInput): Promise<TrainPackResult> {
    const env = requireRunPodTrain();
    try {
      const result = await runpodPost(env.trainEndpointId, buildRunPodTrainInput(input));
      return toTrainResult(result, result.id ?? input.jobId);
    } catch (err) {
      mapRunPodTrainCaught(err);
    }
  },
  async getTrainStatus(providerJobId: string): Promise<TrainPackResult> {
    const env = requireRunPodTrain();
    try {
      const result = await runpodStatus(env.trainEndpointId, providerJobId);
      return toTrainResult(result, providerJobId);
    } catch (err) {
      mapRunPodTrainCaught(err);
    }
  },
};

async function waitForGenerateResult(
  endpointId: string,
  initial: RunPodRunResponse,
  fallbackJobId: string,
): Promise<RunPodRunResponse> {
  let payload = initial;
  let attempts = 0;
  const providerJobId = payload.id ?? fallbackJobId;
  while (shouldKeepPollingGenerate(payload.status)) {
    attempts += 1;
    if (generateStillTimedOut(attempts)) {
      throw new JobError({
        code: JOB_ERROR_CODES.GENERATE_TIMEOUT,
        retryable: false,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, GENERATE_POLL_DELAY_MS));
    payload = await runpodStatus(endpointId, providerJobId);
  }
  return payload;
}

async function imageBytesFromPointer(pointer: GenerateImagePointer): Promise<Buffer> {
  if (pointer.bytesBase64) {
    return Buffer.from(pointer.bytesBase64, "base64");
  }
  if (pointer.sourceUrl) {
    const response = await providerFetch(pointer.sourceUrl);
    if (!response.ok) {
      throw new ProviderHttpError("runpod", response.status);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  throw new JobError({
    code: JOB_ERROR_CODES.GENERATE_NO_IMAGE,
    retryable: false,
  });
}

/** generateStill fallback when Venice is unavailable, and Soul ID path when a LoRA pointer exists. */
export const runpodGenerateAdapter: GenerateStillAdapter = {
  name: "runpod",
  async generateStill(input: GenerateStillInput): Promise<GenerateStillResult> {
    const env = getEnv().runpod;
    if (!env.apiKey || !env.generateEndpointId) {
      throw new ProviderNotConfiguredError("runpod");
    }

    const posted = await runpodPost(env.generateEndpointId, {
      jobId: input.jobId,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      characterPackId: input.characterPackId,
      adapterStorageKey: input.adapterStorageKey ?? null,
      adapterSourceUrl: soulAdapterSourceUrl(input.adapterMeta),
      adapterMeta: input.adapterMeta ?? null,
      width: input.width ?? 1024,
      height: input.height ?? 1024,
      aspectRatio: input.aspectRatio,
    });

    const result = await waitForGenerateResult(env.generateEndpointId, posted, posted.id ?? input.jobId);
    const status = mapRunPodJobStatus(result.status);
    if (status === "failed") {
      throw new Error(result.error ?? "GENERATE_STILL_FAILED");
    }

    const pointer = extractGenerateImage(result.output);
    if (!pointer) {
      throw new JobError({
        code: JOB_ERROR_CODES.GENERATE_NO_IMAGE,
        retryable: false,
      });
    }

    return {
      provider: "runpod",
      providerJobId: result.id ?? input.jobId,
      mimeType: pointer.mimeType,
      imageBytes: await imageBytesFromPointer(pointer),
    };
  },
};
