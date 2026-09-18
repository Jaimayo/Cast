import { describe, expect, it } from "vitest";
import {
  generateStillJobProvider,
  hasSoulAdapter,
  resolveGenerateStillRoute,
  soulAdapterSourceUrl,
} from "@/lib/generate-route";

describe("generateStill Soul ID routing", () => {
  it("stays on stub when PROVIDER_MODE=stub, adapter or not", () => {
    expect(
      resolveGenerateStillRoute({
        providerMode: "stub",
        generateStillProvider: "venice",
        adapterStorageKey: null,
      }),
    ).toBe("stub");
    expect(
      resolveGenerateStillRoute({
        providerMode: "stub",
        generateStillProvider: "venice",
        adapterStorageKey: "adapters/u/p.lora",
      }),
    ).toBe("stub");
  });

  it("routes live generate through RunPod when a Soul ID adapter is stored", () => {
    expect(
      resolveGenerateStillRoute({
        providerMode: "live",
        generateStillProvider: "venice",
        adapterStorageKey: "adapters/u/p.lora",
      }),
    ).toBe("runpod");
  });

  it("keeps Venice as default live generateStill when there is no adapter", () => {
    expect(
      resolveGenerateStillRoute({
        providerMode: "live",
        generateStillProvider: "venice",
        adapterStorageKey: null,
      }),
    ).toBe("venice");
    expect(
      resolveGenerateStillRoute({
        providerMode: "live",
        generateStillProvider: "venice",
        adapterStorageKey: "  ",
      }),
    ).toBe("venice");
  });

  it("does not invent a Venice train/Soul route", () => {
    expect(hasSoulAdapter("adapters/u/p.lora")).toBe(true);
    expect(hasSoulAdapter(null)).toBe(false);
    expect(
      resolveGenerateStillRoute({
        providerMode: "live",
        generateStillProvider: "venice",
        adapterStorageKey: "adapters/u/p.lora",
      }),
    ).not.toBe("venice");
  });

  it("records RunPod on the job when stub stills will use a stored adapter", () => {
    expect(
      generateStillJobProvider({
        providerMode: "stub",
        generateStillProvider: "venice",
        adapterStorageKey: "adapters/u/p.lora",
      }),
    ).toBe("runpod");
    expect(
      generateStillJobProvider({
        providerMode: "stub",
        generateStillProvider: "venice",
        adapterStorageKey: null,
      }),
    ).toBe("venice");
  });

  it("reads adapter sourceUrl from trainPack meta", () => {
    expect(soulAdapterSourceUrl({ sourceUrl: "https://example.invalid/pack.safetensors" })).toBe(
      "https://example.invalid/pack.safetensors",
    );
    expect(soulAdapterSourceUrl({ provider: "runpod" })).toBeNull();
  });
});
