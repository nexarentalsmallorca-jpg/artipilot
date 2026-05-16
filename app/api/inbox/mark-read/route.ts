import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRow = {
  id: string;
  owner_user_id: string;
};

function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function hasColumnError(error: unknown) {
  const message = String(
    (error as { message?: string })?.message ||
      (error as { details?: string })?.details ||
      ""
  ).toLowerCase();

  return (
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("could not find")
  );
}

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
    console.error("Mark read auth error:", error);
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
    console.error("Mark read workspace error:", error);
    return null;
  }

  return (data as WorkspaceRow | null) || null;
}

async function markContactRead({
  workspace,
  userId,
  phone,
}: {
  workspace: WorkspaceRow;
  userId: string;
  phone: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_contacts")
    .update({
      unread_count: 0,
    })
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .eq("phone", phone)
    .select("*")
    .maybeSingle();

  if (error) {
    return {
      contact: null,
      error,
    };
  }

  return {
    contact: data,
    error: null,
  };
}

async function markInboundMessagesRead({
  workspace,
  userId,
  phone,
}: {
  workspace: WorkspaceRow;
  userId: string;
  phone: string;
}) {
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("artipilot_messages")
    .update({
      delivery_status: "read",
      read_at: now,
      delivery_updated_at: now,
    })
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .eq("contact_phone", phone)
    .eq("direction", "inbound");

  if (!error) {
    return;
  }

  if (hasColumnError(error)) {
    console.warn(
      "Mark read message status skipped because delivery columns do not exist yet:",
      error.message
    );
    return;
  }

  console.error("Mark inbound messages read error:", error);
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

    const { contact, error } = await markContactRead({
      workspace,
      userId: user.id,
      phone,
    });

    if (error) {
      console.error("Mark read update error:", error);

      return NextResponse.json(
        {
          error: error.message || "Failed to mark chat as read",
        },
        { status: 500 }
      );
    }

    if (!contact) {
      return NextResponse.json(
        {
          error: "Contact not found",
        },
        { status: 404 }
      );
    }

    await markInboundMessagesRead({
      workspace,
      userId: user.id,
      phone,
    });

    return NextResponse.json(
      {
        success: true,
        contact: {
          ...contact,
          unread_count: 0,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Mark read API error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Mark read API failed",
      },
      { status: 500 }
    );
  }
}