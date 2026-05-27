import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_SESSION_COOKIE = "artipilot_private_session";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function getCookieMaxAge() {
  return 60 * 60 * 24 * 30; // 30 days
}

export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get("password");
  const expected = process.env.DASHBOARD_PASSWORD?.trim();

  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error: "DASHBOARD_PASSWORD is missing in Vercel env",
      },
      { status: 500 }
    );
  }

  if (!password) {
    return NextResponse.json(
      {
        ok: false,
        error: "Password is missing in URL",
        example: "/api/debug-set-session?password=YOUR_PASSWORD",
      },
      { status: 400 }
    );
  }

  if (password !== expected) {
    return NextResponse.json(
      {
        ok: false,
        error: "Wrong password in URL",
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    message: "Private session cookie set. Now open /dashboard/inbox",
    open: "/dashboard/inbox",
    host: request.headers.get("host"),
  });

  response.cookies.set({
    name: PRIVATE_SESSION_COOKIE,
    value: "authenticated",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: getCookieMaxAge(),
  });

  return response;
}