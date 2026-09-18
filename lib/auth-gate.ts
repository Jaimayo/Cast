/**
 * Path gate used by middleware (cookie `age` flag, no DB on the edge).
 * Studio layouts re-check `users.ageAttestedAt` and remint the cookie if they drift.
 */

export type GateSession = {
  sub: string;
  age: boolean;
} | null;

export function isStudioPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/") || pathname.startsWith("/admin");
}

/** Where to send this request, or `null` to continue. */
export function authPathRedirect(pathname: string, session: GateSession): string | null {
  if (isStudioPath(pathname)) {
    if (!session) {
      return "/invite";
    }
    if (!session.age) {
      return "/age";
    }
    return null;
  }

  if (pathname === "/age") {
    if (!session) {
      return "/invite";
    }
    if (session.age) {
      return "/app";
    }
    return null;
  }

  if (pathname === "/invite" && session) {
    return session.age ? "/app" : "/age";
  }

  return null;
}
