import { MEDIA_AUTH_ERRORS, classifyMediaSession } from "@/lib/media";
import { getCurrentUser, readSessionUserId } from "@/server/auth";
import { mediaPreviewResponse, resolveMediaPreview } from "@/server/media";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const sessionUserId = await readSessionUserId();
    const user = await getCurrentUser();
    const auth = classifyMediaSession({ sessionUserId, user });
    if (!auth.ok) {
      return mediaPreviewResponse({ kind: "error", status: auth.status, error: auth.error });
    }

    const { id } = await context.params;
    const result = await resolveMediaPreview({
      sessionUserId,
      user,
      mediaId: id,
    });
    return mediaPreviewResponse(result);
  } catch {
    return mediaPreviewResponse({
      kind: "error",
      status: 404,
      error: MEDIA_AUTH_ERRORS.notFound,
    });
  }
}
