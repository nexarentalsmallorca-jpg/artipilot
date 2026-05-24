import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  getPrivateSessionCookieOptions,
  PRIVATE_SESSION_COOKIE,
  PRIVATE_SESSION_VALUE,
} from "@/lib/auth/private-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToLogin(request: NextRequest, error?: string) {
  const url = new URL("/login", request.url);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = String(formData.get("password") || "").trim();
  const expected = process.env.DASHBOARD_PASSWORD?.trim();

  if (!expected) {
    return redirectToLogin(request, "not_configured");
  }

  if (!password || password !== expected) {
    return redirectToLogin(request, "incorrect");
  }

  const options = getPrivateSessionCookieOptions();
  const cookieStore = await cookies();
  cookieStore.set(PRIVATE_SESSION_COOKIE, PRIVATE_SESSION_VALUE, options);

  const response = NextResponse.redirect(
    new URL("/dashboard/inbox", request.url),
    303
  );
  response.cookies.set(PRIVATE_SESSION_COOKIE, PRIVATE_SESSION_VALUE, options);

  return response;
}

export async function GET(request: NextRequest) {
  return redirectToLogin(request);
}
