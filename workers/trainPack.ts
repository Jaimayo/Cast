import { eq } from "drizzle-orm";
import { characterPacks, generationJobs, mediaAssets, trainingSetAssets } from "@/db/schema";
import { getDb } from "@/server/db";
import { getTrainPackAdapter } from "@/server/providers/registry";
import { ProviderNotConfiguredError } from "@/server/providers/types";

export async function processTrainPackJob(generationJobId: string, characterPackId: string): Promise<void> {
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
    const result = await adapter.trainPack({
      jobId: job.id,
      characterPackId: pack.id,
      name: pack.name,
      referenceKeys: refs.map((row) => row.storageKey),
    });

    const packStatus = result.status === "succeeded" ? "locked" : "training";
    await db
      .update(characterPacks)
      .set({
        status: packStatus,
        lockedAt: result.status === "succeeded" ? new Date() : pack.lockedAt,
        trainedAt: result.status === "succeeded" ? new Date() : pack.trainedAt,
        providerJobId: result.providerJobId,
        updatedAt: new Date(),
      })
      .where(eq(characterPacks.id, pack.id));

    await db
      .update(generationJobs)
      .set({
        status: result.status === "succeeded" ? "succeeded" : "running",
        providerJobId: result.providerJobId,
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
