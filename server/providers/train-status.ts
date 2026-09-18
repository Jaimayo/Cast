import { JOB_ERROR_CODES } from "@/lib/job-errors";

export type NormalizedTrainStatus = "queued" | "running" | "succeeded" | "failed";

export type AdapterPointer = {
  storageKey?: string;
  sourceUrl?: string;
  filename?: string;
  mimeType?: string;
  bytesBase64?: string;
};

const SENSITIVE_META = /base64|bytes|image|prompt/i;

export function mapRunPodJobStatus(status: string | undefined): NormalizedTrainStatus {
  const value = (status ?? "").toUpperCase();
  if (value === "COMPLETED" || value === "SUCCEEDED" || value === "SUCCESS") return "succeeded";
  if (value === "IN_QUEUE" || value === "QUEUED" || value === "IN-QUEUE") return "queued";
  if (value === "IN_PROGRESS" || value === "RUNNING" || value === "IN-PROGRESS") return "running";
  if (
    value === "FAILED" ||
    value === "CANCELLED" ||
    value === "CANCELED" ||
    value === "TIMED_OUT" ||
    value === "TIMEOUT"
  ) {
    return "failed";
  }
  return "running";
}

export function shouldContinuePolling(status: NormalizedTrainStatus): boolean {
  return status === "queued" || status === "running";
}

export function trainPollDelayMs(attempt: number): number {
  if (attempt < 6) return 5_000;
  if (attempt < 20) return 15_000;
  return 30_000;
}

export const TRAIN_POLL_MAX_ATTEMPTS = 80;

export type TrainPollDecision =
  | { action: "persist" }
  | { action: "fail"; errorCode: string }
  | { action: "poll"; nextAttempt: number }
  | { action: "timeout"; errorCode: typeof JOB_ERROR_CODES.TRAIN_POLL_TIMEOUT };

export function trainPollDecision(input: {
  status: NormalizedTrainStatus;
  attempt: number;
  maxAttempts?: number;
}): TrainPollDecision {
  if (input.status === "failed") {
    return { action: "fail", errorCode: JOB_ERROR_CODES.TRAIN_PACK_FAILED };
  }
  if (input.status === "succeeded") {
    return { action: "persist" };
  }
  const nextAttempt = input.attempt + 1;
  const maxAttempts = input.maxAttempts ?? TRAIN_POLL_MAX_ATTEMPTS;
  if (nextAttempt > maxAttempts) {
    return { action: "timeout", errorCode: JOB_ERROR_CODES.TRAIN_POLL_TIMEOUT };
  }
  return { action: "poll", nextAttempt };
}

/** Map live RunPod status strings onto stored generation_jobs.error_code values. */
export function runPodTrainErrorCode(status: string | undefined, payloadError?: string | null): string | null {
  const mapped = mapRunPodJobStatus(status);
  if (mapped !== "failed") return null;
  const value = (status ?? "").toUpperCase();
  if (value === "TIMED_OUT" || value === "TIMEOUT") return JOB_ERROR_CODES.TRAIN_PACK_TIMEOUT;
  if (value === "CANCELLED" || value === "CANCELED") return JOB_ERROR_CODES.TRAIN_PACK_CANCELED;
  const code = payloadError?.trim();
  if (code && /^[A-Z][A-Z0-9_]{2,64}$/.test(code)) return code;
  return JOB_ERROR_CODES.TRAIN_PACK_FAILED;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function stringField(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function unwrapWorkerPayload(output: unknown): Record<string, unknown> | null {
  const root = asRecord(output);
  if (!root) return null;
  const nested = asRecord(root.output) ?? asRecord(root.artifacts);
  if (!nested) return root;
  return asRecord(nested.output) ?? asRecord(nested.artifacts) ?? nested;
}

/** Pull LoRA / adapter pointers from a RunPod (or sister) worker output payload. */
export function extractAdapterPointer(output: unknown): AdapterPointer | null {
  const nested = unwrapWorkerPayload(output);
  if (!nested) {
    return null;
  }
  const pointer: AdapterPointer = {
    storageKey: stringField(
      nested,
      "adapterStorageKey",
      "adapter_storage_key",
      "adapterKey",
      "loraKey",
      "lora_key",
      "s3Key",
      "storageKey",
      "storage_key",
    ),
    sourceUrl: stringField(
      nested,
      "adapterUrl",
      "adapter_url",
      "loraUrl",
      "lora_url",
      "artifactUrl",
      "artifact_url",
      "url",
    ),
    filename: stringField(nested, "filename", "fileName", "name"),
    mimeType: stringField(nested, "mimeType", "mime_type", "contentType"),
    bytesBase64: stringField(nested, "adapter_base64", "lora_base64", "bytes_base64", "artifact_base64"),
  };

  const lora = nested.lora;
  if (!pointer.storageKey && typeof lora === "string" && lora.trim()) {
    pointer.storageKey = lora.trim();
  }

  if (pointer.storageKey && looksLikeUrl(pointer.storageKey) && !pointer.sourceUrl) {
    pointer.sourceUrl = pointer.storageKey;
    pointer.storageKey = undefined;
  }

  if (!pointer.storageKey && !pointer.sourceUrl && !pointer.bytesBase64) {
    return null;
  }
  return pointer;
}

export function publicAdapterMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_META.test(key)) continue;
    if (typeof value === "string" && value.length > 500) continue;
    out[key] = value;
  }
  return out;
}
