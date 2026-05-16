import { NextRequest, NextResponse } from "next/server";
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

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error("Delete chat auth error:", error);
    return null;
  }

  return user;
}

async function getWorkspaceForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_workspaces")
    .select("id, owner_user_id")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Delete chat workspace error:", error);
    return null;
  }

  return (data as WorkspaceRow | null) || null;
}

function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const workspace = await getWorkspaceForUser(user.id);

    if (!workspace?.id) {
      return NextResponse.json(
        {
          error: "Workspace not found",
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const phone = normalizePhone(String(body?.phone || ""));

    if (!phone) {
      return NextResponse.json(
        {
          error: "Missing contact phone",
        },
        { status: 400 }
      );
    }

    const { error: messagesError } = await supabaseAdmin
      .from("artipilot_messages")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("owner_user_id", user.id)
      .eq("contact_phone", phone);

    if (messagesError) {
      console.error("Delete chat messages error:", messagesError);

      return NextResponse.json(
        {
          error: messagesError.message || "Failed to delete chat messages",
        },
        { status: 500 }
      );
    }

    const { error: contactError } = await supabaseAdmin
      .from("artipilot_contacts")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("owner_user_id", user.id)
      .eq("phone", phone);

    if (contactError) {
      console.error("Delete chat contact error:", contactError);

      return NextResponse.json(
        {
          error: contactError.message || "Failed to delete chat contact",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        phone,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Delete chat API error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Delete chat failed",
      },
      { status: 500 }
    );
  }
}