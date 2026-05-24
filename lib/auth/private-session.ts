import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const PRIVATE_SESSION_COOKIE = "artipilot_private_session";
export const PRIVATE_SESSION_VALUE = "authenticated";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

function readCookieFromHeader(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return undefined;
}

export function getPrivateSessionCookieOptions(request?: NextRequest) {
  const host = request?.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  return {
    httpOnly: true,
    secure: !isLocal,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SEVEN_DAYS,
  };
}

export function hasPrivateSessionFromRequest(request: NextRequest) {
  const fromJar =
    request.cookies.get(PRIVATE_SESSION_COOKIE)?.value ===
    PRIVATE_SESSION_VALUE;

  if (fromJar) return true;

  const fromHeader = readCookieFromHeader(
    request.headers.get("cookie"),
    PRIVATE_SESSION_COOKIE
  );

  return fromHeader === PRIVATE_SESSION_VALUE;
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
