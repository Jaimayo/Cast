import { SESSION_COOKIE } from "@/lib/constants";
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
  const studio =
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname.startsWith("/admin");

  if (studio) {
    if (!session) {
      return redirectTo(request, "/invite");
    }
    if (!session.age) {
      return redirectTo(request, "/age");
    }
    return NextResponse.next();
  }

  if (pathname === "/age") {
    if (!session) {
      return redirectTo(request, "/invite");
    }
    if (session.age) {
      return redirectTo(request, "/app");
    }
    return NextResponse.next();
  }

  if (pathname === "/invite" && session) {
    return redirectTo(request, session.age ? "/app" : "/age");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/app", "/admin/:path*", "/age", "/invite"],
};
