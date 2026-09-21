import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import { stillAspectFromUnknown } from "@/lib/still-aspect";
import { VeniceConnectError } from "@/lib/venice-settings";
import { getEnv } from "@/server/env";
import { providerFetch } from "@/server/providers/http";
import {
  ProviderHttpError,
  ProviderNotConfiguredError,
  type GenerateStillAdapter,
  type GenerateStillInput,
  type GenerateStillResult,
} from "@/server/providers/types";
import { resolveVeniceApiKey } from "@/server/venice-secret";

/**
 * Default Stage 1 still model.
 *
 * `lustify-v8` is listed as Private on Venice's image model catalog (not
 * Anonymized/logged), uncensored, and tuned for photoreal character stills.
 * Pixel width/height (SDXL), not aspect_ratio/resolution. Override with
 * VENICE_IMAGE_MODEL if the account cannot use this id — list candidates via
 * GET {VENICE_API_BASE_URL}/models?type=image.
 */
export const VENICE_DEFAULT_IMAGE_MODEL = "lustify-v8";
export const VENICE_DEFAULT_WIDTH = 1024;
export const VENICE_DEFAULT_HEIGHT = 1024;
export const VENICE_DEFAULT_FORMAT = "webp" as const;

export type VeniceImageFormat = "webp" | "png" | "jpeg";
export type VeniceSizingMode = "pixel" | "aspect" | "resolution";

export type VeniceGenerateRequest = {
  model: string;
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  resolution?: string;
  format: VeniceImageFormat;
  return_binary: boolean;
  safe_mode: boolean;
  hide_watermark: boolean;
  embed_exif_metadata: boolean;
  seed?: number;
  cfg_scale?: number;
  steps?: number;
  variants?: number;
  style_preset?: string;
};

type VeniceGenerateJson = {
  id?: string;
  images?: unknown;
  error?: unknown;
  code?: unknown;
};

function mimeFromFormat(format: string): string {
  if (format === "png") return "image/png";
  if (format === "jpeg") return "image/jpeg";
  return "image/webp";
}

function formatFromMime(mime: string | null): VeniceImageFormat | null {
  const lower = mime?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (lower === "image/png") return "png";
  if (lower === "image/jpeg" || lower === "image/jpg") return "jpeg";
  if (lower === "image/webp") return "webp";
  return null;
}

/** Native generate URL. Prefer this over OpenAI-compat `/images/generations`. */
export function veniceImageGenerateUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/image/generate`;
}

/** Cheap auth check used by Connect Venice (GET /models?type=image). */
export function veniceModelsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/models?type=image`;
}

export const VENICE_VALIDATE_TIMEOUT_MS = 12_000;

/**
 * Validate a Bearer key with Venice's own cheap models list.
 * Never returns or throws vendor JSON / the key.
 */
export async function validateVeniceApiKey(apiKey: string): Promise<void> {
  const baseUrl = getEnv().venice.baseUrl;
  let response: Response;
  try {
    response = await fetch(veniceModelsUrl(baseUrl), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(VENICE_VALIDATE_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new VeniceConnectError("Venice didn't respond. Try again.", 504);
    }
    throw new VeniceConnectError("Could not reach Venice. Try again.", 503);
  }

  if (response.ok || response.status === 402) {
    return;
  }
  if (response.status === 401 || response.status === 403) {
    throw new VeniceConnectError(
      "Venice didn't accept that key. Check it at venice.ai/settings/api.",
    );
  }
  if (response.status >= 500) {
    throw new VeniceConnectError("Venice is unavailable. Try again.", 503);
  }
  throw new VeniceConnectError("Venice didn't accept that key. Check it at venice.ai/settings/api.");
}

/**
 * lustify-* / venice-sd35 / chroma are pixel-sized. Nano Banana / GPT Image
 * want aspect_ratio + resolution. qwen-image-2 is aspect-only.
 */
export function veniceSizingMode(model: string): VeniceSizingMode {
  const id = model.trim().toLowerCase();
  if (id.startsWith("nano-banana") || id.startsWith("gpt-image")) return "resolution";
  if (id === "qwen-image-2") return "aspect";
  return "pixel";
}

export function headerIsTrue(headers: Headers, name: string): boolean {
  const value = headers.get(name)?.trim().toLowerCase();
  return value === "true" || value === "1";
}

export function looksLikeVenicePolicyReject(input: {
  status?: number;
  headers?: Headers;
  code?: string | null;
  error?: string | null;
}): boolean {
  if (input.headers && headerIsTrue(input.headers, "x-venice-is-content-violation")) {
    return true;
  }
  const code = (input.code ?? "").toUpperCase();
  if (
    code === "CONTENT_VIOLATION" ||
    code === "CONTENT_POLICY" ||
    code === "SAFETY_REJECT" ||
    code.includes("POLICY")
  ) {
    return true;
  }
  const error = (input.error ?? "").toLowerCase();
  return /content violation|terms of service|safety|not allowed|policy/.test(error);
}

export function looksLikeVeniceBalanceError(input: {
  status?: number;
  code?: string | null;
}): boolean {
  if (input.status === 402) return true;
  const code = (input.code ?? "").toUpperCase();
  return code === "INSUFFICIENT_BALANCE" || code === "PAYMENT_REQUIRED";
}

/**
 * Composer chips compile to `prompt` / `negative_prompt` in the worker.
 * This builder only maps those strings onto the native Venice body.
 * Never attach LoRA / Soul-ID fields — Venice has no train API.
 */
export function buildVeniceGenerateRequest(input: {
  prompt: string;
  negativePrompt?: string;
  model: string;
  safeMode: boolean;
  width?: number;
  height?: number;
  aspectRatio?: string;
  seed?: number;
  format?: VeniceImageFormat;
}): VeniceGenerateRequest {
  const format = input.format ?? VENICE_DEFAULT_FORMAT;
  const model = input.model.trim() || VENICE_DEFAULT_IMAGE_MODEL;
  const request: VeniceGenerateRequest = {
    model,
    prompt: input.prompt,
    format,
    return_binary: false,
    safe_mode: input.safeMode,
    hide_watermark: true,
    embed_exif_metadata: false,
    variants: 1,
  };

  const negative = input.negativePrompt?.trim();
  if (negative) {
    request.negative_prompt = negative;
  }

  const sizing = veniceSizingMode(model);
  const aspectRatio = stillAspectFromUnknown(input.aspectRatio);
  if (sizing === "pixel") {
    request.width = input.width ?? VENICE_DEFAULT_WIDTH;
    request.height = input.height ?? VENICE_DEFAULT_HEIGHT;
  } else if (sizing === "aspect") {
    request.aspect_ratio = aspectRatio;
  } else {
    request.aspect_ratio = aspectRatio;
    request.resolution = "1K";
  }

  if (typeof input.seed === "number") {
    request.seed = input.seed;
  }

  return request;
}

export function decodeVeniceImage(encoded: string, mimeHint?: string): { mimeType: string; bytes: Buffer } {
  const trimmed = encoded.trim();
  const dataUrl = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(trimmed);
  if (dataUrl?.[1] && dataUrl[2]) {
    return {
      mimeType: dataUrl[1].toLowerCase(),
      bytes: Buffer.from(dataUrl[2].replace(/\s/g, ""), "base64"),
    };
  }
  return {
    mimeType: mimeHint ?? "image/webp",
    bytes: Buffer.from(trimmed, "base64"),
  };
}

function firstImageString(images: unknown): string | null {
  if (!Array.isArray(images) || typeof images[0] !== "string" || !images[0].trim()) {
    return null;
  }
  return images[0];
}

function readVeniceErrorPayload(payload: unknown): { code: string | null; error: string | null } {
  if (!payload || typeof payload !== "object") {
    return { code: null, error: null };
  }
  const record = payload as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? record.code : null,
    error: typeof record.error === "string" ? record.error : null,
  };
}

export function veniceErrorFromHttp(input: {
  status: number;
  headers?: Headers;
  payload?: unknown;
}): JobError | ProviderHttpError {
  const { code, error } = readVeniceErrorPayload(input.payload);
  if (looksLikeVeniceBalanceError({ status: input.status, code })) {
    return new JobError({ code: JOB_ERROR_CODES.PROVIDER_INSUFFICIENT_BALANCE, retryable: false });
  }
  if (looksLikeVenicePolicyReject({ status: input.status, headers: input.headers, code, error })) {
    return new JobError({ code: JOB_ERROR_CODES.GENERATE_POLICY_REJECT, retryable: false });
  }
  if (input.status === 429) {
    return new JobError({ code: JOB_ERROR_CODES.PROVIDER_RATE_LIMIT, retryable: true });
  }
  // Do not echo Venice JSON (may include prompt, x402 wallets, or stack text).
  return new ProviderHttpError("venice", input.status);
}

async function readErrorPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function stillFromResponse(
  response: Response,
  format: VeniceImageFormat,
  fallbackJobId: string,
): Promise<GenerateStillResult> {
  if (headerIsTrue(response.headers, "x-venice-is-content-violation")) {
    throw new JobError({ code: JOB_ERROR_CODES.GENERATE_POLICY_REJECT, retryable: false });
  }

  const binaryFormat = formatFromMime(response.headers.get("content-type"));
  if (binaryFormat) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength === 0) {
      throw new JobError({ code: JOB_ERROR_CODES.GENERATE_NO_IMAGE, retryable: false });
    }
    return {
      provider: "venice",
      providerJobId: response.headers.get("x-request-id")?.trim() || fallbackJobId,
      mimeType: mimeFromFormat(binaryFormat),
      imageBytes: bytes,
    };
  }

  let payload: VeniceGenerateJson;
  try {
    payload = (await response.json()) as VeniceGenerateJson;
  } catch {
    throw new JobError({ code: JOB_ERROR_CODES.GENERATE_NO_IMAGE, retryable: false });
  }

  const encoded = firstImageString(payload.images);
  if (!encoded) {
    throw new JobError({ code: JOB_ERROR_CODES.GENERATE_NO_IMAGE, retryable: false });
  }

  const decoded = decodeVeniceImage(encoded, mimeFromFormat(format));
  if (decoded.bytes.byteLength === 0) {
    throw new JobError({ code: JOB_ERROR_CODES.GENERATE_NO_IMAGE, retryable: false });
  }

  return {
    provider: "venice",
    providerJobId: typeof payload.id === "string" && payload.id.trim() ? payload.id : fallbackJobId,
    mimeType: decoded.mimeType,
    imageBytes: decoded.bytes,
  };
}

/**
 * Venice native image API: POST /image/generate
 * https://docs.venice.ai/api-reference/endpoint/image/generate
 *
 * Stage 1 lock: generateStill only. Venice has no Soul-ID / train API.
 */
export const veniceAdapter: GenerateStillAdapter = {
  name: "venice",
  async generateStill(input: GenerateStillInput): Promise<GenerateStillResult> {
    const env = getEnv().venice;
    const apiKey = await resolveVeniceApiKey();
    if (!apiKey) {
      throw new ProviderNotConfiguredError("venice");
    }

    const format = VENICE_DEFAULT_FORMAT;
    const body = buildVeniceGenerateRequest({
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      model: env.imageModel,
      safeMode: env.safeMode,
      width: input.width,
      height: input.height,
      aspectRatio: input.aspectRatio,
      seed: input.seed,
      format,
    });

    const response = await providerFetch(veniceImageGenerateUrl(env.baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw veniceErrorFromHttp({
        status: response.status,
        headers: response.headers,
        payload: await readErrorPayload(response),
      });
    }

    return stillFromResponse(response, format, input.jobId);
  },
};
