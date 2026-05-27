import { NextRequest, NextResponse } from "next/server";
import {
  applyPrivateSessionCookie,
  setPrivateSessionCookie,
} from "@/lib/auth/private-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get("password");
  const expected = process.env.DASHBOARD_PASSWORD?.trim();

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "DASHBOARD_PASSWORD is missing in Vercel env" },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return NextResponse.json(
      { ok: false, error: "Wrong password in URL" },
      { status: 403 }
    );
  }

  await setPrivateSessionCookie(request);

  const response = NextResponse.json({
    ok: true,
    message: "Cookie set. Now open /api/debug-session",
    host: request.headers.get("host"),
  });

  applyPrivateSessionCookie(response, request);

  return response;
}
