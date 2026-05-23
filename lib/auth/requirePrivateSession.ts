import { NextRequest, NextResponse } from "next/server";
import { hasPrivateSessionFromRequest } from "@/lib/auth/private-session";

export function isPrivateSessionValid(request: NextRequest): boolean {
  return hasPrivateSessionFromRequest(request);
}

export function requirePrivateSession(
  request: NextRequest
): NextResponse | null {
  if (!hasPrivateSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
