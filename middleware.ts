import { NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

const PRIVATE_SESSION_COOKIE = "artipilot_private_session";
const PRIVATE_SESSION_VALUE = "authenticated";

const PUBLIC_API_PREFIXES = [
  "/api/auth/private-login",
  "/api/debug-session",
  "/api/whatsapp/webhook",
  "/api/webhooks",
];

const PUBLIC_HOSTS = [
  "artipilot.com",
  "www.artipilot.com",
  "artipilot.ai",
  "www.artipilot.ai",
];

const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

function cleanHost(value: string | undefined | null) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split(":")[0]
    .toLowerCase();
}

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets") ||
    PUBLIC_FILE.test(pathname)
  );
}

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hostname = cleanHost(request.headers.get("host"));
  const privateHost = cleanHost(
    process.env.PRIVATE_DASHBOARD_HOST || "private.artipilot.com"
  );

  const allowLocalPrivate = process.env.ALLOW_LOCAL_PRIVATE === "true";
  const isLocalHost = LOCAL_HOSTS.includes(hostname);

  const isPrivateHost =
    hostname === privateHost || (allowLocalPrivate && isLocalHost);

  const isPublicHost = PUBLIC_HOSTS.includes(hostname) || isLocalHost;

  const isLoggedIn =
    request.cookies.get(PRIVATE_SESSION_COOKIE)?.value ===
    PRIVATE_SESSION_VALUE;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    const isPublicApi = startsWithAny(pathname, PUBLIC_API_PREFIXES);

    if (isPublicApi) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/private")) {
      if (!isPrivateHost) {
        return NextResponse.json(
          { error: "Private API is not available on this domain." },
          { status: 403 }
        );
      }

      if (!isLoggedIn) {
        return NextResponse.json(
          { error: "Not authenticated." },
          { status: 401 }
        );
      }

      return NextResponse.next();
    }

    return NextResponse.next();
  }

  if (isPrivateHost) {
    if (pathname === "/") {
      return redirectTo(request, isLoggedIn ? "/dashboard/inbox" : "/login");
    }

    /*
      IMPORTANT:
      Do NOT redirect /login to /dashboard here.
      This prevents login <-> dashboard redirect loops.
    */
    if (pathname === "/login") {
      return NextResponse.next();
    }

    if (pathname === "/logout") {
      return NextResponse.next();
    }

    if (pathname.startsWith("/dashboard") || pathname.startsWith("/private")) {
      if (!isLoggedIn) {
        return redirectTo(request, "/login");
      }

      return NextResponse.next();
    }

    return NextResponse.next();
  }

  if (isPublicHost) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/private")) {
      return redirectTo(request, "/");
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};