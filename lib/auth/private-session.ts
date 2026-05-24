import { NextRequest, NextResponse } from "next/server";

export const PRIVATE_SESSION_COOKIE = "artipilot_private_session";
export const PRIVATE_SESSION_VALUE = "authenticated";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

export function getPrivateSessionCookieOptions() {
  const secure =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

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

export function requirePrivateSession(
  request: NextRequest
): NextResponse | null {
  if (!hasPrivateSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
