import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { characterPacks, generationJobs, mediaAssets, type MediaAsset } from "@/db/schema";
import {
  MEDIA_AUTH_ERRORS,
  MEDIA_PREVIEW_HEADERS,
  classifyMediaSession,
  decideMediaPreview,
  parseMediaId,
} from "@/lib/media";
import { getDb } from "@/server/db";
import { isS3Configured, presignGetUrl, readObject } from "@/server/storage";

export async function getAccessibleMedia(userId: string, mediaId: string): Promise<MediaAsset | null> {
  const id = parseMediaId(mediaId);
  if (!id) {
    return null;
  }

  try {
    const db = getDb();
    const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
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

    const decision = decideMediaPreview({
      sessionUserId: userId,
      user: { id: userId, ageAttestedAt: new Date(0) },
      mediaId: id,
      asset: {
        userId: asset.userId,
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
        packOwnerId,
        jobOwnerId,
      },
    });
    if (!decision.ok) {
      return null;
    }

    return asset;
  } catch {
    return null;
  }
}

export type MediaPreviewResult =
  | { kind: "error"; status: 401 | 403 | 404; error: string }
  | { kind: "redirect"; location: string }
  | { kind: "bytes"; body: Buffer; mimeType: string };

export type MediaPreviewDeps = {
  loadAsset?: (userId: string, mediaId: string) => Promise<MediaAsset | null>;
  s3Configured?: () => boolean;
  presign?: (key: string) => Promise<string>;
  read?: (key: string) => Promise<Buffer>;
};

/**
 * Session + ownership already decided by `decideMediaPreview` / `getAccessibleMedia`.
 * Stub/local streams bytes; R2 302s to a TTL-clamped signed GET. Never returns a storage key.
 */
export async function resolveMediaPreview(
  input: {
    sessionUserId: string | null;
    user: { id: string; ageAttestedAt: Date | string | null } | null;
    mediaId: string;
  },
  deps: MediaPreviewDeps = {},
): Promise<MediaPreviewResult> {
  const loadAsset = deps.loadAsset ?? getAccessibleMedia;
  const s3Configured = deps.s3Configured ?? isS3Configured;
  const presign = deps.presign ?? presignGetUrl;
  const read = deps.read ?? readObject;

  const auth = classifyMediaSession({ sessionUserId: input.sessionUserId, user: input.user });
  if (!auth.ok) {
    return { kind: "error", status: auth.status, error: auth.error };
  }
  if (!parseMediaId(input.mediaId)) {
    return { kind: "error", status: 404, error: MEDIA_AUTH_ERRORS.notFound };
  }

  let asset: MediaAsset | null = null;
  try {
    asset = await loadAsset(auth.userId, input.mediaId);
  } catch {
    return { kind: "error", status: 404, error: MEDIA_AUTH_ERRORS.notFound };
  }

  const decision = decideMediaPreview({
    sessionUserId: input.sessionUserId,
    user: input.user,
    mediaId: input.mediaId,
    asset,
  });
  if (!decision.ok) {
    return { kind: "error", status: decision.status, error: decision.error };
  }

  try {
    if (s3Configured()) {
      const location = await presign(decision.storageKey);
      return { kind: "redirect", location };
    }
    const body = await read(decision.storageKey);
    return { kind: "bytes", body, mimeType: decision.mimeType };
  } catch {
    return { kind: "error", status: 404, error: MEDIA_AUTH_ERRORS.notFound };
  }
}

export function mediaPreviewResponse(result: MediaPreviewResult): NextResponse {
  if (result.kind === "error") {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: MEDIA_PREVIEW_HEADERS },
    );
  }
  if (result.kind === "redirect") {
    const redirect = NextResponse.redirect(result.location, 302);
    redirect.headers.set("Cache-Control", MEDIA_PREVIEW_HEADERS["Cache-Control"]);
    return redirect;
  }
  return new NextResponse(Uint8Array.from(result.body), {
    headers: {
      "Content-Type": result.mimeType,
      "Cache-Control": MEDIA_PREVIEW_HEADERS["Cache-Control"],
    },
  });
}
