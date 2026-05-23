import { NextRequest, NextResponse } from "next/server";
import { PRIVATE_SESSION_COOKIE } from "@/lib/auth/privateSession";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));

  response.cookies.set(PRIVATE_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
