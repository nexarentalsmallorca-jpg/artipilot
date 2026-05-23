import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const PRIVATE_SESSION_COOKIE = "artipilot_private_session";
export const PRIVATE_SESSION_VALUE = "authenticated";

export function hasPrivateSessionFromRequest(request: NextRequest) {
  return request.cookies.get(PRIVATE_SESSION_COOKIE)?.value === PRIVATE_SESSION_VALUE;
}

export async function hasPrivateSessionFromServerCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(PRIVATE_SESSION_COOKIE)?.value === PRIVATE_SESSION_VALUE;
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
