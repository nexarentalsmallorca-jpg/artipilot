import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminEmail } from "@/lib/auth/config";
import type { User } from "@supabase/supabase-js";

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
  const user = await getUserFromBearer(request);
  if (!user) {
    return { user: null, error: unauthorizedResponse() };
  }
  if (!isAdminEmail(user.email)) {
    return { user: null, error: forbiddenResponse("Admin access required") };
  }
  return { user, error: null };
}

export async function getWorkspaceIdForAdmin(userId: string): Promise<string | null> {
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
