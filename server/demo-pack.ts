import { and, eq } from "drizzle-orm";
import { characterPacks, mediaAssets, trainingSetAssets } from "@/db/schema";
import {
  DEMO_DRAFT_PACK_NAME,
  DEMO_DRAFT_REF_COUNT,
  DEMO_LOCKED_PACK_NAME,
  DEMO_LOCKED_REF_COUNT,
  stubDemoLockMessage,
} from "@/lib/demo-pack";
import { publicPack } from "@/lib/media";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { countRefs, lockPack } from "@/server/packs";

async function findPackByName(userId: string, name: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(characterPacks)
    .where(and(eq(characterPacks.userId, userId), eq(characterPacks.name, name)))
    .limit(1);
  return rows[0] ?? null;
}

async function addRefs(packId: string, userId: string, needed: number) {
  const db = getDb();
  const existing = await countRefs(packId);
  for (let i = existing; i < needed; i += 1) {
    const mediaRows = await db
      .insert(mediaAssets)
      .values({
        userId,
        kind: "starter",
        storageKey: `demo/${packId}/ref-${i + 1}.webp`,
        mimeType: "image/webp",
        characterPackId: packId,
      })
      .returning();
    const media = mediaRows[0];
    if (!media) continue;
    await db.insert(trainingSetAssets).values({
      characterPackId: packId,
      userId,
      mediaAssetId: media.id,
      kind: i % 2 === 0 ? "starter_face" : "starter_body",
      source: "generate_starter",
    });
  }
}

async function createDraftWithRefs(input: { userId: string; name: string; count: number }) {
  const db = getDb();
  let pack = await findPackByName(input.userId, input.name);
  if (!pack) {
    const packRows = await db
      .insert(characterPacks)
      .values({
        userId: input.userId,
        name: input.name,
        origin: "generate_then_lock",
        fictionalAttestation: true,
      })
      .returning();
    pack = packRows[0] ?? null;
  }
  if (!pack) {
    throw new Error("Failed to create demo pack");
  }
  if (pack.status === "failed") {
    const rows = await db
      .update(characterPacks)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(characterPacks.id, pack.id))
      .returning();
    pack = rows[0] ?? pack;
  }
  if (pack.status === "draft") {
    await addRefs(pack.id, input.userId, input.count);
  }
  return pack;
}

export async function seedStubReviewPacks(userId: string) {
  const blocked = stubDemoLockMessage(getEnv().providerMode);
  if (blocked) {
    throw new Error(blocked);
  }

  const draft = await createDraftWithRefs({
    userId,
    name: DEMO_DRAFT_PACK_NAME,
    count: DEMO_DRAFT_REF_COUNT,
  });

  let locked = await createDraftWithRefs({
    userId,
    name: DEMO_LOCKED_PACK_NAME,
    count: DEMO_LOCKED_REF_COUNT,
  });

  if (locked.status === "draft") {
    const result = await lockPack(userId, locked.id);
    locked = result.pack ?? locked;
  }

  if (!locked) {
    throw new Error("Failed to seed Locked demo pack");
  }

  return {
    locked: publicPack({ ...locked, refCount: await countRefs(locked.id) }),
    draft: publicPack({ ...draft, refCount: await countRefs(draft.id) }),
  };
}
