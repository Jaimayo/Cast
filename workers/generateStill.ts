import { eq } from "drizzle-orm";
import { characterPacks, generationJobs, mediaAssets, recipes } from "@/db/schema";
import { compileComposerPrompt, compileStarterPrompt } from "@/lib/prompt-compiler";
import { getDb } from "@/server/db";
import {
  generateStillFallbackAdapter,
  getGenerateStillAdapter,
} from "@/server/providers/registry";
import { ProviderNotConfiguredError } from "@/server/providers/types";
import { mediaKey, putObject } from "@/server/storage";

function extFor(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  return "webp";
}

export async function processGenerateStillJob(generationJobId: string): Promise<void> {
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

    const adapter = getGenerateStillAdapter();
    let result;
    try {
      result = await adapter.generateStill({
        jobId: job.id,
        prompt,
        negativePrompt,
        characterPackId: pack.id,
      });
    } catch (err) {
      const fallback = generateStillFallbackAdapter();
      const canFallback =
        Boolean(fallback) &&
        adapter.name === "venice" &&
        (err instanceof ProviderNotConfiguredError || err instanceof Error);
      if (!fallback || !canFallback) {
        throw err;
      }
      result = await fallback.generateStill({
        jobId: job.id,
        prompt,
        negativePrompt,
        characterPackId: pack.id,
      });
    }

    const key = mediaKey({
      kind: job.kind === "generate_starter" ? "starter" : "still",
      userId: job.userId,
      id: job.id,
      ext: extFor(result.mimeType),
    });
    await putObject({ key, body: result.imageBytes, mimeType: result.mimeType });

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

    await db
      .update(generationJobs)
      .set({
        status: "succeeded",
        resultAssetKey: key,
        providerJobId: result.providerJobId,
        errorCode: null,
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, job.id));
  } catch (err) {
    const code = err instanceof ProviderNotConfiguredError ? err.code : "GENERATE_STILL_FAILED";
    await db
      .update(generationJobs)
      .set({
        status: "failed",
        errorCode: code,
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, job.id));
    throw err;
  }
}
