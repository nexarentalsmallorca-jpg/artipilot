import { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/auth/config";
import { hasPrivateSessionFromRequest } from "@/lib/auth/private-session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const PRIVATE_DASHBOARD_ACTOR_ID = "private-dashboard-session";

export function hasPrivateDashboardSession(request: NextRequest): boolean {
  return hasPrivateSessionFromRequest(request);
}

export async function getUserFromBearer(request: NextRequest): Promise<User | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

export async function getPrivateDashboardWorkspace(): Promise<{
  id: string;
  owner_user_id: string;
} | null> {
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
        owner_user_id: data.owner_user_id || PRIVATE_DASHBOARD_ACTOR_ID,
      };
    }
    return { id: forced, owner_user_id: PRIVATE_DASHBOARD_ACTOR_ID };
  }

  const { data } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select("id, owner_user_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.id) return null;
  return {
    id: data.id,
    owner_user_id: data.owner_user_id || PRIVATE_DASHBOARD_ACTOR_ID,
  };
}

/** Password-login dashboard or Supabase admin bearer. */
export async function resolveDashboardActor(
  request: NextRequest
): Promise<{ userId: string; email: string; mode: "cookie" | "bearer" } | null> {
  if (hasPrivateDashboardSession(request)) {
    const workspace = await getPrivateDashboardWorkspace();
    if (!workspace) return null;
    return {
      userId: workspace.owner_user_id,
      email: process.env.PRIVATE_DASHBOARD_ADMIN_EMAIL || "private@artipilot.local",
      mode: "cookie",
    };
  }

  const user = await getUserFromBearer(request);
  if (!user?.id) return null;
  if (!isAdminEmail(user.email)) return null;

  return {
    userId: user.id,
    email: user.email || "",
    mode: "bearer",
  };
}

export async function getWorkspaceIdForActor(
  request: NextRequest,
  userId: string
): Promise<string | null> {
  const forced = process.env.ARTIPILOT_WORKSPACE_ID?.trim();
  if (forced) return forced;

  if (hasPrivateDashboardSession(request)) {
    const workspace = await getPrivateDashboardWorkspace();
    return workspace?.id || null;
  }

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
