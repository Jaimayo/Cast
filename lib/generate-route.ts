/**
 * generateStill routing.
 *
 * Venice is default stills and has no Soul-ID / LoRA API.
 * When a Locked pack stores a ready trainPack adapter identity, stills go
 * through the RunPod generate fallback so identity can load.
 * PROVIDER_MODE=stub never leaves the stub adapter (no vendor keys).
 */

import { hasReadySoulAdapter } from "@/lib/adapter-identity";

export type GenerateStillRoute = "stub" | "venice" | "runpod" | "sister";

export type GenerateStillRouteInput = {
  providerMode: "stub" | "live";
  generateStillProvider: string;
  adapterStorageKey?: string | null;
  adapterStatus?: string | null;
  adapterId?: string | null;
};

export function hasSoulAdapter(
  adapterStorageKey?: string | null,
  adapterStatus?: string | null,
): boolean {
  return hasReadySoulAdapter({ adapterStorageKey, adapterStatus });
}

export function resolveGenerateStillRoute(input: GenerateStillRouteInput): GenerateStillRoute {
  if (input.providerMode === "stub") {
    return "stub";
  }
  if (
    hasReadySoulAdapter({
      adapterStorageKey: input.adapterStorageKey,
      adapterStatus: input.adapterStatus,
      adapterId: input.adapterId,
    })
  ) {
    return "runpod";
  }
  if (input.generateStillProvider === "runpod") return "runpod";
  if (input.generateStillProvider === "sister") return "sister";
  return "venice";
}

/**
 * `generation_jobs.provider` has no stub value. Record the live destination
 * so Jobs can show Venice vs RunPod (Soul ID) even in stub mode.
 */
export function generateStillJobProvider(
  input: GenerateStillRouteInput,
): "venice" | "runpod" | "sister" {
  const route = resolveGenerateStillRoute(input);
  if (route === "stub") {
    if (
      hasReadySoulAdapter({
        adapterStorageKey: input.adapterStorageKey,
        adapterStatus: input.adapterStatus,
        adapterId: input.adapterId,
      })
    ) {
      return "runpod";
    }
    if (input.generateStillProvider === "runpod") return "runpod";
    if (input.generateStillProvider === "sister") return "sister";
    return "venice";
  }
  return route;
}

export function soulAdapterSourceUrl(meta?: Record<string, unknown> | null): string | null {
  const value = meta?.sourceUrl;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
