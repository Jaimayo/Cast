import { PACK_MIN_REFS, PACK_TARGET_REFS } from "@/lib/constants";
import { isLockedSoul } from "@/lib/soul";

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

export const TRAIN_ALREADY_RUNNING = "Training is already running. Check Jobs — do not start a second train.";

export function canEnqueueTrainPack(status: string): { ok: true } | { ok: false; message: string } {
  if (status === "training") {
    return { ok: false, message: TRAIN_ALREADY_RUNNING };
  }
  if (status === "draft" || status === "failed") {
    return { ok: true };
  }
  return { ok: false, message: "Train & lock is available on draft packs" };
}

export function canEnqueueRetrainPack(status: string): { ok: true } | { ok: false; message: string } {
  if (status === "training") {
    return { ok: false, message: TRAIN_ALREADY_RUNNING };
  }
  if (isLockedSoul(status)) {
    return { ok: true };
  }
  return { ok: false, message: "Retrain is available after Soul ID is Locked." };
}

export function canLockDraftPack(status: string): { ok: true } | { ok: false; message: string } {
  if (status === "training") {
    return { ok: false, message: TRAIN_ALREADY_RUNNING };
  }
  if (status === "draft") {
    return { ok: true };
  }
  return { ok: false, message: "Only draft packs can be locked" };
}

/** Lock is Venice-only identity (no adapter required). Train & lock persists a RunPod adapter. */
export function lockRequiresAdapter(): boolean {
  return false;
}
