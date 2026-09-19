import { MEDIA_AUTH_ERRORS, classifyMediaSession } from "@/lib/media";
import { getCurrentUser, readSessionUserId } from "@/server/auth";
import { mediaPreviewResponse } from "@/server/media";

export const dynamic = "force-dynamic";

/** No directory listing under `/api/media`. Auth first so a missing session is 401, not 404. */
export async function GET() {
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
  return mediaPreviewResponse({ kind: "error", status: 404, error: MEDIA_AUTH_ERRORS.notFound });
}
