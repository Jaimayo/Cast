import { PACK_MIN_REFS, PACK_TARGET_REFS } from "@/lib/constants";

export const PACK_REFS_TOO_FEW = "PACK_REFS_TOO_FEW";
export const PACK_REFS_FULL = "PACK_REFS_FULL";
export const PACK_REFS_MUTABLE_STATUSES = ["draft", "failed"] as const;

export type PackRefsMutableStatus = (typeof PACK_REFS_MUTABLE_STATUSES)[number];

export function packRefsTooFewMessage(refCount: number): string {
  return `Need at least ${PACK_MIN_REFS} training refs to lock (have ${refCount}; target ~${PACK_TARGET_REFS}).`;
}

export function packRefsFullMessage(): string {
  return `This pack already has ${PACK_TARGET_REFS} training refs. Remove one to add another.`;
}

export function canLockPack(
  refCount: number,
): { ok: true } | { ok: false; code: typeof PACK_REFS_TOO_FEW; message: string } {
  if (refCount < PACK_MIN_REFS) {
    return {
      ok: false,
      code: PACK_REFS_TOO_FEW,
      message: packRefsTooFewMessage(refCount),
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

export function refsAreMutable(status: string): status is PackRefsMutableStatus {
  return status === "draft" || status === "failed";
}

export type AttachRefDecision =
  | { action: "noop-selected" }
  | { action: "noop-unselected" }
  | { action: "insert" }
  | { action: "delete" }
  | { action: "reject"; code: typeof PACK_REFS_FULL; message: string };

/**
 * Pure attach/detach decision. Callers must serialize per pack (row lock)
 * so two inserts cannot both pass the cap check.
 * Duplicate selected=true is a no-op, not an extra row.
 */
export function attachRefDecision(input: {
  wantSelected: boolean;
  alreadyAttached: boolean;
  refCount: number;
}): AttachRefDecision {
  if (input.wantSelected) {
    if (input.alreadyAttached) {
      return { action: "noop-selected" };
    }
    if (input.refCount >= PACK_TARGET_REFS) {
      return { action: "reject", code: PACK_REFS_FULL, message: packRefsFullMessage() };
    }
    return { action: "insert" };
  }
  if (!input.alreadyAttached) {
    return { action: "noop-unselected" };
  }
  return { action: "delete" };
}

export type PackActionGate =
  | { ok: true; warning: string | null; refCount: number }
  | { ok: false; code: "INVALID_PACK_STATE" | typeof PACK_REFS_TOO_FEW; message: string };

export function lockPackDecision(status: string, refCount: number): PackActionGate {
  if (status !== "draft") {
    return { ok: false, code: "INVALID_PACK_STATE", message: "Only draft packs can be locked" };
  }
  const refs = canLockPack(refCount);
  if (!refs.ok) {
    return refs;
  }
  return { ok: true, warning: lockWarning(refCount), refCount };
}

export function trainPackDecision(status: string, refCount: number): PackActionGate {
  if (!refsAreMutable(status)) {
    return {
      ok: false,
      code: "INVALID_PACK_STATE",
      message: "Train & lock is available on draft packs",
    };
  }
  const refs = canLockPack(refCount);
  if (!refs.ok) {
    return refs;
  }
  return { ok: true, warning: lockWarning(refCount), refCount };
}

export function generateStarterPackDecision(
  status: string,
): { ok: true } | { ok: false; code: "INVALID_PACK_STATE"; message: string } {
  if (status !== "draft") {
    return {
      ok: false,
      code: "INVALID_PACK_STATE",
      message: "Starters can only be added to a draft pack",
    };
  }
  return { ok: true };
}
