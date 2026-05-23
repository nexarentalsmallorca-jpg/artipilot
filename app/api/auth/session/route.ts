import { NextRequest, NextResponse } from "next/server";
import { hasPrivateSessionFromRequest } from "@/lib/auth/private-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    authenticated: hasPrivateSessionFromRequest(request),
    mode: "password_cookie",
  });
}
