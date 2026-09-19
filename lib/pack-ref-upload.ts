import { PACK_MIN_REFS, PACK_REF_ACCEPT, PACK_REF_MAX_BYTES, PACK_TARGET_REFS } from "@/lib/constants";
import { packRefsFullMessage } from "@/lib/pack-rules";

export const PACK_REF_TOO_LARGE = "PACK_REF_TOO_LARGE";
export const PACK_REF_TYPE = "PACK_REF_TYPE";
export const PACK_REF_EMPTY = "PACK_REF_EMPTY";

export const PACK_REF_TOO_LARGE_MESSAGE = `Each reference picture must be ${Math.round(PACK_REF_MAX_BYTES / (1024 * 1024))} MB or smaller.`;
export const PACK_REF_TYPE_MESSAGE = "Use a JPEG, PNG, or WebP still.";
export const PACK_REF_EMPTY_MESSAGE = "That file is empty.";

export const PACK_REF_LIMITS_COPY = `Up to ${PACK_TARGET_REFS} pictures · ${Math.round(PACK_REF_MAX_BYTES / (1024 * 1024))} MB each · JPEG, PNG, or WebP`;

export const PACK_REF_FICTIONAL_COPY = "Fictional stills only.";

export type PackRefMime = (typeof PACK_REF_ACCEPT)[number];

export type PackRefFileDecision =
  | { ok: true; mimeType: PackRefMime; byteSize: number }
  | { ok: false; code: typeof PACK_REF_TOO_LARGE | typeof PACK_REF_TYPE | typeof PACK_REF_EMPTY | "PACK_REFS_FULL"; message: string };

/** JPEG / PNG / WebP magic. Claimed MIME is ignored when bytes disagree. */
export function sniffPackRefMime(bytes: Uint8Array): PackRefMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function validatePackRefFile(input: {
  bytes: Uint8Array;
  claimedMime?: string | null;
  refCount: number;
}): PackRefFileDecision {
  void input.claimedMime;
  if (input.refCount >= PACK_TARGET_REFS) {
    return { ok: false, code: "PACK_REFS_FULL", message: packRefsFullMessage() };
  }
  if (input.bytes.byteLength === 0) {
    return { ok: false, code: PACK_REF_EMPTY, message: PACK_REF_EMPTY_MESSAGE };
  }
  if (input.bytes.byteLength > PACK_REF_MAX_BYTES) {
    return { ok: false, code: PACK_REF_TOO_LARGE, message: PACK_REF_TOO_LARGE_MESSAGE };
  }
  const mimeType = sniffPackRefMime(input.bytes);
  if (!mimeType) {
    return { ok: false, code: PACK_REF_TYPE, message: PACK_REF_TYPE_MESSAGE };
  }
  return { ok: true, mimeType, byteSize: input.bytes.byteLength };
}

export function packRefMeterCopy(count: number): string {
  const remaining = Math.max(0, PACK_TARGET_REFS - count);
  if (count === 0) {
    return `0 selected · ${PACK_MIN_REFS} min to lock · ${PACK_TARGET_REFS} max`;
  }
  if (count < PACK_MIN_REFS) {
    return `${count} of ${PACK_TARGET_REFS} · ${PACK_MIN_REFS - count} more to lock`;
  }
  if (count < PACK_TARGET_REFS) {
    return `${count} of ${PACK_TARGET_REFS} · ready to lock · ${remaining} slot${remaining === 1 ? "" : "s"} left`;
  }
  return `${PACK_TARGET_REFS} of ${PACK_TARGET_REFS} · full — remove one to add another`;
}

export function extForPackRefMime(mime: PackRefMime): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  return "webp";
}
