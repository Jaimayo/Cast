import { JOB_ERROR_CODES } from "@/lib/job-errors";
import { mapRunPodJobStatus, shouldContinuePolling } from "@/server/providers/train-status";

export const GENERATE_POLL_MAX_ATTEMPTS = 40;
export const GENERATE_POLL_DELAY_MS = 3_000;

export type GeneratePollDecision =
  | { action: "complete" }
  | { action: "fail"; errorCode: string }
  | { action: "poll"; nextAttempt: number }
  | { action: "timeout"; errorCode: typeof JOB_ERROR_CODES.GENERATE_POLL_TIMEOUT };

export type GenerateImagePointer = {
  mimeType: string;
  bytesBase64?: string;
  sourceUrl?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function mimeFromHint(value?: string): string {
  if (!value) return "image/webp";
  const lower = value.toLowerCase();
  if (lower.startsWith("image/")) return lower;
  if (lower === "png") return "image/png";
  if (lower === "jpeg" || lower === "jpg") return "image/jpeg";
  if (lower === "webp") return "image/webp";
  return "image/webp";
}

function parseDataUrl(value: string): { mimeType: string; bytesBase64: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(value.trim());
  if (!match?.[1] || !match[2]) return null;
  return { mimeType: match[1].toLowerCase(), bytesBase64: match[2].replace(/\s/g, "") };
}

function fromString(value: string, mimeHint?: string): GenerateImagePointer | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dataUrl = parseDataUrl(trimmed);
  if (dataUrl) return dataUrl;
  if (/^https?:\/\//i.test(trimmed)) {
    return { mimeType: mimeFromHint(mimeHint), sourceUrl: trimmed };
  }
  if (trimmed.length > 32) {
    return { mimeType: mimeFromHint(mimeHint), bytesBase64: trimmed };
  }
  return null;
}

function firstImageValue(record: Record<string, unknown>): unknown {
  if (Array.isArray(record.images) && record.images.length > 0) {
    return record.images[0];
  }
  return (
    record.image ??
    record.image_base64 ??
    record.imageBase64 ??
    record.image_url ??
    record.imageUrl ??
    record.url ??
    record.artifactUrl
  );
}

/** Pull still bytes/URL from a RunPod generate worker output payload. */
export function extractGenerateImage(output: unknown): GenerateImagePointer | null {
  if (typeof output === "string") {
    return fromString(output);
  }
  if (Array.isArray(output) && typeof output[0] === "string") {
    return fromString(output[0]);
  }

  const root = asRecord(output);
  if (!root) {
    return null;
  }

  const nested = asRecord(root.output) ?? asRecord(root.artifacts) ?? root;
  const mimeHint =
    (typeof nested.mimeType === "string" && nested.mimeType) ||
    (typeof nested.mime_type === "string" && nested.mime_type) ||
    (typeof nested.format === "string" && nested.format) ||
    undefined;

  const value = firstImageValue(nested);
  if (typeof value === "string") {
    return fromString(value, mimeHint);
  }
  const nestedRecord = asRecord(value);
  if (nestedRecord) {
    const inner =
      (typeof nestedRecord.base64 === "string" && nestedRecord.base64) ||
      (typeof nestedRecord.data === "string" && nestedRecord.data) ||
      (typeof nestedRecord.url === "string" && nestedRecord.url) ||
      undefined;
    if (inner) {
      return fromString(inner, mimeHint);
    }
  }
  return null;
}

export function generateStillTimedOut(attempts: number): boolean {
  return attempts > GENERATE_POLL_MAX_ATTEMPTS;
}

export function shouldKeepPollingGenerate(status: string | undefined): boolean {
  return shouldContinuePolling(mapRunPodJobStatus(status));
}

/** Delayed BullMQ polls: short at first, then back off while RunPod stays queued. */
export function generatePollDelayMs(attempt: number): number {
  if (attempt < 10) return GENERATE_POLL_DELAY_MS;
  if (attempt < 25) return 8_000;
  return 15_000;
}

export function generatePollDecision(input: {
  status: "queued" | "running" | "succeeded" | "failed";
  attempt: number;
  maxAttempts?: number;
  errorCode?: string | null;
}): GeneratePollDecision {
  if (input.status === "failed") {
    return { action: "fail", errorCode: input.errorCode ?? JOB_ERROR_CODES.GENERATE_STILL_FAILED };
  }
  if (input.status === "succeeded") {
    return { action: "complete" };
  }
  const nextAttempt = input.attempt + 1;
  const maxAttempts = input.maxAttempts ?? GENERATE_POLL_MAX_ATTEMPTS;
  if (nextAttempt > maxAttempts) {
    return { action: "timeout", errorCode: JOB_ERROR_CODES.GENERATE_POLL_TIMEOUT };
  }
  return { action: "poll", nextAttempt };
}

export function generateStillHasImage(result: { imageBytes?: Buffer; mimeType?: string }): boolean {
  return Boolean(result.imageBytes && result.imageBytes.byteLength > 0 && result.mimeType);
}

/** Map live RunPod generate failure strings onto stored generation_jobs.error_code values. */
export function runPodGenerateErrorCode(status: string | undefined, payloadError?: string | null): string | null {
  const mapped = mapRunPodJobStatus(status);
  if (mapped !== "failed") return null;
  const value = (status ?? "").toUpperCase();
  if (value === "TIMED_OUT" || value === "TIMEOUT") return JOB_ERROR_CODES.GENERATE_POLL_TIMEOUT;
  const code = payloadError?.trim();
  if (code && /^[A-Z][A-Z0-9_]{2,64}$/.test(code)) return code;
  return JOB_ERROR_CODES.GENERATE_STILL_FAILED;
}
