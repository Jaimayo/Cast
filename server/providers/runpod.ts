import { soulAdapterSourceUrl } from "@/lib/generate-route";
import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
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
  ProviderNotConfiguredError,
  type GenerateStillAdapter,
  type GenerateStillInput,
  type GenerateStillResult,
  type TrainPackAdapter,
  type TrainPackInput,
  type TrainPackResult,
} from "@/server/providers/types";

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
    const env = getEnv().runpod;
    if (!env.apiKey || !env.trainEndpointId) {
      throw new ProviderNotConfiguredError("runpod");
    }

    const payload = {
      jobId: input.jobId,
      characterPackId: input.characterPackId,
      name: input.name,
      referenceKeys: input.referenceKeys,
      workflow: workflowPlaceholder,
    };

    const result = await runpodPost(env.trainEndpointId, payload);
    return toTrainResult(result, result.id ?? input.jobId);
  },
  async getTrainStatus(providerJobId: string): Promise<TrainPackResult> {
    const env = getEnv().runpod;
    if (!env.apiKey || !env.trainEndpointId) {
      throw new ProviderNotConfiguredError("runpod");
    }
    const result = await runpodStatus(env.trainEndpointId, providerJobId);
    return toTrainResult(result, providerJobId);
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
