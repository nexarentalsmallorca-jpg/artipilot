import { NextRequest, NextResponse } from "next/server";
import {
  isPrivateSessionCookie,
  PRIVATE_SESSION_COOKIE,
} from "@/lib/auth/privateSession";

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();

  const privateHost =
    process.env.PRIVATE_DASHBOARD_HOST || "private.artipilot.com";

  const isPrivateHost = hostname === privateHost;

  const isPublicHost =
    hostname === "artipilot.com" || hostname === "www.artipilot.com";

  const isStaticFile =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    PUBLIC_FILE.test(pathname);

  if (isStaticFile) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/whatsapp/webhook")) {
    return NextResponse.next();
  }

  if (isPrivateHost) {
    const session = request.cookies.get(PRIVATE_SESSION_COOKIE)?.value;
    const isLoggedIn = isPrivateSessionCookie(session);

    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (pathname === "/login" || pathname.startsWith("/logout")) {
      if (pathname === "/login" && isLoggedIn) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/inbox";
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    if (pathname.startsWith("/dashboard") && !isLoggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
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
