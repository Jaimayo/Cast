import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth-error";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { getAccessibleMedia } from "@/server/media";
import { isS3Configured, presignGetUrl, readObject } from "@/server/storage";

export const dynamic = "force-dynamic";

const PREVIEW_HEADERS = {
  "Cache-Control": "private, no-store",
} as const;

function previewError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return jsonError(err);
  }
  return NextResponse.json({ error: "Media not found" }, { status: 404, headers: PREVIEW_HEADERS });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAttestedUser();
    const { id } = await context.params;
    const asset = await getAccessibleMedia(user.id, id);
    if (!asset) {
      return NextResponse.json({ error: "Media not found" }, { status: 404, headers: PREVIEW_HEADERS });
    }

    if (isS3Configured()) {
      const url = await presignGetUrl(asset.storageKey);
      const redirect = NextResponse.redirect(url, 302);
      redirect.headers.set("Cache-Control", PREVIEW_HEADERS["Cache-Control"]);
      return redirect;
    }

    const body = await readObject(asset.storageKey);
    return new NextResponse(Uint8Array.from(body), {
      headers: {
        "Content-Type": asset.mimeType || "image/webp",
        "Cache-Control": PREVIEW_HEADERS["Cache-Control"],
      },
    });
  } catch (err) {
    return previewError(err);
  }
}
