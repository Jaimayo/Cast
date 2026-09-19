import { eq } from "drizzle-orm";
import { characterPacks, mediaAssets, recipes } from "@/db/schema";
import { hasReadySoulAdapter } from "@/lib/adapter-identity";
import { compileComposerPrompt, compileStarterPrompt } from "@/lib/prompt-compiler";
import { assertGenerateStillAllowed } from "@/lib/generate-policy";
import { stillGenerateSize } from "@/lib/still-aspect";
import { jobLog } from "@/lib/job-log";
import { generateStillWorkDecision, shouldPersistGenerateStillResult } from "@/lib/job-cancel";
import { generateMissingAdapter, type JobAttempt } from "@/lib/job-errors";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import {
  existingMediaForJob,
  finalizeWorkerError,
  loadGenerationJob,
  markJobRunning,
  markJobSucceeded,
} from "@/server/jobs";
import {
  generateStillFallbackAdapter,
  getGenerateStillAdapterForPack,
  shouldFallbackGenerateStill,
} from "@/server/providers/registry";
import { mediaKey, putObject } from "@/server/storage";

function extFor(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  return "webp";
}

export async function processGenerateStillJob(
  generationJobId: string,
  attempt: JobAttempt = { attempt: 1, maxAttempts: 1 },
): Promise<void> {
  const db = getDb();
  const job = await loadGenerationJob(generationJobId);
  if (!job) {
    throw new Error(`Job ${generationJobId} not found`);
  }

  if (job.status === "succeeded") {
    jobLog("generateStill.skip_succeeded", {
      jobId: job.id,
      kind: job.kind,
      attempt: attempt.attempt,
    });
    return;
  }

  if (generateStillWorkDecision(job.status) === "skip") {
    jobLog("generateStill.skip_canceled", {
      jobId: job.id,
      kind: job.kind,
      status: job.status,
      attempt: attempt.attempt,
    });
    return;
  }

  const existing = await existingMediaForJob(job.id);
  if (existing) {
    await markJobSucceeded({
      jobId: job.id,
      resultAssetKey: existing.storageKey,
      providerJobId: job.providerJobId,
    });
    jobLog("generateStill.skip_existing_media", {
      jobId: job.id,
      kind: job.kind,
      attempt: attempt.attempt,
    });
    return;
  }

  const becameRunning = await markJobRunning(job.id, attempt.attempt);
  if (!becameRunning) {
    jobLog("generateStill.skip_inactive", {
      jobId: job.id,
      kind: job.kind,
      attempt: attempt.attempt,
    });
    return;
  }

  try {
    if (!job.characterPackId) {
      throw new Error("generateStill requires a character pack");
    }
    const packRows = await db
      .select()
      .from(characterPacks)
      .where(eq(characterPacks.id, job.characterPackId))
      .limit(1);
    const pack = packRows[0];
    if (!pack) {
      throw new Error("Character pack not found");
    }

    const missing = generateMissingAdapter({
      kind: job.kind,
      provider: job.provider,
      hasReadyAdapter: hasReadySoulAdapter(pack),
    });
    if (missing) {
      throw missing;
    }

    let prompt: string;
    let negativePrompt: string;
    if (job.kind === "generate_starter") {
      const presetId = String(job.inputJson.presetId ?? "");
      const compiled = compileStarterPrompt({
        characterPackName: pack.name,
        characterPackId: pack.id,
        presetId,
      });
      prompt = compiled.prompt;
      negativePrompt = compiled.negativePrompt;
    } else {
      let poseChipId = String(job.inputJson.poseChipId ?? "");
      let outfitChipId = String(job.inputJson.outfitChipId ?? "");
      let sceneChipId = String(job.inputJson.sceneChipId ?? "");
      let lightingChipId = String(job.inputJson.lightingChipId ?? "");
      let bodyChipId = (job.inputJson.bodyChipId as string | null) ?? null;

      if (job.recipeId) {
        const recipeRows = await db.select().from(recipes).where(eq(recipes.id, job.recipeId)).limit(1);
        const recipe = recipeRows[0];
        if (recipe) {
          poseChipId = recipe.poseChipId;
          outfitChipId = recipe.outfitChipId ?? "";
          sceneChipId = recipe.sceneChipId ?? "";
          lightingChipId = recipe.lightingChipId ?? "";
          bodyChipId = recipe.bodyChipId;
        }
      }

      assertGenerateStillAllowed({ packStatus: pack.status, poseChipId });

      const compiled = compileComposerPrompt({
        characterPackName: pack.name,
        characterPackId: pack.id,
        poseChipId,
        outfitChipId: outfitChipId || null,
        sceneChipId: sceneChipId || null,
        lightingChipId: lightingChipId || null,
        bodyChipId,
      });
      prompt = compiled.prompt;
      negativePrompt = compiled.negativePrompt;
    }

    const stillSize = job.kind === "generate_still" ? stillGenerateSize(job.inputJson) : null;

    const adapter = getGenerateStillAdapterForPack(pack);
    jobLog("generateStill.start", {
      jobId: job.id,
      kind: job.kind,
      packId: pack.id,
      provider: adapter.name,
      providerMode: getEnv().providerMode,
      attempt: attempt.attempt,
      maxAttempts: attempt.maxAttempts,
      hasAdapter: hasReadySoulAdapter(pack),
    });

    let result;
    try {
      result = await adapter.generateStill({
        jobId: job.id,
        prompt,
        negativePrompt,
        characterPackId: pack.id,
        adapterStorageKey: pack.adapterStorageKey,
        adapterMeta: pack.adapterMeta,
        attempt: attempt.attempt,
        ...(stillSize
          ? { width: stillSize.width, height: stillSize.height, aspectRatio: stillSize.aspectRatio }
          : {}),
      });
    } catch (err) {
      const fallback = generateStillFallbackAdapter();
      if (!fallback || !shouldFallbackGenerateStill(adapter.name, err)) {
        throw err;
      }
      jobLog("generateStill.fallback", {
        jobId: job.id,
        fromProvider: adapter.name,
        toProvider: fallback.name,
        attempt: attempt.attempt,
      });
      result = await fallback.generateStill({
        jobId: job.id,
        prompt,
        negativePrompt,
        characterPackId: pack.id,
        adapterStorageKey: pack.adapterStorageKey,
        adapterMeta: pack.adapterMeta,
        attempt: attempt.attempt,
        ...(stillSize
          ? { width: stillSize.width, height: stillSize.height, aspectRatio: stillSize.aspectRatio }
          : {}),
      });
    }

    const latest = await loadGenerationJob(job.id);
    if (!latest || !shouldPersistGenerateStillResult(latest.status)) {
      jobLog("generateStill.discard_canceled", {
        jobId: job.id,
        kind: job.kind,
        status: latest?.status ?? "missing",
        attempt: attempt.attempt,
      });
      return;
    }

    const key = mediaKey({
      kind: job.kind === "generate_starter" ? "starter" : "still",
      userId: job.userId,
      id: job.id,
      ext: extFor(result.mimeType),
    });
    await putObject({ key, body: result.imageBytes, mimeType: result.mimeType });

    const alreadyStored = await existingMediaForJob(job.id);
    if (!alreadyStored) {
      const stillActive = await loadGenerationJob(job.id);
      if (!stillActive || !shouldPersistGenerateStillResult(stillActive.status)) {
        jobLog("generateStill.discard_canceled", {
          jobId: job.id,
          kind: job.kind,
          status: stillActive?.status ?? "missing",
          attempt: attempt.attempt,
        });
        return;
      }
      const mediaKind = job.kind === "generate_starter" ? "starter" : "still";
      await db.insert(mediaAssets).values({
        userId: job.userId,
        kind: mediaKind,
        storageKey: key,
        mimeType: result.mimeType,
        byteSize: result.imageBytes.byteLength,
        generationJobId: job.id,
        characterPackId: pack.id,
      });
    }

    const persisted = await markJobSucceeded({
      jobId: job.id,
      resultAssetKey: key,
      providerJobId: result.providerJobId,
    });
    if (!persisted) {
      jobLog("generateStill.discard_canceled", {
        jobId: job.id,
        kind: job.kind,
        attempt: attempt.attempt,
      });
      return;
    }
    jobLog("generateStill.succeeded", {
      jobId: job.id,
      kind: job.kind,
      packId: pack.id,
      provider: result.provider,
      attempt: attempt.attempt,
    });
  } catch (err) {
    await finalizeWorkerError({
      jobId: job.id,
      kind: job.kind,
      err,
      attempt,
      packId: job.characterPackId,
    });
  }
}
