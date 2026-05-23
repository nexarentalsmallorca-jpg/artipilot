import { NextRequest, NextResponse } from "next/server";
import {
  hasPrivateSessionFromRequest,
  unauthorizedJson,
} from "@/lib/auth/private-session";

export function isPrivateSessionValid(request: NextRequest): boolean {
  return hasPrivateSessionFromRequest(request);
}

export function requirePrivateSession(
  request: NextRequest
): NextResponse | null {
  if (!hasPrivateSessionFromRequest(request)) {
    return unauthorizedJson();
  }
  return null;
}
