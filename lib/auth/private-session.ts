import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const PRIVATE_SESSION_COOKIE = "artipilot_private_session";
export const PRIVATE_SESSION_VALUE = "authenticated";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

export function getPrivateSessionCookieOptions(request?: NextRequest) {
  const proto = request?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure =
    proto === "https" ||
    process.env.VERCEL === "1" ||
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SEVEN_DAYS,
  };
}

export async function setPrivateSessionCookie(request?: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.set(
    PRIVATE_SESSION_COOKIE,
    PRIVATE_SESSION_VALUE,
    getPrivateSessionCookieOptions(request)
  );
}

export function applyPrivateSessionCookie(
  response: NextResponse,
  request?: NextRequest
) {
  response.cookies.set(
    PRIVATE_SESSION_COOKIE,
    PRIVATE_SESSION_VALUE,
    getPrivateSessionCookieOptions(request)
  );
  return response;
}

export function hasPrivateSessionFromRequest(request: NextRequest) {
  const cookieValue = request.cookies.get(PRIVATE_SESSION_COOKIE)?.value;
  return cookieValue === PRIVATE_SESSION_VALUE;
}

export async function hasPrivateSessionFromServerCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(PRIVATE_SESSION_COOKIE)?.value === PRIVATE_SESSION_VALUE;
}

export function unauthorizedJson() {
  return NextResponse.json(
    {
      error: "Unauthorized",
      reason: "Private dashboard cookie missing or invalid",
      expectedCookie: PRIVATE_SESSION_COOKIE,
    },
    { status: 401 }
  );
}

export function unauthorizedJsonWithSource(request: NextRequest, source: string) {
  return NextResponse.json(
    {
      error: "Unauthorized",
      source,
      cookieExists: Boolean(request.cookies.get(PRIVATE_SESSION_COOKIE)?.value),
      host: request.headers.get("host"),
      reason: "Private dashboard cookie missing or invalid",
      expectedCookie: PRIVATE_SESSION_COOKIE,
    },
    { status: 401 }
  );
}
