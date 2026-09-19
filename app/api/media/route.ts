import { MEDIA_AUTH_ERRORS, classifyMediaSession } from "@/lib/media";
import { getCurrentUser, readSessionUserId } from "@/server/auth";
import { mediaPreviewResponse } from "@/server/media";

export const dynamic = "force-dynamic";

/** No directory listing under `/api/media`. Auth first so a missing session is 401, not 404. */
export async function GET() {
  try {
    const sessionUserId = await readSessionUserId();
    const user = await getCurrentUser();
    const auth = classifyMediaSession({ sessionUserId, user });
    if (!auth.ok) {
      return mediaPreviewResponse({ kind: "error", status: auth.status, error: auth.error });
    }
    return mediaPreviewResponse({ kind: "error", status: 404, error: MEDIA_AUTH_ERRORS.notFound });
  } catch {
    return mediaPreviewResponse({ kind: "error", status: 404, error: MEDIA_AUTH_ERRORS.notFound });
  }
}
