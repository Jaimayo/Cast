import { resolveGenerateStillRoute } from "@/lib/generate-route";
import { getEnv } from "@/server/env";
import { runpodGenerateAdapter, runpodTrainAdapter } from "@/server/providers/runpod";
import { sisterGenerateAdapter, sisterTrainAdapter } from "@/server/providers/sister";
import { stubGenerateAdapter, stubTrainAdapter } from "@/server/providers/stub";
import {
  ProviderCapabilityError,
  ProviderNotConfiguredError,
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
  return getGenerateStillAdapterForPack({ adapterStorageKey: null });
}

/** Venice default; RunPod when the pack has a ready Soul ID adapter. Stub stays stub. */
export function getGenerateStillAdapterForPack(pack: {
  adapterStorageKey?: string | null;
  adapterStatus?: string | null;
  adapterId?: string | null;
}): GenerateStillAdapter {
  const env = getEnv();
  const route = resolveGenerateStillRoute({
    providerMode: env.providerMode,
    generateStillProvider: env.generateStillProvider,
    adapterStorageKey: pack.adapterStorageKey,
    adapterStatus: pack.adapterStatus,
    adapterId: pack.adapterId,
  });
  if (route === "stub") return providerRegistry.generateStill.stub;
  if (route === "runpod") return providerRegistry.generateStill.runpod;
  if (route === "sister") return providerRegistry.generateStill.sister;
  if (route === "venice") return providerRegistry.generateStill.venice;
  throw new ProviderCapabilityError(`Unknown generateStill route: ${route}`);
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

/**
 * Only when Venice is unset (missing API key). Balance, policy, rate-limit,
 * and timeout stay on Venice — do not silently send the still to RunPod.
 */
export function shouldFallbackGenerateStill(adapterName: string, err: unknown): boolean {
  return adapterName === "venice" && err instanceof ProviderNotConfiguredError;
}
