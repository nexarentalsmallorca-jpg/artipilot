import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth/config";
import {
  getPrivateDashboardWorkspace,
  getUserFromBearer,
  hasPrivateDashboardSession,
} from "@/lib/auth/dashboardAccess";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type InboxWorkspace = {
  id: string;
  owner_user_id: string;
};

export type InboxAuthContext = {
  userId: string;
  workspace: InboxWorkspace;
};

async function getWorkspaceForUser(userId: string): Promise<InboxWorkspace | null> {
  const forced = process.env.ARTIPILOT_WORKSPACE_ID?.trim();
  if (forced) {
    const { data } = await supabaseAdmin
      .from("artipilot_workspaces")
      .select("id, owner_user_id")
      .eq("id", forced)
      .maybeSingle();
    if (data?.id) {
      return {
        id: data.id,
        owner_user_id: data.owner_user_id || userId,
      };
    }
    return { id: forced, owner_user_id: userId };
  }

  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select("id, owner_user_id")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Inbox workspace error:", error);
    return null;
  }

  if (!data?.id) return null;
  return data as InboxWorkspace;
}

export async function requireInboxApiAccess(
  request: NextRequest
): Promise<
  | { ok: true; ctx: InboxAuthContext }
  | { ok: false; response: NextResponse }
> {
  if (hasPrivateDashboardSession(request)) {
    const privateWorkspace = await getPrivateDashboardWorkspace();
    if (!privateWorkspace?.id) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
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

  const user = await getUserFromBearer(request);
  if (!user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!isAdminEmail(user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Workspace not found" }, { status: 404 }),
    };
  }

  return {
    ok: true,
    ctx: { userId: user.id, workspace },
  };
}
