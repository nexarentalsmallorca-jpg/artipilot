import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const PRIVATE_SESSION_COOKIE = "artipilot_private_session";
export const PRIVATE_SESSION_VALUE = "authenticated";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

export function getPrivateSessionCookieOptions(request?: NextRequest) {
  const proto = request?.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
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

export function hasPrivateSessionFromRequest(request: NextRequest) {
  return (
    request.cookies.get(PRIVATE_SESSION_COOKIE)?.value ===
    PRIVATE_SESSION_VALUE
  );
}

export async function hasPrivateSessionFromCookies() {
  const cookieStore = await cookies();
  return (
    cookieStore.get(PRIVATE_SESSION_COOKIE)?.value === PRIVATE_SESSION_VALUE
  );
}

export async function isPrivateSessionValid(request: NextRequest) {
  if (hasPrivateSessionFromRequest(request)) return true;
  return hasPrivateSessionFromCookies();
}

export async function requirePrivateSession(request: NextRequest) {
  if (await isPrivateSessionValid(request)) {
    return null;
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
