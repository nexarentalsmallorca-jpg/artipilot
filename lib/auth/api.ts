import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getPrivateDashboardWorkspace,
  getUserFromBearer,
  hasPrivateDashboardSession,
  PRIVATE_DASHBOARD_ACTOR_ID,
} from "@/lib/auth/dashboardAccess";
import { isAdminEmail } from "@/lib/auth/config";
import type { User } from "@supabase/supabase-js";

export { getUserFromBearer };

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireAdminApiUser(request: NextRequest): Promise<
  | { user: User; error: null }
  | { user: null; error: NextResponse }
> {
  if (hasPrivateDashboardSession(request)) {
    const workspace = await getPrivateDashboardWorkspace();
    if (!workspace) {
      return {
        user: null,
        error: NextResponse.json(
          { error: "No workspace configured for private dashboard" },
          { status: 503 }
        ),
      };
    }

    return {
      user: {
        id: workspace.owner_user_id || PRIVATE_DASHBOARD_ACTOR_ID,
        email: process.env.PRIVATE_DASHBOARD_ADMIN_EMAIL || "private@artipilot.local",
      } as User,
      error: null,
    };
  }

  const user = await getUserFromBearer(request);
  if (!user) {
    return { user: null, error: unauthorizedResponse() };
  }
  if (!isAdminEmail(user.email)) {
    return { user: null, error: forbiddenResponse("Admin access required") };
  }
  return { user, error: null };
}

export async function getWorkspaceIdForAdmin(
  userId: string,
  request?: NextRequest
): Promise<string | null> {
  if (request && hasPrivateDashboardSession(request)) {
    const workspace = await getPrivateDashboardWorkspace();
    return workspace?.id || null;
  }

  const forced = process.env.ARTIPILOT_WORKSPACE_ID?.trim();
  if (forced) return forced;

  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select("id")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Workspace lookup error:", error.message);
    return null;
  }

  return data?.id || null;
}
