import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRow = {
  id: string;
  owner_user_id: string;
};

type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function hasColumnError(error: unknown) {
  const errorLike = error as SupabaseErrorLike;

  const message = String(
    errorLike?.message || errorLike?.details || errorLike?.hint || ""
  ).toLowerCase();

  return (
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("does not exist")
  );
}

function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function cleanText(value: unknown) {
  return String(value || "").trim();
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
    console.error("Report chat auth error:", error);
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
    console.error("Report chat workspace error:", error);
    return null;
  }

  return (data as WorkspaceRow | null) || null;
}

async function getContact({
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
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    console.error("Report chat contact lookup error:", error);
    return null;
  }

  return data;
}

async function saveReportMessage({
  workspace,
  userId,
  phone,
  reason,
  details,
}: {
  workspace: WorkspaceRow;
  userId: string;
  phone: string;
  reason: string;
  details: string;
}) {
  const now = new Date().toISOString();

  const content = details
    ? `Chat reported. Reason: ${reason}. Details: ${details}`
    : `Chat reported. Reason: ${reason}.`;

  const { error } = await supabaseAdmin.from("artipilot_messages").insert({
    workspace_id: workspace.id,
    owner_user_id: userId,
    contact_phone: phone,
    whatsapp_message_id: null,
    role: "system",
    direction: "outbound",
    message_type: "system",
    content,
    raw_payload: {
      report_reason: reason,
      report_details: details || null,
    },
    created_at: now,
  });

  if (error) {
    console.error("Report chat system message error:", error);
  }
}

async function updateContactReportStatus({
  workspace,
  userId,
  phone,
  reason,
}: {
  workspace: WorkspaceRow;
  userId: string;
  phone: string;
  reason: string;
}) {
  const updateData = {
    needs_human_attention: true,
    human_attention_reason: `Reported chat: ${reason}`,
    ai_enabled: false,
    conversation_status: "open",
  };

  const fallbackData = {
    ai_enabled: false,
  };

  const { data, error } = await supabaseAdmin
    .from("artipilot_contacts")
    .update(updateData)
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .eq("phone", phone)
    .select("*")
    .maybeSingle();

  if (!error) {
    return data;
  }

  if (!hasColumnError(error)) {
    console.error("Report chat contact update error:", error);
    throw new Error(error.message || "Failed to update reported chat");
  }

  console.warn("Report chat fallback used:", error.message);

  const { data: fallbackResult, error: fallbackError } = await supabaseAdmin
    .from("artipilot_contacts")
    .update(fallbackData)
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .eq("phone", phone)
    .select("*")
    .maybeSingle();

  if (fallbackError) {
    console.error("Report chat fallback update error:", fallbackError);
    throw new Error(fallbackError.message || "Failed to update reported chat");
  }

  return fallbackResult;
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

    const body = (await request.json()) as Record<string, unknown>;

    const phone = normalizePhone(String(body.phone || ""));
    const reason = cleanText(body.reason);
    const details = cleanText(body.details);

    if (!phone) {
      return NextResponse.json(
        {
          error: "Missing contact phone",
        },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        {
          error: "Missing report reason",
        },
        { status: 400 }
      );
    }

    const contact = await getContact({
      workspace,
      userId: user.id,
      phone,
    });

    if (!contact?.id) {
      return NextResponse.json(
        {
          error: "Contact not found",
        },
        { status: 404 }
      );
    }

    await saveReportMessage({
      workspace,
      userId: user.id,
      phone,
      reason,
      details,
    });

    const updatedContact = await updateContactReportStatus({
      workspace,
      userId: user.id,
      phone,
      reason,
    });

    return NextResponse.json(
      {
        success: true,
        contact: updatedContact,
        message: "Report saved successfully",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Report chat API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Report chat API failed",
      },
      { status: 500 }
    );
  }
}