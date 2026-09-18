import { eq } from "drizzle-orm";
import { characterPacks, generationJobs, mediaAssets, type MediaAsset } from "@/db/schema";
import { canAccessMedia } from "@/lib/media";
import { getDb } from "@/server/db";

export async function getAccessibleMedia(userId: string, mediaId: string): Promise<MediaAsset | null> {
  const db = getDb();
  const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId)).limit(1);
  const asset = rows[0];
  if (!asset) {
    return null;
  }

  let packOwnerId: string | null = null;
  let jobOwnerId: string | null = null;

  if (asset.characterPackId) {
    const packs = await db
      .select({ userId: characterPacks.userId })
      .from(characterPacks)
      .where(eq(characterPacks.id, asset.characterPackId))
      .limit(1);
    packOwnerId = packs[0]?.userId ?? null;
  }

  if (asset.generationJobId) {
    const jobs = await db
      .select({ userId: generationJobs.userId })
      .from(generationJobs)
      .where(eq(generationJobs.id, asset.generationJobId))
      .limit(1);
    jobOwnerId = jobs[0]?.userId ?? null;
  }

  if (
    !canAccessMedia({
      viewerId: userId,
      assetUserId: asset.userId,
      packOwnerId,
      jobOwnerId,
    })
  ) {
    return null;
  }

  return asset;
}
