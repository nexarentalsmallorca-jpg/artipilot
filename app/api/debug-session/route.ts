import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get("artipilot_private_session")?.value;

  return NextResponse.json({
    hasSession: cookie === "authenticated",
    cookieExists: Boolean(cookie),
    cookieValuePreview: cookie ? "exists" : "missing",
    host: request.headers.get("host"),
    timestamp: new Date().toISOString(),
  });
}
