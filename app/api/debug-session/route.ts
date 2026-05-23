import { NextRequest, NextResponse } from "next/server";
import {
  hasPrivateSessionFromRequest,
  PRIVATE_SESSION_COOKIE,
} from "@/lib/auth/private-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw = request.cookies.get(PRIVATE_SESSION_COOKIE)?.value;

  return NextResponse.json({
    hasSession: hasPrivateSessionFromRequest(request),
    cookieExists: Boolean(raw),
  });
}
