export type GenerateStillInput = {
  jobId: string;
  prompt: string;
  negativePrompt: string;
  width?: number;
  height?: number;
  seed?: number;
  /** Opaque pack id for identity routing. Venice ignores this (no Soul ID). */
  characterPackId?: string;
  /** Trained LoRA / adapter object key when a Soul ID exists. Venice ignores this. */
  adapterStorageKey?: string | null;
  /** trainPack meta (e.g. sourceUrl). Venice ignores this. */
  adapterMeta?: Record<string, unknown> | null;
};

export type GenerateStillResult = {
  provider: "venice" | "runpod" | "sister" | "stub";
  providerJobId: string;
  mimeType: string;
  imageBytes: Buffer;
};

export type TrainPackInput = {
  jobId: string;
  characterPackId: string;
  name: string;
  referenceKeys: string[];
};

export type TrainPackResult = {
  provider: "runpod" | "sister" | "stub";
  providerJobId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  adapterStorageKey?: string | null;
  adapterMimeType?: string | null;
  adapterMeta?: Record<string, unknown> | null;
  adapterBytesBase64?: string | null;
  errorCode?: string | null;
};

export interface GenerateStillAdapter {
  readonly name: "venice" | "runpod" | "sister" | "stub";
  generateStill(input: GenerateStillInput): Promise<GenerateStillResult>;
}

export interface TrainPackAdapter {
  readonly name: "runpod" | "sister" | "stub";
  trainPack(input: TrainPackInput): Promise<TrainPackResult>;
  getTrainStatus?(providerJobId: string): Promise<TrainPackResult>;
}

export class ProviderNotConfiguredError extends Error {
  readonly code = "PROVIDER_NOT_CONFIGURED";
  constructor(provider: string) {
    super(`${provider} is not configured (missing API key or endpoint)`);
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderCapabilityError extends Error {
  readonly code = "PROVIDER_CAPABILITY";
  constructor(message: string) {
    super(message);
    this.name = "ProviderCapabilityError";
  }
}
