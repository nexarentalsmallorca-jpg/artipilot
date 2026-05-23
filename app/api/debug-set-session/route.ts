import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get("password");
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error: "DASHBOARD_PASSWORD is missing in Vercel env",
      },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return NextResponse.json(
      {
        ok: false,
        error: "Wrong password in URL",
        passwordReceived: Boolean(password),
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    message: "Cookie set. Now open /api/debug-session",
    cookieName: "artipilot_private_session",
    host: request.headers.get("host"),
  });

  response.cookies.set("artipilot_private_session", "authenticated", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}