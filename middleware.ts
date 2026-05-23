import { NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;
const SESSION_COOKIE = "artipilot_private_session";
const SESSION_VALUE = "authenticated";

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
    request.cookies.get(SESSION_COOKIE)?.value === SESSION_VALUE;

  const isStaticFile =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    PUBLIC_FILE.test(pathname);

  if (isStaticFile) return NextResponse.next();

  if (
    pathname.startsWith("/api/whatsapp/webhook") ||
    pathname.startsWith("/api/auth/private-login")
  ) {
    return NextResponse.next();
  }

  if (isPublicHost) {
    if (pathname === "/") return NextResponse.next();

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

    if (pathname.startsWith("/logout")) return NextResponse.next();

    if (pathname.startsWith("/dashboard")) {
      if (!isLoggedIn) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    if (pathname.startsWith("/api")) {
      if (!isLoggedIn) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
