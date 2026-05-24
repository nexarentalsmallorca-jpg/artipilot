import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const PRIVATE_SESSION_COOKIE = "artipilot_private_session";
export const PRIVATE_SESSION_VALUE = "authenticated";

const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

type PrivateSessionCookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

function getHostnameFromRequest(request?: NextRequest) {
  const host = request?.headers.get("host") || "";
  return host.split(":")[0].toLowerCase();
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function readCookieFromHeader(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

  const cookieParts = cookieHeader.split(";");

  for (const cookiePart of cookieParts) {
    const [key, ...valueParts] = cookiePart.trim().split("=");

    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return undefined;
}

export function getPrivateSessionCookieOptions(
  request?: NextRequest
): PrivateSessionCookieOptions {
  const hostname = getHostnameFromRequest(request);
  const isLocal = isLocalHostname(hostname);

  return {
    httpOnly: true,
    secure: !isLocal,
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS_IN_SECONDS,
  };
}

export function getExpiredPrivateSessionCookieOptions(request?: NextRequest) {
  const cookieOptions = getPrivateSessionCookieOptions(request);

  return {
    ...cookieOptions,
    maxAge: 0,
  };
}

export function hasPrivateSessionFromRequest(request: NextRequest) {
  const cookieFromRequest = request.cookies.get(PRIVATE_SESSION_COOKIE)?.value;

  if (cookieFromRequest === PRIVATE_SESSION_VALUE) {
    return true;
  }

  const cookieFromHeader = readCookieFromHeader(
    request.headers.get("cookie"),
    PRIVATE_SESSION_COOKIE
  );

  return cookieFromHeader === PRIVATE_SESSION_VALUE;
}

export async function hasPrivateSessionFromCookies() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(PRIVATE_SESSION_COOKIE)?.value;

  return cookieValue === PRIVATE_SESSION_VALUE;
}

export async function isPrivateSessionValid(request: NextRequest) {
  if (hasPrivateSessionFromRequest(request)) {
    return true;
  }

  return hasPrivateSessionFromCookies();
}

export async function requirePrivateSession(request: NextRequest) {
  const isValid = await isPrivateSessionValid(request);

  if (isValid) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}