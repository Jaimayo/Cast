import { eq } from "drizzle-orm";
import { characterPacks, generationJobs, mediaAssets, recipes } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { shouldFallbackGenerateStill } from "@/lib/generate-fallback";
import { assertGenerateStillAllowed } from "@/lib/generate-policy";
import {
  JOB_ERROR_CODES,
  JobError,
  generateSubmitDecision,
  isSubmitAttempted,
  withSubmitAttempted,
  type JobAttempt,
} from "@/lib/job-errors";
import { jobLog } from "@/lib/job-log";
import { compileComposerPrompt, compileStarterPrompt } from "@/lib/prompt-compiler";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import {
  existingMediaForJob,
  finalizeWorkerError,
  loadGenerationJob,
  markJobRunning,
  markJobSucceeded,
  persistProviderJobId,
} from "@/server/jobs";
import {
  generatePollDecision,
  generateStillHasImage,
} from "@/server/providers/generate-output";
import {
  generateStillFallbackAdapter,
  getGenerateStillAdapterForPack,
} from "@/server/providers/registry";
import type { GenerateStillAdapter, GenerateStillResult } from "@/server/providers/types";
import { enqueueGenerateStillPollJob } from "@/server/queue";
import { mediaKey, putObject } from "@/server/storage";

function extFor(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  return "webp";
}

function generateFailCode(code: string): (typeof JOB_ERROR_CODES)[keyof typeof JOB_ERROR_CODES] {
  if (code === JOB_ERROR_CODES.GENERATE_NO_IMAGE) return JOB_ERROR_CODES.GENERATE_NO_IMAGE;
  if (code === JOB_ERROR_CODES.GENERATE_POLL_TIMEOUT) return JOB_ERROR_CODES.GENERATE_POLL_TIMEOUT;
  return JOB_ERROR_CODES.GENERATE_STILL_FAILED;
}

export async function processGenerateStillJob(
  generationJobId: string,
  attempt: JobAttempt = { attempt: 1, maxAttempts: 1 },
  pollAttempt = 0,
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

  await markJobRunning(job.id);

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

    const adapter = getGenerateStillAdapterForPack(pack);
    jobLog("generateStill.start", {
      jobId: job.id,
      kind: job.kind,
      packId: pack.id,
      provider: adapter.name,
      providerMode: getEnv().providerMode,
      pollAttempt,
      attempt: attempt.attempt,
      maxAttempts: attempt.maxAttempts,
      hasAdapter: Boolean(pack.adapterStorageKey),
      hasProviderJobId: Boolean(job.providerJobId),
    });

    const result = await submitOrPollGenerate({
      jobId: job.id,
      inputJson: job.inputJson,
      providerJobId: job.providerJobId,
      adapter,
      prompt,
      negativePrompt,
      characterPackId: pack.id,
      adapterStorageKey: pack.adapterStorageKey,
      adapterMeta: pack.adapterMeta,
    });

    if (result.providerJobId && result.providerJobId !== job.providerJobId) {
      await persistProviderJobId(job.id, result.providerJobId);
    }

    const decision = generatePollDecision({
      status: result.status,
      attempt: pollAttempt,
      errorCode: result.errorCode,
    });

    if (decision.action === "fail") {
      throw new JobError({
        code: generateFailCode(decision.errorCode),
        retryable: false,
      });
    }
    if (decision.action === "timeout") {
      throw new JobError({ code: JOB_ERROR_CODES.GENERATE_POLL_TIMEOUT, retryable: false });
    }
    if (decision.action === "poll") {
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
      await enqueueGenerateStillPollJob({
        generationJobId: job.id,
        attempt: decision.nextAttempt,
      });
      jobLog("generateStill.poll_scheduled", {
        jobId: job.id,
        kind: job.kind,
        packId: pack.id,
        providerJobId: result.providerJobId,
        pollAttempt: decision.nextAttempt,
      });
      return;
    }

    if (!generateStillHasImage(result) || !result.imageBytes || !result.mimeType) {
      throw new JobError({ code: JOB_ERROR_CODES.GENERATE_NO_IMAGE, retryable: false });
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
      const mediaKind = job.kind === "generate_starter" ? "starter" : "still";
      try {
        await db.insert(mediaAssets).values({
          userId: job.userId,
          kind: mediaKind,
          storageKey: key,
          mimeType: result.mimeType,
          byteSize: result.imageBytes.byteLength,
          generationJobId: job.id,
          characterPackId: pack.id,
        });
      } catch (err) {
        if (!isUniqueViolation(err)) {
          throw err;
        }
        jobLog("generateStill.skip_duplicate_media", {
          jobId: job.id,
          kind: job.kind,
          attempt: attempt.attempt,
        });
      }
    }

    await markJobSucceeded({
      jobId: job.id,
      resultAssetKey: key,
      providerJobId: result.providerJobId,
    });
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

async function submitOrPollGenerate(input: {
  jobId: string;
  inputJson: Record<string, unknown>;
  providerJobId: string | null;
  adapter: GenerateStillAdapter;
  prompt: string;
  negativePrompt: string;
  characterPackId: string;
  adapterStorageKey: string | null;
  adapterMeta: Record<string, unknown> | null;
}): Promise<GenerateStillResult> {
  const submit = generateSubmitDecision({
    providerJobId: input.providerJobId,
    submitAttempted: isSubmitAttempted(input.inputJson),
  });

  if (submit === "fail-in-flight") {
    throw new JobError({ code: JOB_ERROR_CODES.GENERATE_SUBMIT_IN_FLIGHT, retryable: false });
  }

  const generateInput = {
    jobId: input.jobId,
    prompt: input.prompt,
    negativePrompt: input.negativePrompt,
    characterPackId: input.characterPackId,
    adapterStorageKey: input.adapterStorageKey,
    adapterMeta: input.adapterMeta,
  };

  if (submit === "poll") {
    if (!input.adapter.getGenerateStatus || !input.providerJobId) {
      throw new JobError({ code: JOB_ERROR_CODES.GENERATE_SUBMIT_IN_FLIGHT, retryable: false });
    }
    return input.adapter.getGenerateStatus(input.providerJobId);
  }

  if (input.adapter.getGenerateStatus) {
    await markGenerateSubmitAttempted(input.jobId, input.inputJson);
  }

  try {
    return await input.adapter.generateStill(generateInput);
  } catch (err) {
    const fallback = generateStillFallbackAdapter();
    const canFallback =
      Boolean(fallback) &&
      shouldFallbackGenerateStill({
        primaryAdapterName: input.adapter.name,
        err,
        hasProviderJobId: Boolean(input.providerJobId),
      });
    if (!fallback || !canFallback) {
      throw err;
    }
    jobLog("generateStill.fallback", {
      jobId: input.jobId,
      fromProvider: input.adapter.name,
      toProvider: fallback.name,
    });
    if (fallback.getGenerateStatus) {
      await markGenerateSubmitAttempted(input.jobId, input.inputJson);
    }
    return fallback.generateStill(generateInput);
  }
}

async function markGenerateSubmitAttempted(jobId: string, inputJson: Record<string, unknown>): Promise<void> {
  if (isSubmitAttempted(inputJson)) {
    return;
  }
  await getDb()
    .update(generationJobs)
    .set({
      inputJson: withSubmitAttempted(inputJson),
      updatedAt: new Date(),
    })
    .where(eq(generationJobs.id, jobId));
}
