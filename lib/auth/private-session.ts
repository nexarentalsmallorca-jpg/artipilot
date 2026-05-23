import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const PRIVATE_SESSION_COOKIE = "artipilot_private_session";
export const PRIVATE_SESSION_VALUE = "authenticated";

export async function hasPrivateSessionFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(PRIVATE_SESSION_COOKIE)?.value === PRIVATE_SESSION_VALUE;
}

export function hasPrivateSessionFromRequest(request: NextRequest) {
  return request.cookies.get(PRIVATE_SESSION_COOKIE)?.value === PRIVATE_SESSION_VALUE;
}

export function privateUnauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
