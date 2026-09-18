import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if ((pathname.startsWith("/studio") || pathname.startsWith("/admin") || pathname.startsWith("/age")) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/invite";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*", "/admin/:path*", "/age"],
};
