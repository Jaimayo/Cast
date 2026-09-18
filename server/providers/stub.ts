import {
  type GenerateStillAdapter,
  type GenerateStillInput,
  type GenerateStillResult,
  type TrainPackAdapter,
  type TrainPackInput,
  type TrainPackResult,
} from "@/server/providers/types";

const PLACEHOLDER_WEBP = Buffer.from(
  "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=",
  "base64",
);

export const stubGenerateAdapter: GenerateStillAdapter = {
  name: "stub",
  async generateStill(input: GenerateStillInput): Promise<GenerateStillResult> {
    return {
      provider: "stub",
      providerJobId: `stub-${input.jobId}`,
      mimeType: "image/webp",
      imageBytes: PLACEHOLDER_WEBP,
    };
  },
};

export const stubTrainAdapter: TrainPackAdapter = {
  name: "stub",
  async trainPack(input: TrainPackInput): Promise<TrainPackResult> {
    return {
      provider: "stub",
      providerJobId: `stub-train-${input.characterPackId}`,
      status: "succeeded",
      adapterStorageKey: `adapters/stub/${input.characterPackId}.lora`,
      adapterMimeType: "application/octet-stream",
      adapterMeta: { stub: true },
    };
  },
};
