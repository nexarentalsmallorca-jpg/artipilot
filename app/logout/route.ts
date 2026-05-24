import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLEAR_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
};

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.set("artipilot_private_session", "", CLEAR_OPTS);
  cookieStore.set("artipilot_extra_unlock", "", CLEAR_OPTS);

  const response = NextResponse.redirect(new URL("/login", request.url), 303);

  response.cookies.set("artipilot_private_session", "", CLEAR_OPTS);
  response.cookies.set("artipilot_extra_unlock", "", CLEAR_OPTS);

  return response;
}
