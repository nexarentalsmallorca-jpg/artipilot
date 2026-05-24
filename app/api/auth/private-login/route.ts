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

  if (error) {
    url.searchParams.set("error", error);
  }

  return NextResponse.redirect(url, 303);
}

function redirectToPrivateInbox(request: NextRequest) {
  return NextResponse.redirect(new URL("/dashboard/inbox", request.url), 303);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const password = String(formData.get("password") || "").trim();
    const expectedPassword = process.env.DASHBOARD_PASSWORD?.trim();

    if (!expectedPassword) {
      return redirectToLogin(request, "not_configured");
    }

    if (!password || password !== expectedPassword) {
      return redirectToLogin(request, "incorrect");
    }

    const cookieOptions = getPrivateSessionCookieOptions(request);

    const response = redirectToPrivateInbox(request);

    response.cookies.set(
      PRIVATE_SESSION_COOKIE,
      PRIVATE_SESSION_VALUE,
      cookieOptions
    );

    return response;
  } catch (error) {
    console.error("Private login error:", error);
    return redirectToLogin(request, "server_error");
  }
}

export async function GET(request: NextRequest) {
  return redirectToLogin(request);
}