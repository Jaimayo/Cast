import { getEnv } from "@/server/env";
import { extractAdapterPointer } from "@/server/providers/train-status";
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

/**
 * Reserved adapter slot for a future sister private-AI company.
 * Implements the same generateStill / trainPack seam. Not a Stage 1 default.
 */
function sisterHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function sisterFetch(path: string, body: unknown): Promise<Response> {
  const env = getEnv().sister;
  if (!env.apiKey || !env.baseUrl) {
    throw new ProviderNotConfiguredError("sister");
  }
  return providerFetch(`${env.baseUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: sisterHeaders(env.apiKey),
    body: JSON.stringify(body),
  });
}

async function sisterGet(path: string): Promise<Response> {
  const env = getEnv().sister;
  if (!env.apiKey || !env.baseUrl) {
    throw new ProviderNotConfiguredError("sister");
  }
  return providerFetch(`${env.baseUrl.replace(/\/$/, "")}${path}`, {
    method: "GET",
    headers: sisterHeaders(env.apiKey),
  });
}

export const sisterGenerateAdapter: GenerateStillAdapter = {
  name: "sister",
  async generateStill(input: GenerateStillInput): Promise<GenerateStillResult> {
    const response = await sisterFetch("/v1/stills/generate", {
      jobId: input.jobId,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      characterPackId: input.characterPackId,
    });
    if (!response.ok) {
      throw new ProviderHttpError("sister", response.status);
    }
    const payload = (await response.json()) as { id: string; image_base64: string };
    return {
      provider: "sister",
      providerJobId: payload.id,
      mimeType: "image/webp",
      imageBytes: Buffer.from(payload.image_base64, "base64"),
    };
  },
};

export const sisterTrainAdapter: TrainPackAdapter = {
  name: "sister",
  async trainPack(input: TrainPackInput): Promise<TrainPackResult> {
    const response = await sisterFetch("/v1/packs/train", {
      jobId: input.jobId,
      characterPackId: input.characterPackId,
      referenceKeys: input.referenceKeys,
      ...(input.referenceUrls && input.referenceUrls.length > 0 ? { referenceUrls: input.referenceUrls } : {}),
    });
    if (!response.ok) {
      throw new ProviderHttpError("sister", response.status);
    }
    const payload = (await response.json()) as { id: string; status?: string };
    return { provider: "sister", providerJobId: payload.id, status: "queued" };
  },
  async getTrainStatus(providerJobId: string): Promise<TrainPackResult> {
    const response = await sisterGet(`/v1/packs/train/${encodeURIComponent(providerJobId)}`);
    if (!response.ok) {
      throw new ProviderHttpError("sister", response.status);
    }
    const payload = (await response.json()) as {
      id?: string;
      status?: "queued" | "running" | "succeeded" | "failed";
      adapterStorageKey?: string;
      output?: unknown;
    };
    const pointer = extractAdapterPointer(payload.output ?? payload);
    const status = payload.status ?? "running";
    return {
      provider: "sister",
      providerJobId: payload.id ?? providerJobId,
      status,
      adapterStorageKey: pointer?.storageKey ?? payload.adapterStorageKey ?? null,
      adapterMimeType: pointer?.mimeType ?? (pointer || payload.adapterStorageKey ? "application/octet-stream" : null),
      adapterBytesBase64: pointer?.bytesBase64 ?? null,
      adapterMeta: pointer?.sourceUrl ? { sourceUrl: pointer.sourceUrl } : null,
    };
  },
};
