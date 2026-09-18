/** Soul ID display. `ready` is a legacy alias of Locked from the first scaffold. */
export type SoulStatus = "Draft" | "Training" | "Locked" | "Failed";

export function isLockedSoul(status: string): boolean {
  return status === "locked" || status === "ready";
}

export function soulStatusLabel(status: string): SoulStatus {
  if (status === "training") return "Training";
  if (status === "locked" || status === "ready") return "Locked";
  if (status === "failed") return "Failed";
  return "Draft";
}
