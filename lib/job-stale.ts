/** generateStill / generate_starter: Venice/RunPod poll is minutes, not hours. */
export const STALE_GENERATE_MS = 20 * 60 * 1000;

/**
 * trainPack worker updates `updatedAt` on every poll (5–30s).
 * A gap longer than this means the worker died mid-train.
 */
export const STALE_TRAIN_MS = 5 * 60 * 1000;

export type StaleJobAction = "ok" | "fail" | "requeue_train_poll" | "requeue_generate" | "requeue_generate_poll";

export type StaleJobInput = {
  kind: string;
  status: string;
  updatedAt: Date;
  now: Date;
  providerJobId?: string | null;
};

/**
 * Decide how to recover a job that has been queued/running without an update.
 * Train jobs that already have a provider id can resume polling instead of failing.
 * Generate / starter jobs re-enqueue; if a RunPod id exists, resume status polls.
 */
export function decideStaleJob(input: StaleJobInput): { action: StaleJobAction } {
  if (input.status !== "queued" && input.status !== "running") {
    return { action: "ok" };
  }
  const ageMs = input.now.getTime() - input.updatedAt.getTime();
  if (ageMs < 0) {
    return { action: "ok" };
  }
  const limit = input.kind === "train_pack" ? STALE_TRAIN_MS : STALE_GENERATE_MS;
  if (ageMs < limit) {
    return { action: "ok" };
  }
  if (input.kind === "train_pack" && input.providerJobId?.trim()) {
    return { action: "requeue_train_poll" };
  }
  const isGenerate = input.kind === "generate_still" || input.kind === "generate_starter";
  if (isGenerate && input.providerJobId?.trim()) {
    return { action: "requeue_generate_poll" };
  }
  if (isGenerate) {
    return { action: "requeue_generate" };
  }
  return { action: "fail" };
}

export function staleScanCutoff(now: Date): Date {
  const windowMs = Math.min(STALE_GENERATE_MS, STALE_TRAIN_MS);
  return new Date(now.getTime() - windowMs);
}
