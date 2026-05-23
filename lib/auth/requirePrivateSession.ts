import { NextRequest, NextResponse } from "next/server";
import {
  isPrivateSessionCookie,
  PRIVATE_SESSION_COOKIE,
} from "@/lib/auth/privateSession";

export function isPrivateSessionValid(request: NextRequest): boolean {
  const value = request.cookies.get(PRIVATE_SESSION_COOKIE)?.value;
  return isPrivateSessionCookie(value);
}

export function requirePrivateSession(
  request: NextRequest
): NextResponse | null {
  if (!isPrivateSessionValid(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
