import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const PRIVATE_SESSION_COOKIE = "artipilot_private_session";
export const PRIVATE_SESSION_VALUE = "authenticated";

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
