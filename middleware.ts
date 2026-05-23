import { NextRequest, NextResponse } from "next/server";
import {
  BLOCKED_ON_PUBLIC_PATH_PREFIXES,
  getExtraPassword,
  isAdminEmail,
  isDashboardHost,
  isPublicHost,
  normalizeHost,
  PRIVATE_PUBLIC_PATHS,
  PUBLIC_ONLY_PATHS,
} from "@/lib/auth/config";
import { getRequestUser } from "@/lib/auth/supabase-middleware";

const PUBLIC_FILE = /\.(.*)$/;

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/artipilot-logo.png") ||
    PUBLIC_FILE.test(pathname)
  );
}

function isWebhookPath(pathname: string) {
  return pathname === "/api/whatsapp/webhook";
}

function isAuthCallback(pathname: string) {
  return pathname === "/auth/callback";
}

function isBlockedOnPublic(pathname: string) {
  return BLOCKED_ON_PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function hasValidExtraPassword(request: NextRequest) {
  const expected = getExtraPassword();
  if (!expected) return true;
  const cookie = request.cookies.get("artipilot_extra_unlock")?.value;
  return cookie === expected;
}

function redirect(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

function rewriteComingSoon(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return NextResponse.next();
  }
  return redirect(request, "/");
}

async function protectDashboardRequest(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });

  if (!hasValidExtraPassword(request)) {
    if (pathname === "/login") return response;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("gate", "1");
    return NextResponse.redirect(loginUrl);
  }

  if (PRIVATE_PUBLIC_PATHS.has(pathname) || isAuthCallback(pathname)) {
    if (pathname === "/login") {
      const user = await getRequestUser(request, response);
      if (user && isAdminEmail(user.email)) {
        return redirect(request, "/dashboard/inbox");
      }
    }
    return response;
  }

  const user = await getRequestUser(request, response);

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!isAdminEmail(user.email)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (pathname !== "/access-denied") {
      return redirect(request, "/access-denied");
    }
    return response;
  }

  if (pathname === "/" || pathname === "/login") {
    return redirect(request, "/dashboard/inbox");
  }

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return redirect(request, "/dashboard/inbox");
  }

  const legacyRedirects: Record<string, string> = {
    "/signup": "/login",
    "/setup": "/dashboard/inbox",
    "/dashboard/ai-training": "/dashboard/training",
    "/dashboard/billing": "/dashboard/settings",
    "/dashboard/whatsapp": "/dashboard/settings",
  };

  if (legacyRedirects[pathname]) {
    return redirect(request, legacyRedirects[pathname]);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicAsset(pathname) || isWebhookPath(pathname)) {
    return NextResponse.next();
  }

  const host = normalizeHost(
    request.headers.get("x-forwarded-host") || request.headers.get("host")
  );

  if (isPublicHost(host)) {
    if (isBlockedOnPublic(pathname) || (!PUBLIC_ONLY_PATHS.has(pathname) && pathname !== "/")) {
      return rewriteComingSoon(request);
    }
    return NextResponse.next();
  }

  if (isDashboardHost(host)) {
    return protectDashboardRequest(request);
  }

  if (isBlockedOnPublic(pathname)) {
    return rewriteComingSoon(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
