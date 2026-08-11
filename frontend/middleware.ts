import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "abbsy_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never intercept Next.js API routes (session cookie bridge, etc.)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(COOKIE_NAME)?.value);
  const isLogin = pathname === "/login";

  if (!hasSession && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasSession && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
