import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import { getEnv } from "@/server/env";
import { providerFetch } from "@/server/providers/http";
import {
  ProviderHttpError,
  ProviderNotConfiguredError,
  type GenerateStillAdapter,
  type GenerateStillInput,
  type GenerateStillResult,
} from "@/server/providers/types";

type VeniceGenerateResponse = {
  id: string;
  images: string[];
  timing?: {
    inferenceDuration: number;
    inferencePreprocessingTime: number;
    inferenceQueueTime: number;
    total: number;
  };
};

function mimeFromFormat(format: string): string {
  if (format === "png") return "image/png";
  if (format === "jpeg") return "image/jpeg";
  return "image/webp";
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
    if (!env.apiKey) {
      throw new ProviderNotConfiguredError("venice");
    }

    const format = "webp";
    const body = {
      model: env.imageModel,
      prompt: input.prompt,
      negative_prompt: input.negativePrompt,
      width: input.width ?? 1024,
      height: input.height ?? 1024,
      format,
      return_binary: false,
      safe_mode: env.safeMode,
      ...(typeof input.seed === "number" ? { seed: input.seed } : {}),
    };

    const response = await providerFetch(`${env.baseUrl.replace(/\/$/, "")}/image/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Do not echo prompt or image payloads.
      throw new ProviderHttpError("venice", response.status);
    }

    const payload = (await response.json()) as VeniceGenerateResponse;
    const encoded = payload.images[0];
    if (!encoded) {
      throw new JobError({ code: JOB_ERROR_CODES.GENERATE_NO_IMAGE, retryable: false });
    }

    return {
      provider: "venice",
      providerJobId: payload.id,
      status: "succeeded",
      mimeType: mimeFromFormat(format),
      imageBytes: Buffer.from(encoded, "base64"),
    };
  },
};
