import { NextResponse } from "next/server";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { getOwnedMedia } from "@/server/media";
import { isS3Configured, presignGetUrl, readObject } from "@/server/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAttestedUser();
    const { id } = await context.params;
    const asset = await getOwnedMedia(user.id, id);
    if (!asset) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    if (isS3Configured()) {
      const url = await presignGetUrl(asset.storageKey);
      return NextResponse.redirect(url, 302);
    }

    const body = await readObject(asset.storageKey);
    return new NextResponse(Uint8Array.from(body), {
      headers: {
        "Content-Type": asset.mimeType || "image/webp",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
