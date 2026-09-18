import { UnrecoverableError } from "bullmq";
import { and, eq, inArray, lt } from "drizzle-orm";
import { characterPacks, generationJobs, mediaAssets, type CharacterPack, type GenerationJob } from "@/db/schema";
import {
  packAlreadyHasThisAdapter,
  packUpdateForTrainFailure,
  previousAdapterSnapshot,
  type AdapterIdentitySnapshot,
} from "@/lib/adapter-identity";
import {
  JOB_ERROR_CODES,
  JobError,
  classifyJobError,
  keepLockedAfterTrainFail,
  shouldRetryJob,
  trainPackFailureMessage,
  trainPackStalledMessage,
  trainPackTimeoutMessage,
  type JobAttempt,
} from "@/lib/job-errors";
import { jobLog } from "@/lib/job-log";
import { decideStaleJob, staleScanCutoff } from "@/lib/job-stale";
import { getDb } from "@/server/db";
import { TRAIN_PACK_JOB_OPTIONS, getTrainPackQueue } from "@/server/queue";

export function isRetrainJob(inputJson: Record<string, unknown>): boolean {
  return inputJson.retrain === true;
}

export function previousTrainProviderJobId(inputJson: Record<string, unknown>): string | null {
  const value = inputJson.previousProviderJobId;
  return typeof value === "string" && value.trim() ? value : null;
}

export function previousAdapterFromJob(
  inputJson: Record<string, unknown>,
): AdapterIdentitySnapshot | null {
  return previousAdapterSnapshot(inputJson);
}

function keepLockedFromPack(
  job: Pick<GenerationJob, "inputJson">,
  pack: CharacterPack | null,
): boolean {
  return keepLockedAfterTrainFail({
    retrain: isRetrainJob(job.inputJson),
    adapterStorageKey: pack?.adapterStorageKey,
    adapterStatus: pack?.adapterStatus,
    adapterId: pack?.adapterId,
  });
}

export async function loadGenerationJob(jobId: string): Promise<GenerationJob | null> {
  const rows = await getDb().select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1);
  return rows[0] ?? null;
}

export async function loadPack(packId: string): Promise<CharacterPack | null> {
  const rows = await getDb().select().from(characterPacks).where(eq(characterPacks.id, packId)).limit(1);
  return rows[0] ?? null;
}

export async function existingMediaForJob(jobId: string) {
  const rows = await getDb()
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.generationJobId, jobId))
    .limit(1);
  return rows[0] ?? null;
}

export async function markJobRunning(jobId: string, attemptsMade?: number): Promise<void> {
  await getDb()
    .update(generationJobs)
    .set({
      status: "running",
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date(),
      ...(attemptsMade != null ? { attemptsMade } : {}),
    })
    .where(eq(generationJobs.id, jobId));
}

export async function markJobSucceeded(input: {
  jobId: string;
  resultAssetKey?: string | null;
  providerJobId?: string | null;
}): Promise<void> {
  await getDb()
    .update(generationJobs)
    .set({
      status: "succeeded",
      resultAssetKey: input.resultAssetKey ?? null,
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date(),
      ...(input.providerJobId ? { providerJobId: input.providerJobId } : {}),
    })
    .where(eq(generationJobs.id, input.jobId));
}

export async function persistProviderJobId(jobId: string, providerJobId: string): Promise<void> {
  await getDb()
    .update(generationJobs)
    .set({ providerJobId, status: "running", updatedAt: new Date() })
    .where(eq(generationJobs.id, jobId));
}

export async function markJobFailedIfActive(input: {
  jobId: string;
  errorCode: string;
  errorMessage: string;
  providerJobId?: string | null;
  attemptsMade?: number;
}): Promise<boolean> {
  const job = await loadGenerationJob(input.jobId);
  if (!job || job.status === "succeeded" || job.status === "failed" || job.status === "canceled") {
    return false;
  }
  await getDb()
    .update(generationJobs)
    .set({
      status: "failed",
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      ...(input.providerJobId ? { providerJobId: input.providerJobId } : {}),
      ...(input.attemptsMade != null ? { attemptsMade: input.attemptsMade } : {}),
      updatedAt: new Date(),
    })
    .where(eq(generationJobs.id, input.jobId));
  return true;
}

export async function restorePackAfterTrainFailure(input: {
  packId: string;
  keepLocked: boolean;
  previousProviderJobId: string | null;
  failedProviderJobId?: string | null;
  previousAdapter?: AdapterIdentitySnapshot | null;
}): Promise<void> {
  const pack = await loadPack(input.packId);
  if (!pack || pack.status !== "training") {
    return;
  }
  const update = packUpdateForTrainFailure({
    keepLocked: input.keepLocked,
    previousProviderJobId: input.previousProviderJobId,
    failedProviderJobId: input.failedProviderJobId,
    currentProviderJobId: pack.providerJobId,
    previousAdapter: input.previousAdapter ?? null,
  });
  await getDb()
    .update(characterPacks)
    .set({
      ...update,
      updatedAt: new Date(),
    })
    .where(eq(characterPacks.id, input.packId));
}

function userMessageForTrainFail(code: string, keepLocked: boolean, fallback: string): string {
  if (code === JOB_ERROR_CODES.TRAIN_POLL_TIMEOUT) return trainPackTimeoutMessage(keepLocked);
  if (code === JOB_ERROR_CODES.JOB_STALLED) return trainPackStalledMessage(keepLocked);
  if (code === JOB_ERROR_CODES.TRAIN_PACK_FAILED) return trainPackFailureMessage(keepLocked);
  if (keepLocked && (code === JOB_ERROR_CODES.NETWORK_ERROR || code === JOB_ERROR_CODES.PROVIDER_HTTP_ERROR || code === JOB_ERROR_CODES.PROVIDER_TIMEOUT)) {
    return `${fallback} Your previous Locked Soul ID is unchanged.`;
  }
  return fallback;
}

export async function finalizeWorkerError(input: {
  jobId: string;
  kind: GenerationJob["kind"];
  err: unknown;
  attempt: JobAttempt;
  packId?: string | null;
  keepLockedOnFail?: boolean;
  previousProviderJobId?: string | null;
  previousAdapter?: AdapterIdentitySnapshot | null;
  providerJobId?: string | null;
}): Promise<never> {
  const classified = classifyJobError(input.err);
  const keepLocked = Boolean(input.keepLockedOnFail);
  const userMessage =
    input.kind === "train_pack"
      ? userMessageForTrainFail(classified.code, keepLocked, classified.userMessage)
      : classified.userMessage;
  const terminal = !shouldRetryJob(classified, input.attempt);

  jobLog("job.error", {
    jobId: input.jobId,
    kind: input.kind,
    packId: input.packId ?? null,
    code: classified.code,
    retryable: classified.retryable,
    attempt: input.attempt.attempt,
    maxAttempts: input.attempt.maxAttempts,
    terminal,
  });

  if (!terminal) {
    throw input.err instanceof Error ? input.err : new Error(classified.userMessage);
  }

  await markJobFailedIfActive({
    jobId: input.jobId,
    errorCode: classified.code,
    errorMessage: userMessage,
    providerJobId: input.providerJobId,
    attemptsMade: input.attempt.attempt,
  });

  if (input.kind === "train_pack" && input.packId) {
    await restorePackAfterTrainFailure({
      packId: input.packId,
      keepLocked,
      previousProviderJobId: input.previousProviderJobId ?? null,
      failedProviderJobId: input.providerJobId ?? null,
      previousAdapter: input.previousAdapter ?? null,
    });
  }

  throw new UnrecoverableError(userMessage);
}

/** BullMQ `failed` after the last attempt or stall — persist if the worker crashed before catch. */
export async function persistQueueFailure(
  generationJobId: string,
  err?: unknown,
  attemptsMade?: number,
): Promise<void> {
  const job = await loadGenerationJob(generationJobId);
  if (!job || job.status === "succeeded" || job.status === "failed" || job.status === "canceled") {
    return;
  }
  const classified = classifyJobError(err ?? new JobError({ code: JOB_ERROR_CODES.JOB_STALLED }));
  const code = classified.code;
  const pack = job.characterPackId ? await loadPack(job.characterPackId) : null;
  const keepLocked = keepLockedFromPack(job, pack);
  const userMessage =
    job.kind === "train_pack"
      ? userMessageForTrainFail(code, keepLocked, classified.userMessage)
      : classified.userMessage;

  await markJobFailedIfActive({
    jobId: job.id,
    errorCode: code,
    errorMessage: userMessage,
    attemptsMade,
  });

  if (job.kind === "train_pack" && job.characterPackId) {
    await restorePackAfterTrainFailure({
      packId: job.characterPackId,
      keepLocked,
      previousProviderJobId: previousTrainProviderJobId(job.inputJson),
      previousAdapter: previousAdapterFromJob(job.inputJson),
    });
  }

  jobLog("job.queue_failed", {
    jobId: job.id,
    kind: job.kind,
    packId: job.characterPackId,
    code,
  });
}

export async function recoverStaleJobs(filter?: {
  userId?: string;
  packId?: string;
}): Promise<{ recovered: number }> {
  const db = getDb();
  const now = new Date();
  const cutoff = staleScanCutoff(now);
  const conditions = [
    inArray(generationJobs.status, ["queued", "running"]),
    lt(generationJobs.updatedAt, cutoff),
  ];
  if (filter?.userId) {
    conditions.push(eq(generationJobs.userId, filter.userId));
  }
  if (filter?.packId) {
    conditions.push(eq(generationJobs.characterPackId, filter.packId));
  }

  const jobs = await db.select().from(generationJobs).where(and(...conditions));
  let recovered = 0;

  for (const job of jobs) {
    try {
    const decision = decideStaleJob({
      kind: job.kind,
      status: job.status,
      updatedAt: job.updatedAt,
      now,
      providerJobId: job.providerJobId,
    });
    if (decision.action === "ok") continue;

    if (job.kind === "train_pack" && job.characterPackId) {
      const pack = await loadPack(job.characterPackId);
      if (pack && packAlreadyHasThisAdapter(pack, job.providerJobId)) {
        await markJobSucceeded({
          jobId: job.id,
          resultAssetKey: pack.adapterStorageKey,
          providerJobId: job.providerJobId,
        });
        recovered += 1;
        continue;
      }
    }

    if (decision.action === "requeue_train_poll" && job.characterPackId) {
      await db
        .update(generationJobs)
        .set({ status: "running", updatedAt: now })
        .where(eq(generationJobs.id, job.id));
      await getTrainPackQueue().add(
        "trainPack",
        { generationJobId: job.id, characterPackId: job.characterPackId, attempt: 0 },
        TRAIN_PACK_JOB_OPTIONS,
      );
      jobLog("job.stale_requeue", {
        jobId: job.id,
        kind: job.kind,
        packId: job.characterPackId,
        providerJobId: job.providerJobId,
      });
      recovered += 1;
      continue;
    }

    const pack = job.characterPackId ? await loadPack(job.characterPackId) : null;
    const keepLocked = keepLockedFromPack(job, pack);
    const message =
      job.kind === "train_pack"
        ? trainPackStalledMessage(keepLocked)
        : classifiedStalledGenerate(job.kind);

    const changed = await markJobFailedIfActive({
      jobId: job.id,
      errorCode: JOB_ERROR_CODES.JOB_STALLED,
      errorMessage: message,
    });
    if (changed && job.kind === "train_pack" && job.characterPackId) {
      await restorePackAfterTrainFailure({
        packId: job.characterPackId,
        keepLocked,
        previousProviderJobId: previousTrainProviderJobId(job.inputJson),
        previousAdapter: previousAdapterFromJob(job.inputJson),
      });
    }
    if (changed) {
      jobLog("job.stale_failed", {
        jobId: job.id,
        kind: job.kind,
        packId: job.characterPackId,
        code: JOB_ERROR_CODES.JOB_STALLED,
      });
      recovered += 1;
    }
    } catch (err) {
      jobLog("job.recover_item_failed", {
        jobId: job.id,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return { recovered };
}

function classifiedStalledGenerate(kind: string): string {
  if (kind === "generate_starter") {
    return "Starter generation stopped unexpectedly. Generate the vibe again.";
  }
  return "Still generation stopped unexpectedly. Try Generate again.";
}

export async function recoverStaleJobsSafe(filter?: {
  userId?: string;
  packId?: string;
}): Promise<void> {
  try {
    const result = await recoverStaleJobs(filter);
    if (result.recovered > 0) {
      jobLog("job.recovered", { recovered: result.recovered, packId: filter?.packId ?? null });
    }
  } catch (err) {
    jobLog("job.recover_failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}
