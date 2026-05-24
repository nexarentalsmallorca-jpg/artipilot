import { NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

const PRIVATE_SESSION_COOKIE = "artipilot_private_session";
const PRIVATE_SESSION_VALUE = "authenticated";

/**
 * API routes that must stay public or reachable without private dashboard login.
 * IMPORTANT:
 * Do not block WhatsApp webhook routes, because Meta/WhatsApp needs to reach them.
 */
const PUBLIC_API_PREFIXES = [
  "/api/auth/private-login",
  "/api/auth/logout",
  "/api/debug-session",
  "/api/whatsapp/webhook",
  "/api/webhooks",
];

/**
 * Public pages for the new Artipilot Daily Life Assistant.
 * These should be accessible on the main public domain.
 */
const PUBLIC_PAGE_PREFIXES = [
  "/",
  "/login",
  "/logout",
  "/auth",
  "/app",
  "/dashboard",
];

/**
 * Private dashboard pages for your own private WhatsApp AI system.
 * These are protected by the private session cookie.
 */
const PRIVATE_PAGE_PREFIXES = ["/dashboard", "/private"];

/**
 * Main public domains.
 * Add more domains here if needed later.
 */
const PUBLIC_HOSTS = [
  "artipilot.com",
  "www.artipilot.com",
  "artipilot.ai",
  "www.artipilot.ai",
];

/**
 * Local development hosts.
 */
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

function normalizeHostname(host: string) {
  return host.split(":")[0].toLowerCase();
}

function isLocalhost(hostname: string) {
  return LOCAL_HOSTS.includes(hostname);
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

  const host = request.headers.get("host") || "";
  const hostname = normalizeHostname(host);

  const privateDashboardHost =
    process.env.PRIVATE_DASHBOARD_HOST || "private.artipilot.com";

  const allowLocalPrivate = process.env.ALLOW_LOCAL_PRIVATE === "true";

  const isPrivateHost =
    hostname === privateDashboardHost.toLowerCase() ||
    (allowLocalPrivate && isLocalhost(hostname));

  const isPublicHost = PUBLIC_HOSTS.includes(hostname) || isLocalhost(hostname);

  const isLoggedIn =
    request.cookies.get(PRIVATE_SESSION_COOKIE)?.value ===
    PRIVATE_SESSION_VALUE;

  /**
   * Always allow static files.
   */
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  /**
   * API handling.
   *
   * Public API routes stay reachable.
   * Private API routes require private host + login.
   * WhatsApp routes stay untouched.
   */
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

  /**
   * Private subdomain handling.
   *
   * Example:
   * private.artipilot.com
   *
   * This host is for your own private WhatsApp AI dashboard.
   */
  if (isPrivateHost) {
    if (pathname === "/") {
      return redirectTo(request, isLoggedIn ? "/dashboard/inbox" : "/login");
    }

    if (pathname === "/login") {
      if (isLoggedIn) {
        return redirectTo(request, "/dashboard/inbox");
      }

      return NextResponse.next();
    }

    if (pathname.startsWith("/logout")) {
      return NextResponse.next();
    }

    if (startsWithAny(pathname, PRIVATE_PAGE_PREFIXES)) {
      if (!isLoggedIn) {
        return redirectTo(request, "/login");
      }

      return NextResponse.next();
    }

    return NextResponse.next();
  }

  /**
   * Public domain handling.
   *
   * Public Artipilot should be visible here.
   * Private WhatsApp dashboard should NOT be visible here.
   */
  if (isPublicHost) {
    if (pathname.startsWith("/private")) {
      return redirectTo(request, "/");
    }

    /**
     * IMPORTANT:
     * For now, if your old private dashboard still uses /dashboard,
     * we block it on the public domain.
     *
     * Later, for the public Daily Life Assistant dashboard,
     * we should move it to /app instead of /dashboard.
     */
    if (pathname.startsWith("/dashboard")) {
      return redirectTo(request, "/");
    }

    return NextResponse.next();
  }

  /**
   * Unknown domains:
   * Allow app to continue instead of breaking deployment previews.
   */
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
