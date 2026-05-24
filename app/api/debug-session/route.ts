import { NextRequest, NextResponse } from "next/server";
import {
  hasPrivateSessionFromRequest,
  PRIVATE_SESSION_COOKIE,
} from "@/lib/auth/private-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(PRIVATE_SESSION_COOKIE);
  return NextResponse.json({
    hasSession: hasPrivateSessionFromRequest(request),
    cookieExists: Boolean(cookie?.value),
    cookieNames: request.cookies.getAll().map((c) => c.name),
    host: request.headers.get("host"),
  });
}
