import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();

  const privateHost =
    process.env.PRIVATE_DASHBOARD_HOST || "private.artipilot.com";

  const hasPrivateHostEnv = Boolean(process.env.PRIVATE_DASHBOARD_HOST?.trim());

  return NextResponse.json({
    hostname,
    isPrivateHost: hostname === privateHost,
    PRIVATE_DASHBOARD_HOST: hasPrivateHostEnv ? "set" : "not set (using default)",
  });
}
