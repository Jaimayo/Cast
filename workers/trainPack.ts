import { eq } from "drizzle-orm";
import { characterPacks, generationJobs, mediaAssets, trainingSetAssets } from "@/db/schema";
import { getDb } from "@/server/db";
import { getTrainPackAdapter } from "@/server/providers/registry";
import {
  shouldContinuePolling,
  TRAIN_POLL_MAX_ATTEMPTS,
  trainPollDelayMs,
} from "@/server/providers/train-status";
import { ProviderNotConfiguredError, type TrainPackResult } from "@/server/providers/types";
import { getTrainPackQueue } from "@/server/queue";
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
  attempt = 0,
): Promise<void> {
  const db = getDb();
  const jobRows = await db.select().from(generationJobs).where(eq(generationJobs.id, generationJobId)).limit(1);
  const job = jobRows[0];
  if (!job) {
    throw new Error(`Job ${generationJobId} not found`);
  }

  await db
    .update(generationJobs)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(generationJobs.id, job.id));

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

    const refs = await db
      .select({ storageKey: mediaAssets.storageKey })
      .from(trainingSetAssets)
      .innerJoin(mediaAssets, eq(mediaAssets.id, trainingSetAssets.mediaAssetId))
      .where(eq(trainingSetAssets.characterPackId, pack.id));

    const adapter = getTrainPackAdapter();
    const existingProviderJobId = job.providerJobId ?? pack.providerJobId;
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
    }

    if (result.status === "failed") {
      await db
        .update(generationJobs)
        .set({
          status: "failed",
          providerJobId: result.providerJobId,
          errorCode: result.errorCode ?? "TRAIN_PACK_FAILED",
          updatedAt: new Date(),
        })
        .where(eq(generationJobs.id, job.id));
      await db
        .update(characterPacks)
        .set({ status: "failed", providerJobId: result.providerJobId, updatedAt: new Date() })
        .where(eq(characterPacks.id, pack.id));
      return;
    }

    if (shouldContinuePolling(result.status)) {
      const nextAttempt = attempt + 1;
      if (nextAttempt > TRAIN_POLL_MAX_ATTEMPTS) {
        throw new Error("Train pack polling timed out");
      }
      await db
        .update(generationJobs)
        .set({
          status: "running",
          providerJobId: result.providerJobId,
          errorCode: null,
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
        { delay: trainPollDelayMs(nextAttempt) },
      );
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

    await db
      .update(generationJobs)
      .set({
        status: "succeeded",
        providerJobId: result.providerJobId,
        resultAssetKey: artifact.storageKey,
        errorCode: null,
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, job.id));
  } catch (err) {
    const code = err instanceof ProviderNotConfiguredError ? err.code : "TRAIN_PACK_FAILED";
    await db
      .update(generationJobs)
      .set({ status: "failed", errorCode: code, updatedAt: new Date() })
      .where(eq(generationJobs.id, job.id));
    await db
      .update(characterPacks)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(characterPacks.id, characterPackId));
    throw err;
  }
}
