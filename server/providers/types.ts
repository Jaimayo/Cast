export type GenerateStillInput = {
  jobId: string;
  prompt: string;
  negativePrompt: string;
  width?: number;
  height?: number;
  seed?: number;
  /** Opaque pack id for identity routing. Venice ignores this (no Soul ID). */
  characterPackId?: string;
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
  status: "queued" | "running" | "succeeded";
};

export interface GenerateStillAdapter {
  readonly name: "venice" | "runpod" | "sister" | "stub";
  generateStill(input: GenerateStillInput): Promise<GenerateStillResult>;
}

export interface TrainPackAdapter {
  readonly name: "runpod" | "sister" | "stub";
  trainPack(input: TrainPackInput): Promise<TrainPackResult>;
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
