import { getEnv } from "@/server/env";
import { runpodGenerateAdapter, runpodTrainAdapter } from "@/server/providers/runpod";
import { sisterGenerateAdapter, sisterTrainAdapter } from "@/server/providers/sister";
import { stubGenerateAdapter, stubTrainAdapter } from "@/server/providers/stub";
import {
  ProviderCapabilityError,
  type GenerateStillAdapter,
  type TrainPackAdapter,
} from "@/server/providers/types";
import { veniceAdapter } from "@/server/providers/venice";

export const providerRegistry = {
  generateStill: {
    venice: veniceAdapter,
    runpod: runpodGenerateAdapter,
    sister: sisterGenerateAdapter,
    stub: stubGenerateAdapter,
  },
  trainPack: {
    runpod: runpodTrainAdapter,
    sister: sisterTrainAdapter,
    stub: stubTrainAdapter,
  },
} as const;

export function getGenerateStillAdapter(): GenerateStillAdapter {
  const env = getEnv();
  if (env.providerMode === "stub") {
    return providerRegistry.generateStill.stub;
  }

  const name = env.generateStillProvider;
  if (name === "venice") return providerRegistry.generateStill.venice;
  if (name === "runpod") return providerRegistry.generateStill.runpod;
  if (name === "sister") return providerRegistry.generateStill.sister;
  throw new ProviderCapabilityError(`Unknown GENERATE_STILL_PROVIDER: ${name}`);
}

export function getTrainPackAdapter(): TrainPackAdapter {
  const env = getEnv();
  if (env.providerMode === "stub") {
    return providerRegistry.trainPack.stub;
  }

  const name = env.trainPackProvider;
  if (name === "venice") {
    throw new ProviderCapabilityError(
      "Venice has no Soul-ID / train API. Route trainPack to RunPod+Comfy (or the sister adapter).",
    );
  }
  if (name === "runpod") return providerRegistry.trainPack.runpod;
  if (name === "sister") return providerRegistry.trainPack.sister;
  throw new ProviderCapabilityError(`Unknown TRAIN_PACK_PROVIDER: ${name}`);
}

export function generateStillFallbackAdapter(): GenerateStillAdapter | null {
  const env = getEnv();
  if (env.providerMode === "stub") {
    return null;
  }
  if (env.generateStillProvider === "venice") {
    return providerRegistry.generateStill.runpod;
  }
  return null;
}
