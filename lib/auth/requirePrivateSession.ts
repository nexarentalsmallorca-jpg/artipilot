import { NextRequest, NextResponse } from "next/server";
import { hasPrivateDashboardSession } from "@/lib/auth/dashboardAccess";
import {
  isPrivateSessionCookie,
  PRIVATE_SESSION_COOKIE,
} from "@/lib/auth/privateSession";

export function isPrivateSessionValid(request: NextRequest): boolean {
  return hasPrivateDashboardSession(request);
}

export function requirePrivateSession(
  request: NextRequest
): NextResponse | null {
  if (!isPrivateSessionValid(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
