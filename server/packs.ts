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
import { isUniqueViolation } from "@/lib/db-errors";
import { generateStillJobProvider } from "@/lib/generate-route";
import {
  decideCancelJob,
  isCancelableStillKind,
  jobErrorFromCancelDecision,
} from "@/lib/job-cancel";
import { JOB_ERROR_CODES, JobError, type JobErrorCode } from "@/lib/job-errors";
import {
  readAdapterIdentity,
  snapshotAdapterIdentity,
  trainStartTransition,
} from "@/lib/adapter-identity";
import {
  attachRefDecision,
  generateStarterPackDecision,
  lockPackDecision,
  retrainPackDecision,
  trainPackDecision,
} from "@/lib/pack-rules";
import { compileComposerPrompt, compileStarterPrompt } from "@/lib/prompt-compiler";
import { requireStarterPreset } from "@/lib/starters";
import { requireLockedSoulForGenerate } from "@/lib/soul";
import { TEST_GRID_SELECTIONS, TEST_GRID_SIZE } from "@/lib/test-grid";
import { assertGenerateStillAllowed } from "@/lib/generate-policy";
import { jobLog } from "@/lib/job-log";
import { publicJob, publicMediaAsset, publicPack } from "@/lib/media";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { markJobCanceledIfActive, recoverStaleJobsSafe } from "@/server/jobs";
import { isMemoryPreview } from "@/server/memory-preview";
import { discardGenerateStillJob, enqueueGenerateStillJob, enqueueTrainPackJob } from "@/server/queue";
import { assertUserInFlightCap, consumeUserActionLimit } from "@/server/rate-limit";

type PackDb = Pick<ReturnType<typeof getDb>, "select" | "insert" | "update" | "delete">;

function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

function generateRouteInput(pack: {
  adapterStorageKey?: string | null;
  adapterStatus?: string | null;
  adapterId?: string | null;
}) {
  const env = getEnv();
  return {
    providerMode: env.providerMode,
    generateStillProvider: env.generateStillProvider,
    adapterStorageKey: pack.adapterStorageKey,
    adapterStatus: pack.adapterStatus,
    adapterId: pack.adapterId,
  };
}

function providerForGenerate(pack: {
  adapterStorageKey?: string | null;
  adapterStatus?: string | null;
  adapterId?: string | null;
}): "venice" | "runpod" | "sister" {
  return generateStillJobProvider(generateRouteInput(pack));
}

function providerForTrain(): "runpod" | "sister" {
  return getEnv().trainPackProvider === "sister" ? "sister" : "runpod";
}

async function countInFlightJobs(
  userId: string,
  kind: "generate_still" | "train_pack" | "generate_starter",
): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(generationJobs)
    .where(
      and(
        eq(generationJobs.userId, userId),
        eq(generationJobs.kind, kind),
        inArray(generationJobs.status, ["queued", "running"]),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

async function guardJobEnqueue(
  userId: string,
  action: "generateStill" | "trainPack" | "generateStarter",
  adding = 1,
): Promise<void> {
  const kind =
    action === "generateStill" ? "generate_still" : action === "trainPack" ? "train_pack" : "generate_starter";
  const inFlight = await countInFlightJobs(userId, kind);
  assertUserInFlightCap(action, inFlight, adding);
  await consumeUserActionLimit(action, userId, adding);
}

export async function listPacks(userId: string) {
  if (isMemoryPreview()) {
    return [];
  }
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

function throwPackGate<T extends { ok: true } | { ok: false; code: string; message: string }>(
  gate: T,
): asserts gate is Extract<T, { ok: true }> {
  if (!gate.ok) {
    throw new JobError({
      code: gate.code as JobErrorCode,
      userMessage: gate.message,
      retryable: false,
    });
  }
}

async function countRefsOn(db: PackDb, packId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(trainingSetAssets)
    .where(eq(trainingSetAssets.characterPackId, packId));
  return Number(rows[0]?.n ?? 0);
}

export async function countRefs(packId: string): Promise<number> {
  return countRefsOn(getDb(), packId);
}

async function loadOwnedPackForUpdate(tx: PackDb, userId: string, packId: string) {
  const rows = await tx
    .select()
    .from(characterPacks)
    .where(and(eq(characterPacks.id, packId), eq(characterPacks.userId, userId)))
    .limit(1)
    .for("update");
  const pack = rows[0];
  if (!pack) {
    throw new JobError({ code: JOB_ERROR_CODES.PACK_NOT_FOUND, retryable: false });
  }
  return pack;
}

async function existingRefOn(
  tx: PackDb,
  packId: string,
  mediaAssetId: string,
) {
  const rows = await tx
    .select()
    .from(trainingSetAssets)
    .where(
      and(eq(trainingSetAssets.characterPackId, packId), eq(trainingSetAssets.mediaAssetId, mediaAssetId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

function resolveAttachKind(input: {
  kind: "face_ref" | "body_ref" | "still" | "starter_face" | "starter_body";
  source: "in_app_still" | "generate_starter";
  starterPresetId?: string;
}): {
  kind: "face_ref" | "body_ref" | "still" | "starter_face" | "starter_body";
  starterPresetId: string | null;
} {
  const starterPresetId = input.starterPresetId?.trim() || null;
  if (input.source === "generate_starter" && starterPresetId) {
    const preset = requireStarterPreset(starterPresetId);
    return {
      kind: preset.kind === "body" ? "starter_body" : "starter_face",
      starterPresetId,
    };
  }
  return { kind: input.kind, starterPresetId };
}

function assertMediaMatchesSource(
  mediaKind: string,
  source: "in_app_still" | "generate_starter",
): void {
  const ok =
    (source === "generate_starter" && mediaKind === "starter") ||
    (source === "in_app_still" && (mediaKind === "still" || mediaKind === "pack_ref"));
  if (!ok) {
    throw new JobError({
      code: JOB_ERROR_CODES.INVALID_INPUT,
      userMessage: "That still isn't available to add as a training ref.",
      retryable: false,
    });
  }
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
  await recoverStaleJobsSafe({ userId: input.userId, packId: input.packId });
  const resolved = input.selected ? resolveAttachKind(input) : null;
  const db = getDb();

  try {
    return await db.transaction(async (tx) => {
      const pack = await loadOwnedPackForUpdate(tx, input.userId, input.packId);
      if (pack.status !== "draft" && pack.status !== "failed") {
        throw new JobError({
          code: JOB_ERROR_CODES.INVALID_PACK_STATE,
          userMessage: "Refs can only be changed on a draft pack",
          retryable: false,
        });
      }

      const existing = await existingRefOn(tx, pack.id, input.mediaAssetId);
      const refCount = await countRefsOn(tx, pack.id);
      const decision = attachRefDecision({
        wantSelected: input.selected,
        alreadyAttached: Boolean(existing),
        refCount,
      });

      if (decision.action === "reject") {
        throw new JobError({
          code: JOB_ERROR_CODES.PACK_REFS_FULL,
          userMessage: decision.message,
          retryable: false,
        });
      }

      if (decision.action === "noop-unselected") {
        return { selected: false as const, refCount };
      }
      if (decision.action === "noop-selected") {
        return { selected: true as const, ref: existing!, refCount };
      }

      if (decision.action === "delete") {
        await tx.delete(trainingSetAssets).where(eq(trainingSetAssets.id, existing!.id));
        return { selected: false as const, refCount: Math.max(0, refCount - 1) };
      }

      const media = await tx
        .select()
        .from(mediaAssets)
        .where(and(eq(mediaAssets.id, input.mediaAssetId), eq(mediaAssets.userId, input.userId)))
        .limit(1);
      if (!media[0]) {
        throw new JobError({
          code: JOB_ERROR_CODES.INVALID_INPUT,
          userMessage: "That still isn't available to add as a training ref.",
          retryable: false,
        });
      }
      assertMediaMatchesSource(media[0].kind, input.source);

      const rows = await tx
        .insert(trainingSetAssets)
        .values({
          characterPackId: pack.id,
          userId: input.userId,
          mediaAssetId: input.mediaAssetId,
          kind: resolved!.kind,
          source: input.source,
          starterPresetId: resolved!.starterPresetId,
        })
        .onConflictDoNothing({
          target: [trainingSetAssets.characterPackId, trainingSetAssets.mediaAssetId],
        })
        .returning();

      if (!rows[0]) {
        const raced = await existingRefOn(tx, pack.id, input.mediaAssetId);
        if (!raced) {
          throw new JobError({
            code: JOB_ERROR_CODES.INVALID_INPUT,
            userMessage: "Could not attach that still. Try again.",
            retryable: false,
          });
        }
        return {
          selected: true as const,
          ref: raced,
          refCount: await countRefsOn(tx, pack.id),
        };
      }
      return { selected: true as const, ref: rows[0], refCount: refCount + 1 };
    });
  } catch (err) {
    if (!isUniqueViolation(err)) {
      throw err;
    }
    const refCount = await countRefs(input.packId);
    const dbAfter = getDb();
    const raced = await existingRefOn(dbAfter, input.packId, input.mediaAssetId);
    if (!raced) {
      throw err;
    }
    return { selected: true as const, ref: raced, refCount };
  }
}

export async function lockPack(userId: string, packId: string) {
  await recoverStaleJobsSafe({ userId, packId });
  const db = getDb();
  return db.transaction(async (tx) => {
    const pack = await loadOwnedPackForUpdate(tx, userId, packId);
    const refs = await countRefsOn(tx, pack.id);
    const gate = lockPackDecision(pack.status, refs);
    throwPackGate(gate);

    const rows = await tx
      .update(characterPacks)
      .set({ status: "locked", lockedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(characterPacks.id, pack.id), eq(characterPacks.status, "draft")))
      .returning();
    const locked = rows[0];
    if (!locked) {
      throw new JobError({
        code: JOB_ERROR_CODES.INVALID_PACK_STATE,
        userMessage: "Only draft packs can be locked",
        retryable: false,
      });
    }
    // Lock without Train leaves adapter_status none — Generate uses Venice.
    return { pack: locked, warning: gate.warning, refCount: refs };
  });
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
  skipAbuseGuard?: boolean;
}) {
  const pack = await getPack(input.userId, input.characterPackId);
  if (!pack) {
    throw new Error("Character pack is required");
  }
  assertGenerateStillAllowed({ packStatus: pack.status, poseChipId: input.poseChipId });
  if (!input.skipAbuseGuard) {
    await guardJobEnqueue(input.userId, "generateStill");
  }

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
      provider: providerForGenerate(pack),
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
  const preset = requireStarterPreset(input.presetId);
  const pack = await getPack(input.userId, input.characterPackId);
  if (!pack) {
    throw new JobError({ code: JOB_ERROR_CODES.PACK_NOT_FOUND, retryable: false });
  }
  throwPackGate(generateStarterPackDecision(pack.status));
  compileStarterPrompt({
    characterPackName: pack.name,
    characterPackId: pack.id,
    presetId: preset.id,
  });
  await guardJobEnqueue(input.userId, "generateStarter");

  const db = getDb();
  const jobRows = await db
    .insert(generationJobs)
    .values({
      userId: input.userId,
      kind: "generate_starter",
      status: "queued",
      provider: providerForGenerate(pack),
      characterPackId: pack.id,
      inputJson: { presetId: preset.id, kind: preset.kind },
    })
    .returning();
  const job = jobRows[0];
  if (!job) {
    throw new JobError({
      code: JOB_ERROR_CODES.INVALID_INPUT,
      userMessage: "Could not queue that starter. Try again.",
      retryable: true,
    });
  }

  await enqueueGenerateStillJob(job.id);
  return { job, preset };
}

export async function enqueueTrainPack(userId: string, packId: string) {
  const pack = await getPack(userId, packId);
  if (!pack) {
    throw new JobError({ code: JOB_ERROR_CODES.PACK_NOT_FOUND, retryable: false });
  }
  throwPackGate(trainPackDecision(pack.status, await countRefs(pack.id)));
  await guardJobEnqueue(userId, "trainPack");

  const db = getDb();
  const job = await db.transaction(async (tx) => {
    const locked = await loadOwnedPackForUpdate(tx, userId, packId);
    const refs = await countRefsOn(tx, locked.id);
    throwPackGate(trainPackDecision(locked.status, refs));

    const start = trainStartTransition({
      retrain: false,
      identity: readAdapterIdentity(locked),
    });
    const updated = await tx
      .update(characterPacks)
      .set({
        status: start.packStatus,
        adapterStatus: start.adapterStatus,
        updatedAt: new Date(),
      })
      .where(
        and(eq(characterPacks.id, locked.id), inArray(characterPacks.status, ["draft", "failed"])),
      )
      .returning();
    if (!updated[0]) {
      throw new JobError({
        code: JOB_ERROR_CODES.INVALID_PACK_STATE,
        userMessage: "Train & lock is available on draft packs",
        retryable: false,
      });
    }

    const jobRows = await tx
      .insert(generationJobs)
      .values({
        userId,
        kind: "train_pack",
        status: "queued",
        provider: providerForTrain(),
        characterPackId: locked.id,
        inputJson: { refCount: refs },
      })
      .returning();
    const created = jobRows[0];
    if (!created) {
      throw new JobError({
        code: JOB_ERROR_CODES.INVALID_INPUT,
        userMessage: "Could not queue Train & lock. Try again.",
        retryable: true,
      });
    }
    return created;
  });

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
  await guardJobEnqueue(userId, "generateStill", TEST_GRID_SIZE);

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
      skipAbuseGuard: true,
    });
    jobs.push(result.job);
  }
  return { jobs, count: jobs.length };
}

export async function enqueueRetrainPack(userId: string, packId: string) {
  const pack = await getPack(userId, packId);
  if (!pack) {
    throw new JobError({ code: JOB_ERROR_CODES.PACK_NOT_FOUND, retryable: false });
  }
  throwPackGate(retrainPackDecision(pack.status, await countRefs(pack.id)));
  await guardJobEnqueue(userId, "trainPack");

  const db = getDb();
  const job = await db.transaction(async (tx) => {
    const locked = await loadOwnedPackForUpdate(tx, userId, packId);
    const refs = await countRefsOn(tx, locked.id);
    throwPackGate(retrainPackDecision(locked.status, refs));

    const identity = readAdapterIdentity(locked);
    const start = trainStartTransition({ retrain: true, identity });
    const updated = await tx
      .update(characterPacks)
      .set({
        status: start.packStatus,
        adapterStatus: start.adapterStatus,
        updatedAt: new Date(),
      })
      .where(
        and(eq(characterPacks.id, locked.id), inArray(characterPacks.status, ["locked", "ready"])),
      )
      .returning();
    if (!updated[0]) {
      throw new JobError({
        code: JOB_ERROR_CODES.INVALID_PACK_STATE,
        userMessage: "Training is already running. Check Jobs — do not start a second train.",
        retryable: false,
      });
    }

    const jobRows = await tx
      .insert(generationJobs)
      .values({
        userId,
        kind: "train_pack",
        status: "queued",
        provider: providerForTrain(),
        characterPackId: locked.id,
        inputJson: {
          refCount: refs,
          retrain: true,
          previousProviderJobId: identity.adapterId ?? locked.providerJobId,
          previousAdapter: snapshotAdapterIdentity(identity),
        },
      })
      .returning();
    const created = jobRows[0];
    if (!created) {
      throw new JobError({
        code: JOB_ERROR_CODES.INVALID_INPUT,
        userMessage: "Could not queue Retrain. Try again.",
        retryable: true,
      });
    }
    return created;
  });

  await enqueueTrainPackJob({
    generationJobId: job.id,
    characterPackId: pack.id,
  });
  return job;
}

export async function listJobs(userId: string) {
  if (isMemoryPreview()) {
    return [];
  }
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

export async function cancelUserJob(userId: string, jobId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(generationJobs)
    .where(and(eq(generationJobs.id, jobId), eq(generationJobs.userId, userId)))
    .limit(1);
  const job = rows[0] ?? null;
  const decision = decideCancelJob(job);
  if (decision.action === "reject") {
    throw jobErrorFromCancelDecision(decision);
  }
  if (!job) {
    throw jobErrorFromCancelDecision({
      action: "reject",
      code: "JOB_NOT_FOUND",
      httpStatus: 404,
      message: "Job not found.",
    });
  }

  const canceled = await markJobCanceledIfActive({ jobId: job.id, kind: job.kind });
  if (!canceled) {
    throw jobErrorFromCancelDecision({
      action: "reject",
      code: "JOB_ALREADY_FINISHED",
      httpStatus: 409,
      message: "This job already finished.",
    });
  }

  if (isCancelableStillKind(job.kind)) {
    try {
      await discardGenerateStillJob(job.id);
    } catch (err) {
      jobLog("job.cancel_queue_discard_failed", {
        jobId: job.id,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  jobLog("job.canceled", { jobId: job.id, kind: job.kind });
  return getJob(userId, job.id);
}

async function attachJobPreviews<T extends { id: string; kind: string; resultAssetKey?: string | null }>(
  userId: string,
  jobs: T[],
) {
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
  if (isMemoryPreview()) {
    return [];
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.userId, userId), eq(mediaAssets.kind, "still")))
    .orderBy(desc(mediaAssets.createdAt));
  return rows.map((row) => publicMediaAsset(row));
}
