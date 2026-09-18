import { eq } from "drizzle-orm";
import { characterPacks, generationJobs, mediaAssets, trainingSetAssets } from "@/db/schema";
import { JobError, JOB_ERROR_CODES, keepLockedAfterTrainFail, trainPackFailureMessage, type JobAttempt } from "@/lib/job-errors";
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
import { getTrainPackAdapter } from "@/server/providers/registry";
import {
  shouldContinuePolling,
  TRAIN_POLL_MAX_ATTEMPTS,
  trainPollDelayMs,
} from "@/server/providers/train-status";
import { type TrainPackResult } from "@/server/providers/types";
import { TRAIN_PACK_JOB_OPTIONS, getTrainPackQueue } from "@/server/queue";
import { mediaKey, putObject } from "@/server/storage";

async function persistAdapterPointer(input: {
  packUserId: string;
  packId: string;
  providerJobId: string;
  result: TrainPackResult;
}): Promise<{ storageKey: string; mimeType: string; meta: Record<string, unknown> }> {
  let mimeType = input.result.adapterMimeType ?? "application/octet-stream";
  const storageKey =
    input.result.adapterStorageKey ??
    mediaKey({
      kind: "adapters",
      userId: input.packUserId,
      id: input.packId,
      ext: input.result.adapterBytesBase64 ? "lora" : "json",
    });

  if (input.result.adapterBytesBase64) {
    await putObject({
      key: storageKey,
      body: Buffer.from(input.result.adapterBytesBase64, "base64"),
      mimeType,
    });
  } else if (input.result.provider === "stub") {
    await putObject({
      key: storageKey,
      body: Buffer.from("stub-lora-adapter"),
      mimeType,
    });
  } else if (!input.result.adapterStorageKey) {
    mimeType = "application/json";
    await putObject({
      key: storageKey,
      body: Buffer.from(
        JSON.stringify({
          provider: input.result.provider,
          providerJobId: input.providerJobId,
          sourceUrl: input.result.adapterMeta?.sourceUrl ?? null,
        }),
      ),
      mimeType,
    });
  }

  return {
    storageKey,
    mimeType,
    meta: {
      ...(input.result.adapterMeta ?? {}),
      provider: input.result.provider,
      providerJobId: input.providerJobId,
    },
  };
}

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

  await markJobRunning(job.id);

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

    // Resume this job only — never reuse a prior pack train id (Retrain starts a new RunPod job).
    const existingProviderJobId = job.providerJobId;
    let result: TrainPackResult;
    if (existingProviderJobId && adapter.getTrainStatus) {
      result = await adapter.getTrainStatus(existingProviderJobId);
    } else {
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
      await db
        .update(generationJobs)
        .set({
          status: "failed",
          providerJobId: result.providerJobId,
          errorCode: JOB_ERROR_CODES.TRAIN_PACK_FAILED,
          errorMessage: trainPackFailureMessage(keepLockedOnFail),
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
      await getTrainPackQueue().add(
        "trainPack",
        { generationJobId: job.id, characterPackId: pack.id, attempt: nextAttempt },
        { ...TRAIN_PACK_JOB_OPTIONS, delay: trainPollDelayMs(nextAttempt) },
      );
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
