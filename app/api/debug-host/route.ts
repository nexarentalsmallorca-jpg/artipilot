import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();

  const privateHost =
    process.env.PRIVATE_DASHBOARD_HOST || "private.artipilot.com";

  return NextResponse.json({
    host,
    hostname,
    PRIVATE_DASHBOARD_HOST: process.env.PRIVATE_DASHBOARD_HOST || null,
    privateHost,
    isPrivateHost: hostname === privateHost,
    isPublicHost:
      hostname === "artipilot.com" || hostname === "www.artipilot.com",
    timestamp: new Date().toISOString(),
  });
}
