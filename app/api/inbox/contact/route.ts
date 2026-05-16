import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRow = {
  id: string;
  owner_user_id: string;
};

type ContactUpdateData = {
  ai_enabled?: boolean;
  unread_count?: number;

  needs_human_attention?: boolean;
  human_attention_reason?: string | null;
  conversation_status?: "open" | "closed" | "snoozed" | "blocked" | string;
  assigned_to?: string | null;
  last_ai_summary?: string | null;

  is_blocked?: boolean;
  is_muted?: boolean;
  muted_until?: string | null;
  is_starred?: boolean;
  customer_notes?: string | null;
  profile_image_url?: string | null;
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
    console.error("Contact auth error:", error);
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
    console.error("Contact workspace error:", error);
    return null;
  }

  return (data as WorkspaceRow | null) || null;
}

function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function cleanNullableText(value: unknown) {
  const clean = String(value || "").trim();
  return clean || null;
}

function cleanStatus(value: unknown) {
  const status = String(value || "").trim().toLowerCase();

  if (["open", "closed", "snoozed", "blocked"].includes(status)) {
    return status;
  }

  return "";
}

function cleanMutedUntil(value: unknown) {
  if (value === null) return null;

  const clean = String(value || "").trim();

  if (!clean) return null;

  const date = new Date(clean);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function buildUpdateData(body: Record<string, unknown>) {
  const updateData: ContactUpdateData = {};
  const fallbackData: ContactUpdateData = {};

  if (typeof body.ai_enabled === "boolean") {
    updateData.ai_enabled = body.ai_enabled;
    fallbackData.ai_enabled = body.ai_enabled;
  }

  if (
    typeof body.unread_count === "number" &&
    Number.isFinite(body.unread_count)
  ) {
    const cleanUnreadCount = Math.max(0, Math.floor(body.unread_count));

    updateData.unread_count = cleanUnreadCount;
    fallbackData.unread_count = cleanUnreadCount;
  }

  /*
    Support both names:
    - New DB-safe name: needs_human_attention
    - Frontend alias: human_attention
  */
  if (typeof body.needs_human_attention === "boolean") {
    updateData.needs_human_attention = body.needs_human_attention;

    if (body.needs_human_attention === false) {
      updateData.human_attention_reason = null;
    }
  }

  if (typeof body.human_attention === "boolean") {
    updateData.needs_human_attention = body.human_attention;

    if (body.human_attention === false) {
      updateData.human_attention_reason = null;
    }
  }

  if (typeof body.human_attention_reason === "string") {
    updateData.human_attention_reason = cleanNullableText(
      body.human_attention_reason
    );
  }

  if (body.human_attention_reason === null) {
    updateData.human_attention_reason = null;
  }

  if (typeof body.conversation_status === "string") {
    const status = cleanStatus(body.conversation_status);

    if (status) {
      updateData.conversation_status = status;

      if (status === "blocked") {
        updateData.is_blocked = true;
        updateData.ai_enabled = false;
        fallbackData.ai_enabled = false;
      }

      if (status === "closed") {
        updateData.needs_human_attention = false;
        updateData.human_attention_reason = null;
      }

      if (status === "open") {
        updateData.is_blocked = false;
      }
    }
  }

  /*
    Support frontend alias:
    closed: true/false
  */
  if (typeof body.closed === "boolean") {
    updateData.conversation_status = body.closed ? "closed" : "open";

    if (body.closed) {
      updateData.needs_human_attention = false;
      updateData.human_attention_reason = null;
    }
  }

  if (typeof body.assigned_to === "string") {
    updateData.assigned_to = cleanNullableText(body.assigned_to);
  }

  if (body.assigned_to === null) {
    updateData.assigned_to = null;
  }

  if (typeof body.last_ai_summary === "string") {
    updateData.last_ai_summary = cleanNullableText(body.last_ai_summary);
  }

  if (body.last_ai_summary === null) {
    updateData.last_ai_summary = null;
  }

  /*
    Support both names:
    - New DB-safe name: is_blocked
    - Frontend alias: blocked
  */
  if (typeof body.is_blocked === "boolean") {
    updateData.is_blocked = body.is_blocked;

    if (body.is_blocked) {
      updateData.conversation_status = "blocked";
      updateData.ai_enabled = false;
      fallbackData.ai_enabled = false;
    }

    if (!body.is_blocked && body.conversation_status === undefined) {
      updateData.conversation_status = "open";
    }
  }

  if (typeof body.blocked === "boolean") {
    updateData.is_blocked = body.blocked;

    if (body.blocked) {
      updateData.conversation_status = "blocked";
      updateData.ai_enabled = false;
      fallbackData.ai_enabled = false;
    }

    if (!body.blocked && body.conversation_status === undefined) {
      updateData.conversation_status = "open";
    }
  }

  if (typeof body.is_muted === "boolean") {
    updateData.is_muted = body.is_muted;

    if (!body.is_muted) {
      updateData.muted_until = null;
    }
  }

  if (body.muted_until !== undefined) {
    const cleanUntil = cleanMutedUntil(body.muted_until);

    updateData.muted_until = cleanUntil;
    updateData.is_muted = Boolean(cleanUntil);
  }

  /*
    Support both names:
    - New DB-safe name: is_starred
    - Frontend alias: pinned
  */
  if (typeof body.is_starred === "boolean") {
    updateData.is_starred = body.is_starred;
  }

  if (typeof body.pinned === "boolean") {
    updateData.is_starred = body.pinned;
  }

  if (typeof body.customer_notes === "string") {
    updateData.customer_notes = cleanNullableText(body.customer_notes);
  }

  if (body.customer_notes === null) {
    updateData.customer_notes = null;
  }

  if (typeof body.profile_note === "string") {
    updateData.customer_notes = cleanNullableText(body.profile_note);
  }

  if (body.profile_note === null) {
    updateData.customer_notes = null;
  }

  if (typeof body.profile_image_url === "string") {
    updateData.profile_image_url = cleanNullableText(body.profile_image_url);
  }

  if (body.profile_image_url === null) {
    updateData.profile_image_url = null;
  }

  if (typeof body.customer_photo_url === "string") {
    updateData.profile_image_url = cleanNullableText(body.customer_photo_url);
  }

  if (body.customer_photo_url === null) {
    updateData.profile_image_url = null;
  }

  return {
    updateData,
    fallbackData,
  };
}

async function updateContact({
  workspace,
  userId,
  phone,
  updateData,
  fallbackData,
}: {
  workspace: WorkspaceRow;
  userId: string;
  phone: string;
  updateData: ContactUpdateData;
  fallbackData: ContactUpdateData;
}) {
  const { data, error } = await supabaseAdmin
    .from("artipilot_contacts")
    .update(updateData)
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .eq("phone", phone)
    .select("*")
    .maybeSingle();

  if (!error) {
    return {
      data,
      error: null,
      usedFallback: false,
    };
  }

  if (!hasColumnError(error)) {
    return {
      data: null,
      error,
      usedFallback: false,
    };
  }

  console.warn("Contact update fallback used:", error.message);

  if (Object.keys(fallbackData).length === 0) {
    return {
      data: null,
      error,
      usedFallback: true,
    };
  }

  const { data: fallbackResult, error: fallbackError } = await supabaseAdmin
    .from("artipilot_contacts")
    .update(fallbackData)
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .eq("phone", phone)
    .select("*")
    .maybeSingle();

  return {
    data: fallbackResult,
    error: fallbackError,
    usedFallback: true,
  };
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

    if (!phone) {
      return NextResponse.json(
        {
          error: "Missing contact phone",
        },
        { status: 400 }
      );
    }

    const { updateData, fallbackData } = buildUpdateData(body);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error: "Nothing to update",
        },
        { status: 400 }
      );
    }

    const { data, error, usedFallback } = await updateContact({
      workspace,
      userId: user.id,
      phone,
      updateData,
      fallbackData,
    });

    if (error) {
      console.error("Contact update error:", error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Failed to update contact. Check Supabase contact columns.",
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Contact not found or this action needs extra Supabase columns.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        contact: data,
        usedFallback,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Contact API error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Contact API failed",
      },
      { status: 500 }
    );
  }
}