import workflowPlaceholder from "@/server/providers/comfy/train-pack-workflow.json";
import { getEnv } from "@/server/env";
import {
  extractAdapterPointer,
  mapRunPodJobStatus,
  publicAdapterMeta,
} from "@/server/providers/train-status";
import {
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

  const response = await fetch(`${env.baseUrl.replace(/\/$/, "")}/${endpointId}/run`, {
    method: "POST",
    headers: runpodHeaders(env.apiKey),
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    throw new Error(`RunPod request failed with HTTP ${response.status}`);
  }

  return (await response.json()) as RunPodRunResponse;
}

async function runpodStatus(endpointId: string, providerJobId: string): Promise<RunPodRunResponse> {
  const env = getEnv().runpod;
  if (!env.apiKey) {
    throw new ProviderNotConfiguredError("runpod");
  }

  const response = await fetch(
    `${env.baseUrl.replace(/\/$/, "")}/${endpointId}/status/${encodeURIComponent(providerJobId)}`,
    {
      method: "GET",
      headers: runpodHeaders(env.apiKey),
    },
  );

  if (!response.ok) {
    throw new Error(`RunPod status failed with HTTP ${response.status}`);
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
    errorCode: status === "failed" ? payload.error ?? "TRAIN_PACK_FAILED" : null,
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

/** generateStill fallback when Venice is unavailable. */
export const runpodGenerateAdapter: GenerateStillAdapter = {
  name: "runpod",
  async generateStill(input: GenerateStillInput): Promise<GenerateStillResult> {
    const env = getEnv().runpod;
    if (!env.apiKey || !env.generateEndpointId) {
      throw new ProviderNotConfiguredError("runpod");
    }

    const result = await runpodPost(env.generateEndpointId, {
      jobId: input.jobId,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      characterPackId: input.characterPackId,
      adapterStorageKey: input.adapterStorageKey ?? null,
      width: input.width ?? 1024,
      height: input.height ?? 1024,
    });

    return {
      provider: "runpod",
      providerJobId: result.id ?? input.jobId,
      mimeType: "image/webp",
      // TODO(Build): poll RunPod /status and fetch output image bytes for generate fallback.
      imageBytes: Buffer.from("runpod-pending"),
    };
  },
};
