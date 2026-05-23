import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get("password");
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json(
      { error: "Forbidden. Wrong or missing password." },
      { status: 403 }
    );
  }

  const response = NextResponse.redirect(
    new URL("/dashboard/inbox", request.url),
    303
  );

  response.cookies.set("artipilot_private_session", "authenticated", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}