import { mapRunPodJobStatus, shouldContinuePolling } from "@/server/providers/train-status";

export const GENERATE_POLL_MAX_ATTEMPTS = 40;
export const GENERATE_POLL_DELAY_MS = 3_000;

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
