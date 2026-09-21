/** Soul ID display. `ready` is a legacy alias of Locked from the first scaffold. */
export type SoulStatus = "Draft" | "Training" | "Locked" | "Failed";

/** Composer / API copy when Generate is blocked on a non-Locked pack. */
export const LOCK_SOUL_ID_FIRST = "Lock Soul ID first";

/** Roster / pack chrome when Soul ID is Locked. Exact branding string. */
export const SOUL_BADGE_LOCKED = "Soul ID";
export const SOUL_BADGE_UNLOCKED = "No Soul ID";

export function isLockedSoul(status: string): boolean {
  return status === "locked" || status === "ready";
}

export function soulStatusLabel(status: string): SoulStatus {
  if (status === "training") return "Training";
  if (status === "locked" || status === "ready") return "Locked";
  if (status === "failed") return "Failed";
  return "Draft";
}

export function packDetailPath(packId?: string | null): string {
  return packId ? `/app/characters/${packId}` : "/app/characters";
}

/** Server + UI: Generate is Locked Soul ID only — Draft/Training/Failed are rejected. */
export function requireLockedSoulForGenerate(status: string): void {
  if (!isLockedSoul(status)) {
    throw new Error(LOCK_SOUL_ID_FIRST);
  }
}
