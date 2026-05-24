import { NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;
const PRIVATE_SESSION_COOKIE = "artipilot_private_session";
const PRIVATE_SESSION_VALUE = "authenticated";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();

  const privateHost =
    process.env.PRIVATE_DASHBOARD_HOST || "private.artipilot.com";

  const isPrivateHost = hostname === privateHost;

  const isPublicHost =
    hostname === "artipilot.com" || hostname === "www.artipilot.com";

  const isLoggedIn =
    request.cookies.get(PRIVATE_SESSION_COOKIE)?.value ===
    PRIVATE_SESSION_VALUE;

  const isStaticFile =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    PUBLIC_FILE.test(pathname);

  if (isStaticFile) {
    return NextResponse.next();
  }

  /*
    IMPORTANT:
    Do NOT block API routes inside middleware.

    Reason:
    /api/debug-session already proved that the cookie exists,
    but middleware was still blocking /api/inbox and saying cookieExists false.

    So from now on:
    - middleware protects dashboard pages only
    - each API route checks its own auth/session
  */
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  /*
    Public domain:
    artipilot.com and www.artipilot.com must stay clean
    for the future public SaaS website.
  */
  if (isPublicHost) {
    if (pathname === "/") {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  /*
    Private dashboard domain:
    private.artipilot.com
  */
  if (isPrivateHost) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = isLoggedIn ? "/dashboard/inbox" : "/login";
      return NextResponse.redirect(url);
    }

    if (pathname === "/login") {
      if (isLoggedIn) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/inbox";
        return NextResponse.redirect(url);
      }

      return NextResponse.next();
    }

    if (pathname.startsWith("/logout")) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/dashboard")) {
      if (!isLoggedIn) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }

      return NextResponse.next();
    }

    return NextResponse.next();
  }

  /*
    Unknown host:
    never expose private dashboard pages.
  */
  if (pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};