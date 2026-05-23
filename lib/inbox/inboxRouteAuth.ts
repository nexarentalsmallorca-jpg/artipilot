import { NextRequest, NextResponse } from "next/server";
import { getPrivateDashboardWorkspace } from "@/lib/auth/dashboardAccess";
import { hasPrivateSessionFromRequest } from "@/lib/auth/private-session";

export type InboxWorkspace = {
  id: string;
  owner_user_id: string;
};

export type InboxAuthContext = {
  userId: string;
  workspace: InboxWorkspace;
};

export async function requireInboxApiAccess(
  request: NextRequest
): Promise<
  | { ok: true; ctx: InboxAuthContext }
  | { ok: false; response: NextResponse }
> {
  if (!hasPrivateSessionFromRequest(request)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const privateWorkspace = await getPrivateDashboardWorkspace();
  if (!privateWorkspace?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Workspace not configured. Set ARTIPILOT_WORKSPACE_ID in Vercel.",
        },
        { status: 503 }
      ),
    };
  }

  return {
    ok: true,
    ctx: {
      userId: privateWorkspace.owner_user_id,
      workspace: {
        id: privateWorkspace.id,
        owner_user_id: privateWorkspace.owner_user_id,
      },
    },
  };
}
