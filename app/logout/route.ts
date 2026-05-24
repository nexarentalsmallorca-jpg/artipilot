import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { PRIVATE_SESSION_COOKIE } from "@/lib/auth/private-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLEAR = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
};

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.set(PRIVATE_SESSION_COOKIE, "", CLEAR);

  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(PRIVATE_SESSION_COOKIE, "", CLEAR);
  return response;
}
