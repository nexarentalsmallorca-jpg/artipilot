import { NextRequest, NextResponse } from "next/server";
import {
  getExpiredPrivateSessionCookieOptions,
  PRIVATE_SESSION_COOKIE,
} from "@/lib/auth/private-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url), 303);
}

export async function GET(request: NextRequest) {
  const response = redirectToLogin(request);

  response.cookies.set(
    PRIVATE_SESSION_COOKIE,
    "",
    getExpiredPrivateSessionCookieOptions(request)
  );

  return response;
}

export async function POST(request: NextRequest) {
  const response = redirectToLogin(request);

  response.cookies.set(
    PRIVATE_SESSION_COOKIE,
    "",
    getExpiredPrivateSessionCookieOptions(request)
  );

  return response;
}