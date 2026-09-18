import { and, eq } from "drizzle-orm";
import { mediaAssets, type MediaAsset } from "@/db/schema";
import { getDb } from "@/server/db";

export async function getOwnedMedia(userId: string, mediaId: string): Promise<MediaAsset | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, mediaId), eq(mediaAssets.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}
