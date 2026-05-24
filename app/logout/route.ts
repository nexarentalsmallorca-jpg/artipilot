import { NextRequest, NextResponse } from "next/server";
import {
  getPrivateSessionCookieOptions,
  PRIVATE_SESSION_COOKIE,
} from "@/lib/auth/private-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);

  response.cookies.set(PRIVATE_SESSION_COOKIE, "", {
    ...getPrivateSessionCookieOptions(request),
    maxAge: 0,
  });

  return response;
}
