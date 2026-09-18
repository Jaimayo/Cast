import workflowPlaceholder from "@/server/providers/comfy/train-pack-workflow.json";
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

type RunPodRunResponse = {
  id?: string;
  status?: string;
};

async function runpodPost(endpointId: string, input: Record<string, unknown>): Promise<RunPodRunResponse> {
  const env = getEnv().runpod;
  if (!env.apiKey) {
    throw new ProviderNotConfiguredError("runpod");
  }

  const response = await fetch(`${env.baseUrl.replace(/\/$/, "")}/${endpointId}/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    throw new Error(`RunPod request failed with HTTP ${response.status}`);
  }

  return (await response.json()) as RunPodRunResponse;
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
    return {
      provider: "runpod",
      providerJobId: result.id ?? input.jobId,
      status: "queued",
    };
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
      width: input.width ?? 1024,
      height: input.height ?? 1024,
    });

    return {
      provider: "runpod",
      providerJobId: result.id ?? input.jobId,
      mimeType: "image/webp",
      // TODO(Build): poll RunPod /status and fetch output image bytes.
      imageBytes: Buffer.from("runpod-pending"),
    };
  },
};
