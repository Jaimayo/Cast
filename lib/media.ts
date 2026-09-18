/** Same-origin studio preview path. The media route auth-checks, then streams or 302s to a short-lived R2 GET. */
export function mediaPreviewPath(mediaId: string): string {
  return `/api/media/${mediaId}`;
}
