export type GenerateStillInput = {
  jobId: string;
  prompt: string;
  negativePrompt: string;
  width?: number;
  height?: number;
  seed?: number;
  /** 1-based BullMQ attempt. Stub scenarios use this for retry-then-succeed. */
  attempt?: number;
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
  /** Short-lived R2 GET URLs when live storage is configured. Stub/local omit this. */
  referenceUrls?: string[];
  /** 1-based BullMQ attempt. Stub scenarios use this for retry-then-succeed. */
  attempt?: number;
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

export class ProviderHttpError extends Error {
  readonly code = "PROVIDER_HTTP_ERROR";
  constructor(
    readonly provider: string,
    readonly status: number,
  ) {
    super(`${provider} failed with HTTP ${status}`);
    this.name = "ProviderHttpError";
  }
}

export class ProviderTimeoutError extends Error {
  readonly code = "PROVIDER_TIMEOUT";
  constructor(message = "Provider request timed out") {
    super(message);
    this.name = "ProviderTimeoutError";
  }
}

export class ProviderNetworkError extends Error {
  readonly code = "NETWORK_ERROR";
  constructor(cause?: unknown) {
    super(cause instanceof Error ? cause.message : "Provider network error");
    this.name = "ProviderNetworkError";
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}
