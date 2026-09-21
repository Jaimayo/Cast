import { LOCK_SOUL_ID_FIRST } from "@/lib/soul";
import { GENERATE_LABEL, GENERATE_REASON_POSE as POSE_HELPER } from "@/lib/studio-copy";

export const GENERATE_REASON_ATTEST = "Confirm you are 18+.";
export const GENERATE_REASON_UNLOCKED = LOCK_SOUL_ID_FIRST;
export const GENERATE_REASON_POSE = POSE_HELPER;

export const GENERATE_LABEL_IDLE = GENERATE_LABEL;
export const GENERATE_LABEL_QUEUEING = "Queueing…";
export const GENERATE_LABEL_IN_PROGRESS = "Generating…";
export const GENERATE_IN_PROGRESS_COPY = "Generating still…";

export type GenerateAffordanceInput = {
  attested: boolean;
  locked: boolean;
  poseChipId?: string | null;
};

export function generateDisabledReason(input: GenerateAffordanceInput): string | undefined {
  if (!input.attested) return GENERATE_REASON_ATTEST;
  if (!input.locked) return GENERATE_REASON_UNLOCKED;
  if (!input.poseChipId?.trim()) return GENERATE_REASON_POSE;
  return undefined;
}

export function canGenerateStill(input: GenerateAffordanceInput): boolean {
  return generateDisabledReason(input) === undefined;
}

export function generateButtonLabel(input: { pending: boolean; inProgress: boolean }): string {
  if (input.pending) return GENERATE_LABEL_QUEUEING;
  if (input.inProgress) return GENERATE_LABEL_IN_PROGRESS;
  return GENERATE_LABEL_IDLE;
}
