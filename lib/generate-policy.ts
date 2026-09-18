import { requireChip } from "@/lib/chips";
import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import { isLockedSoul } from "@/lib/soul";

export const POSE_REQUIRED_MESSAGE = "Pose is required";

export function requirePoseForGenerate(poseChipId: string | null | undefined): void {
  if (!poseChipId?.trim()) {
    throw new JobError({ code: JOB_ERROR_CODES.POSE_REQUIRED, retryable: false });
  }
  requireChip(poseChipId, "pose");
}

/** Composer Generate + Test grid: Locked Soul ID and a real pose chip. */
export function assertGenerateStillAllowed(input: {
  packStatus: string;
  poseChipId: string | null | undefined;
}): void {
  if (!isLockedSoul(input.packStatus)) {
    throw new JobError({ code: JOB_ERROR_CODES.PACK_NOT_LOCKED, retryable: false });
  }
  requirePoseForGenerate(input.poseChipId);
}
