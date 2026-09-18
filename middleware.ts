import { SESSION_COOKIE } from "@/lib/constants";
import { authPathRedirect } from "@/lib/auth-gate";
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
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) {
    return null;
  }
  return decodeSession(token, secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSession(request);
  const redirectPath = authPathRedirect(pathname, session);
  if (redirectPath) {
    return redirectTo(request, redirectPath);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/app", "/admin/:path*", "/age", "/invite"],
};
