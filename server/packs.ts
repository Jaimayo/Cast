import { createHash } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  characterPacks,
  generationJobs,
  mediaAssets,
  recipes,
  trainingSetAssets,
  type CharacterPack,
} from "@/db/schema";
import { PACK_TARGET_REFS } from "@/lib/constants";
import { generateStillJobProvider } from "@/lib/generate-route";
import { canEnqueueRetrainPack, canEnqueueTrainPack, canLockDraftPack, canLockPack, lockWarning, TRAIN_ALREADY_RUNNING } from "@/lib/pack-rules";
import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import { compileComposerPrompt, compileStarterPrompt } from "@/lib/prompt-compiler";
import { requireStarterPreset } from "@/lib/starters";
import { requireLockedSoulForGenerate } from "@/lib/soul";
import { TEST_GRID_SELECTIONS } from "@/lib/test-grid";
import { assertGenerateStillAllowed } from "@/lib/generate-policy";
import { publicJob, publicMediaAsset, publicPack } from "@/lib/media";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { recoverStaleJobsSafe } from "@/server/jobs";
import { enqueueGenerateStillJob, enqueueTrainPackJob } from "@/server/queue";

function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

function providerForGenerate(adapterStorageKey?: string | null): "venice" | "runpod" | "sister" {
  const env = getEnv();
  return generateStillJobProvider({
    providerMode: env.providerMode,
    generateStillProvider: env.generateStillProvider,
    adapterStorageKey,
  });
}

function providerForTrain(): "runpod" | "sister" {
  return getEnv().trainPackProvider === "sister" ? "sister" : "runpod";
}

export async function listPacks(userId: string) {
  await recoverStaleJobsSafe({ userId });
  const db = getDb();
  const packs = await db
    .select()
    .from(characterPacks)
    .where(eq(characterPacks.userId, userId))
    .orderBy(desc(characterPacks.createdAt));
  if (packs.length === 0) {
    return [];
  }
  const counts = await db
    .select({
      packId: trainingSetAssets.characterPackId,
      n: sql<number>`count(*)::int`,
    })
    .from(trainingSetAssets)
    .where(eq(trainingSetAssets.userId, userId))
    .groupBy(trainingSetAssets.characterPackId);
  const byPack = new Map(counts.map((row) => [row.packId, Number(row.n)]));
  return packs.map((pack) => publicPack({ ...pack, refCount: byPack.get(pack.id) ?? 0 }));
}

export async function getPack(userId: string, packId: string): Promise<CharacterPack | null> {
  await recoverStaleJobsSafe({ userId, packId });
  const db = getDb();
  const rows = await db
    .select()
    .from(characterPacks)
    .where(and(eq(characterPacks.id, packId), eq(characterPacks.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createPack(input: {
  userId: string;
  name: string;
  origin: "generate_then_lock" | "library_train";
}) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Pack name is required");
  }
  const db = getDb();
  const rows = await db
    .insert(characterPacks)
    .values({
      userId: input.userId,
      name,
      origin: input.origin,
      fictionalAttestation: true,
    })
    .returning();
  const pack = rows[0];
  if (!pack) {
    throw new Error("Failed to create pack");
  }
  return pack;
}

export async function countRefs(packId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: trainingSetAssets.id })
    .from(trainingSetAssets)
    .where(eq(trainingSetAssets.characterPackId, packId));
  return rows.length;
}

export async function setRefSelected(input: {
  userId: string;
  packId: string;
  mediaAssetId: string;
  selected: boolean;
  kind: "face_ref" | "body_ref" | "still" | "starter_face" | "starter_body";
  source: "in_app_still" | "generate_starter";
  starterPresetId?: string;
}) {
  const pack = await getPack(input.userId, input.packId);
  if (!pack) {
    throw new Error("Pack not found");
  }
  if (pack.status !== "draft" && pack.status !== "failed") {
    throw new Error("Refs can only be changed on a draft pack");
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(trainingSetAssets)
    .where(
      and(
        eq(trainingSetAssets.characterPackId, pack.id),
        eq(trainingSetAssets.mediaAssetId, input.mediaAssetId),
      ),
    )
    .limit(1);

  if (!input.selected) {
    if (existing[0]) {
      await db.delete(trainingSetAssets).where(eq(trainingSetAssets.id, existing[0].id));
    }
    return { selected: false, refCount: await countRefs(pack.id) };
  }

  const current = await countRefs(pack.id);
  if (existing[0]) {
    return { selected: true, ref: existing[0], refCount: current };
  }
  if (current >= PACK_TARGET_REFS) {
    throw new Error(`Pack already has the target of ${PACK_TARGET_REFS} refs`);
  }

  const media = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, input.mediaAssetId), eq(mediaAssets.userId, input.userId)))
    .limit(1);
  if (!media[0]) {
    throw new Error("Media asset not found");
  }

  const rows = await db
    .insert(trainingSetAssets)
    .values({
      characterPackId: pack.id,
      userId: input.userId,
      mediaAssetId: input.mediaAssetId,
      kind: input.kind,
      source: input.source,
      starterPresetId: input.starterPresetId ?? null,
    })
    .returning();
  return { selected: true, ref: rows[0], refCount: current + 1 };
}

export async function lockPack(userId: string, packId: string) {
  const pack = await getPack(userId, packId);
  if (!pack) {
    throw new Error("Pack not found");
  }
  const lockState = canLockDraftPack(pack.status);
  if (!lockState.ok) {
    throw new JobError({
      code: JOB_ERROR_CODES.INVALID_PACK_STATE,
      userMessage: lockState.message,
      retryable: false,
    });
  }
  const refs = await countRefs(pack.id);
  const gate = canLockPack(refs);
  if (!gate.ok) {
    throw new Error(gate.message);
  }

  const db = getDb();
  const rows = await db
    .update(characterPacks)
    .set({ status: "locked", lockedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(characterPacks.id, pack.id), eq(characterPacks.status, "draft")))
    .returning();
  const locked = rows[0];
  if (!locked) {
    throw new JobError({
      code: JOB_ERROR_CODES.INVALID_PACK_STATE,
      userMessage: TRAIN_ALREADY_RUNNING,
      retryable: false,
    });
  }
  return { pack: locked, warning: lockWarning(refs), refCount: refs };
}

export async function enqueueGenerateStill(input: {
  userId: string;
  characterPackId: string;
  poseChipId: string;
  outfitChipId?: string | null;
  sceneChipId?: string | null;
  lightingChipId?: string | null;
  bodyChipId?: string | null;
  source?: "composer" | "test_grid";
}) {
  const pack = await getPack(input.userId, input.characterPackId);
  if (!pack) {
    throw new Error("Character pack is required");
  }
  assertGenerateStillAllowed({ packStatus: pack.status, poseChipId: input.poseChipId });

  const compiled = compileComposerPrompt({
    characterPackName: pack.name,
    characterPackId: pack.id,
    poseChipId: input.poseChipId,
    outfitChipId: input.outfitChipId,
    sceneChipId: input.sceneChipId,
    lightingChipId: input.lightingChipId,
    bodyChipId: input.bodyChipId,
  });

  const db = getDb();
  const recipeRows = await db
    .insert(recipes)
    .values({
      userId: input.userId,
      characterPackId: pack.id,
      poseChipId: input.poseChipId,
      outfitChipId: input.outfitChipId ?? null,
      sceneChipId: input.sceneChipId ?? null,
      lightingChipId: input.lightingChipId ?? null,
      bodyChipId: input.bodyChipId ?? null,
      compiledPromptHash: hashPrompt(compiled.prompt),
    })
    .returning();
  const recipe = recipeRows[0];
  if (!recipe) {
    throw new Error("Failed to save recipe");
  }

  const jobRows = await db
    .insert(generationJobs)
    .values({
      userId: input.userId,
      kind: "generate_still",
      status: "queued",
      provider: providerForGenerate(pack.adapterStorageKey),
      characterPackId: pack.id,
      recipeId: recipe.id,
      inputJson: {
        poseChipId: input.poseChipId,
        outfitChipId: input.outfitChipId ?? null,
        sceneChipId: input.sceneChipId ?? null,
        lightingChipId: input.lightingChipId ?? null,
        bodyChipId: input.bodyChipId ?? null,
        source: input.source ?? "composer",
      },
    })
    .returning();
  const job = jobRows[0];
  if (!job) {
    throw new Error("Failed to create job");
  }

  await enqueueGenerateStillJob(job.id);
  return { job, recipeId: recipe.id };
}

export async function enqueueGenerateStarter(input: {
  userId: string;
  characterPackId: string;
  presetId: string;
}) {
  const pack = await getPack(input.userId, input.characterPackId);
  if (!pack) {
    throw new Error("Character pack is required");
  }
  if (pack.status !== "draft") {
    throw new Error("Starters can only be added to a draft pack");
  }

  const preset = requireStarterPreset(input.presetId);
  compileStarterPrompt({
    characterPackName: pack.name,
    characterPackId: pack.id,
    presetId: preset.id,
  });

  const db = getDb();
  const jobRows = await db
    .insert(generationJobs)
    .values({
      userId: input.userId,
      kind: "generate_starter",
      status: "queued",
      provider: providerForGenerate(pack.adapterStorageKey),
      characterPackId: pack.id,
      inputJson: { presetId: preset.id, kind: preset.kind },
    })
    .returning();
  const job = jobRows[0];
  if (!job) {
    throw new Error("Failed to create starter job");
  }

  await enqueueGenerateStillJob(job.id);
  return { job, preset };
}

export async function enqueueTrainPack(userId: string, packId: string) {
  const pack = await getPack(userId, packId);
  if (!pack) {
    throw new Error("Pack not found");
  }
  const trainState = canEnqueueTrainPack(pack.status);
  if (!trainState.ok) {
    throw new JobError({
      code: JOB_ERROR_CODES.INVALID_PACK_STATE,
      userMessage: trainState.message,
      retryable: false,
    });
  }
  const refs = await countRefs(pack.id);
  const gate = canLockPack(refs);
  if (!gate.ok) {
    throw new Error(gate.message);
  }

  const db = getDb();
  const flipped = await db
    .update(characterPacks)
    .set({ status: "training", updatedAt: new Date() })
    .where(
      and(eq(characterPacks.id, pack.id), inArray(characterPacks.status, ["draft", "failed"])),
    )
    .returning();
  if (!flipped[0]) {
    throw new JobError({
      code: JOB_ERROR_CODES.INVALID_PACK_STATE,
      userMessage: TRAIN_ALREADY_RUNNING,
      retryable: false,
    });
  }

  const jobRows = await db
    .insert(generationJobs)
    .values({
      userId,
      kind: "train_pack",
      status: "queued",
      provider: providerForTrain(),
      characterPackId: pack.id,
      inputJson: { refCount: refs },
    })
    .returning();
  const job = jobRows[0];
  if (!job) {
    throw new Error("Failed to create train job");
  }

  await enqueueTrainPackJob({
    generationJobId: job.id,
    characterPackId: pack.id,
  });
  return job;
}

export async function enqueueTestGrid(userId: string, packId: string) {
  const pack = await getPack(userId, packId);
  if (!pack) {
    throw new Error("Pack not found");
  }
  requireLockedSoulForGenerate(pack.status);

  const jobs = [];
  for (const selection of TEST_GRID_SELECTIONS) {
    const result = await enqueueGenerateStill({
      userId,
      characterPackId: pack.id,
      poseChipId: selection.poseChipId,
      outfitChipId: selection.outfitChipId,
      sceneChipId: selection.sceneChipId,
      lightingChipId: selection.lightingChipId,
      source: "test_grid",
    });
    jobs.push(result.job);
  }
  return { jobs, count: jobs.length };
}

export async function enqueueRetrainPack(userId: string, packId: string) {
  const pack = await getPack(userId, packId);
  if (!pack) {
    throw new Error("Pack not found");
  }
  const retrainState = canEnqueueRetrainPack(pack.status);
  if (!retrainState.ok) {
    throw new JobError({
      code: JOB_ERROR_CODES.INVALID_PACK_STATE,
      userMessage: retrainState.message,
      retryable: false,
    });
  }
  const refs = await countRefs(pack.id);
  const gate = canLockPack(refs);
  if (!gate.ok) {
    throw new Error(gate.message);
  }

  const db = getDb();
  const flipped = await db
    .update(characterPacks)
    .set({ status: "training", updatedAt: new Date() })
    .where(
      and(eq(characterPacks.id, pack.id), inArray(characterPacks.status, ["locked", "ready"])),
    )
    .returning();
  if (!flipped[0]) {
    throw new JobError({
      code: JOB_ERROR_CODES.INVALID_PACK_STATE,
      userMessage: TRAIN_ALREADY_RUNNING,
      retryable: false,
    });
  }

  const jobRows = await db
    .insert(generationJobs)
    .values({
      userId,
      kind: "train_pack",
      status: "queued",
      provider: providerForTrain(),
      characterPackId: pack.id,
      inputJson: {
        refCount: refs,
        retrain: true,
        previousProviderJobId: pack.providerJobId,
      },
    })
    .returning();
  const job = jobRows[0];
  if (!job) {
    throw new Error("Failed to create retrain job");
  }

  await enqueueTrainPackJob({
    generationJobId: job.id,
    characterPackId: pack.id,
  });
  return job;
}

export async function listJobs(userId: string) {
  await recoverStaleJobsSafe({ userId });
  const db = getDb();
  const jobs = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.userId, userId))
    .orderBy(desc(generationJobs.createdAt));
  return attachJobPreviews(userId, jobs);
}

export async function getJob(userId: string, jobId: string) {
  await recoverStaleJobsSafe({ userId });
  const db = getDb();
  const rows = await db
    .select()
    .from(generationJobs)
    .where(and(eq(generationJobs.id, jobId), eq(generationJobs.userId, userId)))
    .limit(1);
  const job = rows[0];
  if (!job) {
    return null;
  }
  const [withPreview] = await attachJobPreviews(userId, [job]);
  return withPreview ?? publicJob({ ...job, previewUrl: null });
}

async function attachJobPreviews<T extends { id: string; kind: string; resultAssetKey?: string | null }>(
  userId: string,
  jobs: T[],
): Promise<Array<Omit<T, "resultAssetKey"> & { previewUrl: string | null }>> {
  if (jobs.length === 0) {
    return [];
  }
  const db = getDb();
  const media = await db
    .select({ id: mediaAssets.id, generationJobId: mediaAssets.generationJobId })
    .from(mediaAssets)
    .where(eq(mediaAssets.userId, userId));
  const byJob = new Map<string, string>();
  for (const row of media) {
    if (row.generationJobId) {
      byJob.set(row.generationJobId, row.id);
    }
  }
  return jobs.map((job) =>
    publicJob({
      ...job,
      previewUrl: job.kind === "train_pack" ? null : (byJob.has(job.id) ? publicMediaAsset({ id: byJob.get(job.id)! }).previewUrl : null),
    }),
  );
}

export async function listRefs(userId: string, packId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: trainingSetAssets.id,
      kind: trainingSetAssets.kind,
      source: trainingSetAssets.source,
      starterPresetId: trainingSetAssets.starterPresetId,
      mediaAssetId: trainingSetAssets.mediaAssetId,
      createdAt: trainingSetAssets.createdAt,
    })
    .from(trainingSetAssets)
    .innerJoin(mediaAssets, eq(mediaAssets.id, trainingSetAssets.mediaAssetId))
    .where(and(eq(trainingSetAssets.characterPackId, packId), eq(trainingSetAssets.userId, userId)));
  return rows.map((row) => ({
    ...row,
    previewUrl: publicMediaAsset({ id: row.mediaAssetId }).previewUrl,
  }));
}

export async function listStarterSheet(userId: string, packId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: mediaAssets.id,
      kind: mediaAssets.kind,
      generationJobId: mediaAssets.generationJobId,
      createdAt: mediaAssets.createdAt,
      inputJson: generationJobs.inputJson,
    })
    .from(mediaAssets)
    .leftJoin(generationJobs, eq(generationJobs.id, mediaAssets.generationJobId))
    .where(
      and(
        eq(mediaAssets.userId, userId),
        eq(mediaAssets.characterPackId, packId),
        eq(mediaAssets.kind, "starter"),
      ),
    )
    .orderBy(desc(mediaAssets.createdAt));

  const selected = await db
    .select({ mediaAssetId: trainingSetAssets.mediaAssetId })
    .from(trainingSetAssets)
    .where(eq(trainingSetAssets.characterPackId, packId));
  const selectedIds = new Set(selected.map((row) => row.mediaAssetId));

  return rows.map((row) => {
    const presetId = typeof row.inputJson?.presetId === "string" ? row.inputJson.presetId : null;
    const vibeKind = row.inputJson?.kind === "body" ? "body" : "face";
    const preview = publicMediaAsset({ id: row.id });
    return {
      id: preview.id,
      createdAt: row.createdAt,
      presetId,
      vibeKind,
      selected: selectedIds.has(row.id),
      previewUrl: preview.previewUrl,
      previewExpiresInSeconds: preview.previewExpiresInSeconds,
    };
  });
}

export async function listLibraryStills(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.userId, userId), eq(mediaAssets.kind, "still")))
    .orderBy(desc(mediaAssets.createdAt));
  return rows.map((row) => publicMediaAsset(row));
}
