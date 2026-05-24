import { NextRequest, NextResponse } from "next/server";
import { PRIVATE_SESSION_COOKIE } from "@/lib/auth/private-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(PRIVATE_SESSION_COOKIE)?.value;
  const cookieNames = request.cookies.getAll().map((c) => c.name);

  return NextResponse.json({
    hasSession: cookie === "authenticated",
    cookieExists: Boolean(cookie),
    host: request.headers.get("host"),
    cookieNames,
    passwordConfigured: Boolean(process.env.DASHBOARD_PASSWORD?.trim()),
    timestamp: new Date().toISOString(),
  });
}
