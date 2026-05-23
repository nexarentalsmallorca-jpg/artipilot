import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = request.cookies.get("artipilot_private_session")?.value;

  return NextResponse.json({
    hasSession: session === "authenticated",
    cookieValueExists: Boolean(session),
    cookieValuePreview: session ? "exists" : "missing",
    timestamp: new Date().toISOString(),
  });
}
