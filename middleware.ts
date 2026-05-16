import { NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/artipilot-logo.png") ||
    pathname.startsWith("/file.svg") ||
    pathname.startsWith("/globe.svg") ||
    pathname.startsWith("/next.svg") ||
    pathname.startsWith("/vercel.svg") ||
    pathname.startsWith("/window.svg") ||
    PUBLIC_FILE.test(pathname)
  );
}

function isAllowedApi(pathname: string) {
  return pathname.startsWith("/api");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicAsset(pathname) || isAllowedApi(pathname)) {
    return NextResponse.next();
  }

  const lockUser = process.env.SITE_LOCK_USERNAME || "artipilot";
  const lockPassword = process.env.SITE_LOCK_PASSWORD;

  if (!lockPassword) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const base64Credentials = authHeader.replace("Basic ", "");
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(":");

    if (username === lockUser && password === lockPassword) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Private website. Login required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Artipilot Private Access"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};