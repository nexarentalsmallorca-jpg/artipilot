import { NextRequest, NextResponse } from "next/server";
import { sendCustomerMessagePushNotification } from "@/lib/sendPushNotification";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRow = {
  id: string;
  owner_user_id: string;
};

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error("Push test auth error:", error);
    return null;
  }

  return user;
}

async function getMainWorkspace(userId: string): Promise<WorkspaceRow | null> {
  const envWorkspaceId = process.env.ARTIPILOT_WORKSPACE_ID;

  if (envWorkspaceId) {
    const { data, error } = await supabaseAdmin
      .from("artipilot_workspaces")
      .select("id, owner_user_id")
      .eq("id", envWorkspaceId)
      .maybeSingle();

    if (error) {
      console.error("Push test ENV workspace error:", error);
      return null;
    }

    if (data?.id) {
      return data as WorkspaceRow;
    }

    console.error("ARTIPILOT_WORKSPACE_ID was set but workspace was not found:", {
      envWorkspaceId,
    });

    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select("id, owner_user_id")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Push test user workspace error:", error);
    return null;
  }

  return (data as WorkspaceRow | null) || null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const workspace = await getMainWorkspace(user.id);

    if (!workspace?.id || !workspace?.owner_user_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Main workspace not found. Add ARTIPILOT_WORKSPACE_ID in Vercel or create a workspace.",
        },
        { status: 404 }
      );
    }

    await sendCustomerMessagePushNotification({
      workspaceId: workspace.id,
      ownerUserId: workspace.owner_user_id,
      customerName: "Test Customer",
      customerPhone: "34600000000",
      messagePreview: "This is a test notification from Artipilot.",
    });

    return NextResponse.json({
      success: true,
      message: "Test notification sent.",
      workspaceId: workspace.id,
      ownerUserId: workspace.owner_user_id,
    });
  } catch (error) {
    console.error("Push test route error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not send test notification.",
      },
      { status: 500 }
    );
  }
}   