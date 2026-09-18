import { getEnv } from "@/server/env";
import {
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
async function sisterFetch(path: string, body: unknown): Promise<Response> {
  const env = getEnv().sister;
  if (!env.apiKey || !env.baseUrl) {
    throw new ProviderNotConfiguredError("sister");
  }
  return fetch(`${env.baseUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
      throw new Error(`Sister generateStill failed with HTTP ${response.status}`);
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
    });
    if (!response.ok) {
      throw new Error(`Sister trainPack failed with HTTP ${response.status}`);
    }
    const payload = (await response.json()) as { id: string };
    return { provider: "sister", providerJobId: payload.id, status: "queued" };
  },
};
