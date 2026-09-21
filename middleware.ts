import { SESSION_COOKIE } from "@/lib/constants";
import { authPathRedirect } from "@/lib/auth-gate";
import { stubSessionSecret } from "@/lib/memory-preview";
import { decodeSession } from "@/lib/session-cookie";
import { NextResponse, type NextRequest } from "next/server";

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

async function readSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = stubSessionSecret(process.env.PROVIDER_MODE ?? "stub", process.env.SESSION_SECRET);
  if (!token || !secret) {
    return null;
  }
  return decodeSession(token, secret);
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    const session = await readSession(request);
    const redirectPath = authPathRedirect(pathname, session);
    if (redirectPath) {
      return redirectTo(request, redirectPath);
    }
  } catch {
    // Layouts re-check. Never fail the request with MIDDLEWARE_INVOCATION_FAILED.
  }
  return NextResponse.next();
}

export const config = {
  // /invite and /age redirect in the page with a relative Location so a
  // 127.0.0.1 session is not sent to localhost (Next rewrites middleware hosts).
  matcher: ["/app/:path*", "/app", "/admin/:path*", "/admin"],
};
