import { NextRequest, NextResponse } from "next/server";
import {
  applyPrivateSessionCookie,
  setPrivateSessionCookie,
} from "@/lib/auth/private-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REDIRECT_STATUS = 303;

function redirectToLogin(request: NextRequest, error?: string) {
  const url = new URL("/login", request.url);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url, REDIRECT_STATUS);
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

  await setPrivateSessionCookie(request);

  const response = NextResponse.redirect(
    new URL("/dashboard/inbox", request.url),
    REDIRECT_STATUS
  );

  applyPrivateSessionCookie(response, request);

  return response;
}
