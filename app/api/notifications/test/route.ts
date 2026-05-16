import { NextRequest, NextResponse } from "next/server";
import { sendCustomerMessagePushNotification } from "@/lib/sendPushNotification";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function getWorkspace(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select("id, owner_user_id")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Push test workspace error:", error);
    return null;
  }

  return data || null;
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

    const workspace = await getWorkspace(user.id);

    if (!workspace?.id) {
      return NextResponse.json(
        { success: false, error: "Workspace not found." },
        { status: 404 }
      );
    }

    await sendCustomerMessagePushNotification({
      workspaceId: workspace.id,
      ownerUserId: user.id,
      customerName: "Test Customer",
      customerPhone: "34600000000",
      messagePreview: "This is a test notification from Artipilot.",
    });

    return NextResponse.json({
      success: true,
      message: "Test notification sent.",
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