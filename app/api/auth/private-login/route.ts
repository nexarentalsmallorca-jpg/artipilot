import { NextRequest, NextResponse } from "next/server";
import {
  PRIVATE_SESSION_COOKIE,
  PRIVATE_SESSION_VALUE,
} from "@/lib/auth/private-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loginRedirect(request: NextRequest, error?: string) {
  const url = new URL("/login", request.url);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected) {
    return loginRedirect(request, "not_configured");
  }

  if (!password || password !== expected) {
    return loginRedirect(request, "incorrect");
  }

  const response = NextResponse.redirect(new URL("/dashboard/inbox", request.url));
  response.cookies.set(PRIVATE_SESSION_COOKIE, PRIVATE_SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
