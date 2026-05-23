import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "artipilot_private_session";
const COOKIE_VALUE = "authenticated";
const REDIRECT_STATUS = 303;

function redirectToLogin(request: NextRequest, error?: string) {
  const url = new URL("/login", request.url);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url, REDIRECT_STATUS);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected) {
    return redirectToLogin(request, "not_configured");
  }

  if (!password || password !== expected) {
    return redirectToLogin(request, "incorrect");
  }

  const response = NextResponse.redirect(
    new URL("/dashboard/inbox", request.url),
    REDIRECT_STATUS
  );

  response.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
