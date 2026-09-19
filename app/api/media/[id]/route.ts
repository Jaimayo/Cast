import { MEDIA_AUTH_ERRORS, classifyMediaSession } from "@/lib/media";
import { getCurrentUser, readSessionUserId } from "@/server/auth";
import { mediaPreviewResponse, resolveMediaPreview } from "@/server/media";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const sessionUserId = await readSessionUserId();
  let user = null;
  let userLookupFailed = false;
  try {
    user = await getCurrentUser();
  } catch {
    userLookupFailed = true;
  }

  const auth = classifyMediaSession({ sessionUserId, user, userLookupFailed });
  if (!auth.ok) {
    return mediaPreviewResponse({ kind: "error", status: auth.status, error: auth.error });
  }

  try {
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
