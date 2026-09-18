import { eq } from "drizzle-orm";
import { characterPacks, generationJobs, mediaAssets, trainingSetAssets } from "@/db/schema";
import {
  JobError,
  JOB_ERROR_CODES,
  isSubmitAttempted,
  keepLockedAfterTrainFail,
  trainPackFailureMessage,
  trainSubmitDecision,
  withSubmitAttempted,
  type JobAttempt,
} from "@/lib/job-errors";
import { jobLog } from "@/lib/job-log";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import {
  finalizeWorkerError,
  isRetrainJob,
  loadGenerationJob,
  markJobRunning,
  markJobSucceeded,
  persistProviderJobId,
  previousTrainProviderJobId,
  restorePackAfterTrainFailure,
} from "@/server/jobs";
import { persistAdapterPointer } from "@/server/providers/adapter-persist";
import { getTrainPackAdapter } from "@/server/providers/registry";
import { shouldContinuePolling, TRAIN_POLL_MAX_ATTEMPTS, trainPollDelayMs } from "@/server/providers/train-status";
import { type TrainPackResult } from "@/server/providers/types";
import { enqueueTrainPackJob } from "@/server/queue";

export async function processTrainPackJob(
  generationJobId: string,
  characterPackId: string,
  pollAttempt = 0,
  attempt: JobAttempt = { attempt: 1, maxAttempts: 1 },
): Promise<void> {
  const db = getDb();
  const job = await loadGenerationJob(generationJobId);
  if (!job) {
    throw new Error(`Job ${generationJobId} not found`);
  }

  if (job.status === "succeeded") {
    jobLog("trainPack.skip_succeeded", { jobId: job.id, packId: characterPackId });
    return;
  }

  const retrain = isRetrainJob(job.inputJson);
  let keepLockedOnFail = false;

  await markJobRunning(job.id, attempt.attempt);

  try {
    const packRows = await db
      .select()
      .from(characterPacks)
      .where(eq(characterPacks.id, characterPackId))
      .limit(1);
    const pack = packRows[0];
    if (!pack) {
      throw new Error("Character pack not found");
    }
    keepLockedOnFail = keepLockedAfterTrainFail({
      retrain,
      adapterStorageKey: pack.adapterStorageKey,
    });

    if (
      pack.status === "locked" &&
      job.providerJobId &&
      pack.providerJobId === job.providerJobId &&
      pack.adapterStorageKey
    ) {
      await markJobSucceeded({
        jobId: job.id,
        resultAssetKey: pack.adapterStorageKey,
        providerJobId: job.providerJobId,
      });
      jobLog("trainPack.skip_already_locked", {
        jobId: job.id,
        packId: pack.id,
        providerJobId: job.providerJobId,
      });
      return;
    }

    const refs = await db
      .select({ storageKey: mediaAssets.storageKey })
      .from(trainingSetAssets)
      .innerJoin(mediaAssets, eq(mediaAssets.id, trainingSetAssets.mediaAssetId))
      .where(eq(trainingSetAssets.characterPackId, pack.id));

    const adapter = getTrainPackAdapter();
    jobLog("trainPack.start", {
      jobId: job.id,
      packId: pack.id,
      provider: adapter.name,
      providerMode: getEnv().providerMode,
      pollAttempt,
      attempt: attempt.attempt,
      maxAttempts: attempt.maxAttempts,
      retrain,
      hasProviderJobId: Boolean(job.providerJobId),
    });

    const submit = trainSubmitDecision({
      providerJobId: job.providerJobId,
      submitAttempted: isSubmitAttempted(job.inputJson),
    });
    let result: TrainPackResult;
    if (submit === "fail-in-flight") {
      throw new JobError({ code: JOB_ERROR_CODES.TRAIN_SUBMIT_IN_FLIGHT, retryable: false });
    }
    if (submit === "poll") {
      if (!adapter.getTrainStatus || !job.providerJobId) {
        throw new JobError({ code: JOB_ERROR_CODES.TRAIN_SUBMIT_IN_FLIGHT, retryable: false });
      }
      result = await adapter.getTrainStatus(job.providerJobId);
    } else {
      await db
        .update(generationJobs)
        .set({
          inputJson: withSubmitAttempted(job.inputJson),
          updatedAt: new Date(),
        })
        .where(eq(generationJobs.id, job.id));
      result = await adapter.trainPack({
        jobId: job.id,
        characterPackId: pack.id,
        name: pack.name,
        referenceKeys: refs.map((row) => row.storageKey),
      });
      if (result.providerJobId) {
        await persistProviderJobId(job.id, result.providerJobId);
      }
    }

    if (result.status === "failed") {
      const errorCode = result.errorCode ?? JOB_ERROR_CODES.TRAIN_PACK_FAILED;
      await db
        .update(generationJobs)
        .set({
          status: "failed",
          providerJobId: result.providerJobId,
          errorCode,
          errorMessage: trainPackFailureMessage(keepLockedOnFail),
          attemptsMade: attempt.attempt,
          updatedAt: new Date(),
        })
        .where(eq(generationJobs.id, job.id));
      await restorePackAfterTrainFailure({
        packId: pack.id,
        keepLocked: keepLockedOnFail,
        previousProviderJobId: previousTrainProviderJobId(job.inputJson),
        failedProviderJobId: result.providerJobId,
      });
      jobLog("trainPack.provider_failed", {
        jobId: job.id,
        packId: pack.id,
        provider: result.provider,
        providerJobId: result.providerJobId,
        keepLocked: keepLockedOnFail,
        code: errorCode,
      });
      return;
    }

    if (shouldContinuePolling(result.status)) {
      const nextAttempt = pollAttempt + 1;
      if (nextAttempt > TRAIN_POLL_MAX_ATTEMPTS) {
        throw new JobError({
          code: JOB_ERROR_CODES.TRAIN_POLL_TIMEOUT,
          retryable: false,
        });
      }
      await db
        .update(generationJobs)
        .set({
          status: "running",
          providerJobId: result.providerJobId,
          errorCode: null,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(generationJobs.id, job.id));
      await db
        .update(characterPacks)
        .set({
          status: "training",
          providerJobId: result.providerJobId,
          updatedAt: new Date(),
        })
        .where(eq(characterPacks.id, pack.id));
      await enqueueTrainPackJob({
        generationJobId: job.id,
        characterPackId: pack.id,
        attempt: nextAttempt,
      });
      jobLog("trainPack.poll_scheduled", {
        jobId: job.id,
        packId: pack.id,
        providerJobId: result.providerJobId,
        pollAttempt: nextAttempt,
        delayMs: trainPollDelayMs(nextAttempt),
      });
      return;
    }

    const artifact = await persistAdapterPointer({
      packUserId: pack.userId,
      packId: pack.id,
      providerJobId: result.providerJobId,
      result,
    });

    await db
      .update(characterPacks)
      .set({
        status: "locked",
        lockedAt: pack.lockedAt ?? new Date(),
        trainedAt: new Date(),
        providerJobId: result.providerJobId,
        adapterStorageKey: artifact.storageKey,
        adapterMimeType: artifact.mimeType,
        adapterMeta: artifact.meta,
        updatedAt: new Date(),
      })
      .where(eq(characterPacks.id, pack.id));

    await markJobSucceeded({
      jobId: job.id,
      providerJobId: result.providerJobId,
      resultAssetKey: artifact.storageKey,
    });
    jobLog("trainPack.succeeded", {
      jobId: job.id,
      packId: pack.id,
      provider: result.provider,
      providerJobId: result.providerJobId,
    });
  } catch (err) {
    await finalizeWorkerError({
      jobId: job.id,
      kind: "train_pack",
      err,
      attempt,
      packId: characterPackId,
      keepLockedOnFail,
      previousProviderJobId: previousTrainProviderJobId(job.inputJson),
      providerJobId: job.providerJobId,
    });
  }
}
