import { NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;
const PRIVATE_SESSION_COOKIE = "artipilot_private_session";
const PRIVATE_SESSION_VALUE = "authenticated";

const PUBLIC_API_PREFIXES = [
  "/api/auth/private-login",
  "/api/debug-session",
  "/api/whatsapp/webhook",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  const privateHost =
    process.env.PRIVATE_DASHBOARD_HOST || "private.artipilot.com";
  const isPrivateHost =
    hostname === privateHost ||
    (process.env.ALLOW_LOCAL_PRIVATE === "true" &&
      (hostname === "localhost" || hostname === "127.0.0.1"));
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

  if (pathname.startsWith("/api")) {
    if (isPrivateHost) {
      const isPublicApi = PUBLIC_API_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
      );
      if (isPublicApi) {
        return NextResponse.next();
      }
      if (pathname.startsWith("/api/private")) {
        return NextResponse.next();
      }
    }
    if (isPublicHost && pathname.startsWith("/api/whatsapp/webhook")) {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  if (isPublicHost) {
    if (pathname === "/") {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

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
