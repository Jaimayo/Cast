import { afterEach, describe, expect, it, vi } from "vitest";
import { getTrainPackAdapter } from "@/server/providers/registry";
import { ProviderCapabilityError } from "@/server/providers/types";

describe("getTrainPackAdapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stays on stub when PROVIDER_MODE=stub", () => {
    vi.stubEnv("PROVIDER_MODE", "stub");
    vi.stubEnv("TRAIN_PACK_PROVIDER", "runpod");
    expect(getTrainPackAdapter().name).toBe("stub");
  });

  it("routes live trainPack to RunPod, never Venice", () => {
    vi.stubEnv("PROVIDER_MODE", "live");
    vi.stubEnv("TRAIN_PACK_PROVIDER", "runpod");
    expect(getTrainPackAdapter().name).toBe("runpod");

    vi.stubEnv("TRAIN_PACK_PROVIDER", "venice");
    expect(() => getTrainPackAdapter()).toThrow(ProviderCapabilityError);
    expect(() => getTrainPackAdapter()).toThrow(/no Soul-ID \/ train API/);
  });
});
