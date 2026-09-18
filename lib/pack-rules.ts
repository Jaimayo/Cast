import { PACK_MIN_REFS, PACK_TARGET_REFS } from "@/lib/constants";

export function canLockPack(refCount: number): { ok: true } | { ok: false; message: string } {
  if (refCount < PACK_MIN_REFS) {
    return {
      ok: false,
      message: `Need at least ${PACK_MIN_REFS} training refs to lock (have ${refCount}; target ~${PACK_TARGET_REFS}).`,
    };
  }
  return { ok: true };
}

export function lockWarning(refCount: number): string | null {
  if (refCount >= PACK_MIN_REFS && refCount < PACK_TARGET_REFS) {
    return `Locked at ${refCount} refs. Target is ~${PACK_TARGET_REFS} for more stable identity.`;
  }
  return null;
}
