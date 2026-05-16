import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRow = {
  id: string;
  owner_user_id: string;
};

type WhatsAppSendResponse = {
  messages?: {
    id?: string;
  }[];
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
};

type SendBody = {
  to?: string;
  message?: string;
  type?: "text";
};

type MessageInsertResult = {
  whatsappMessageId: string | null;
  message: unknown | null;
};

function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function getAccessToken() {
  return process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
}

function getPhoneNumberId() {
  return process.env.WHATSAPP_PHONE_NUMBER_ID;
}

function hasColumnError(error: unknown) {
  const message = String(
    (error as { message?: string })?.message ||
      (error as { details?: string })?.details ||
      (error as { hint?: string })?.hint ||
      ""
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

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error("Send auth error:", error);
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
    console.error("Send workspace error:", error);
    return null;
  }

  return (data as WorkspaceRow | null) || null;
}

function sanitizeWhatsAppText(message: string) {
  return String(message || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

async function sendWhatsAppText({
  to,
  message,
}: {
  to: string;
  message: string;
}) {
  const accessToken = getAccessToken();
  const phoneNumberId = getPhoneNumberId();

  if (!accessToken) {
    throw new Error("Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_TOKEN");
  }

  if (!phoneNumberId) {
    throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID");
  }

  const whatsappRes = await fetch(
    `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: true,
          body: message,
        },
      }),
    }
  );

  const whatsappData = (await whatsappRes.json()) as WhatsAppSendResponse;

  if (!whatsappRes.ok) {
    console.error("WhatsApp manual send error:", whatsappData);

    const errorMessage =
      whatsappData?.error?.message ||
      whatsappData?.error?.code ||
      "Failed to send WhatsApp message";

    throw new Error(String(errorMessage));
  }

  return whatsappData;
}

async function saveOutgoingMessage({
  workspace,
  userId,
  to,
  message,
  whatsappData,
  now,
}: {
  workspace: WorkspaceRow;
  userId: string;
  to: string;
  message: string;
  whatsappData: WhatsAppSendResponse;
  now: string;
}): Promise<MessageInsertResult> {
  const whatsappMessageId = whatsappData?.messages?.[0]?.id || null;

  const fullPayload = {
    workspace_id: workspace.id,
    owner_user_id: userId,
    contact_phone: to,
    whatsapp_message_id: whatsappMessageId,
    role: "manual",
    direction: "outbound",
    message_type: "text",
    content: message,
    raw_payload: whatsappData,
    created_at: now,

    delivery_status: whatsappMessageId ? "sent" : "failed",
    delivery_updated_at: now,
    delivered_at: null,
    read_at: null,
    delivery_error: null,

    media_id: null,
    media_url: null,
    media_mime_type: null,
    media_filename: null,
    media_size: null,
    media_storage_path: null,

    latitude: null,
    longitude: null,
    location_name: null,
    location_address: null,

    link_url: null,
    translated_text: null,
    translated_language: null,
  };

  const fallbackPayload = {
    workspace_id: workspace.id,
    owner_user_id: userId,
    contact_phone: to,
    whatsapp_message_id: whatsappMessageId,
    role: "manual",
    direction: "outbound",
    message_type: "text",
    content: message,
    raw_payload: whatsappData,
    created_at: now,
  };

  const { data, error } = await supabaseAdmin
    .from("artipilot_messages")
    .insert(fullPayload)
    .select("*")
    .maybeSingle();

  if (!error) {
    return {
      whatsappMessageId,
      message: data,
    };
  }

  if (!hasColumnError(error)) {
    console.error("Error saving outgoing manual message:", error);

    return {
      whatsappMessageId,
      message: null,
    };
  }

  console.warn("Manual send message fallback used:", error.message);

  const { data: fallbackData, error: fallbackError } = await supabaseAdmin
    .from("artipilot_messages")
    .insert(fallbackPayload)
    .select("*")
    .maybeSingle();

  if (fallbackError) {
    console.error("Error saving outgoing manual message fallback:", fallbackError);
  }

  return {
    whatsappMessageId,
    message: fallbackData || null,
  };
}

async function updateOrCreateContactAfterManualSend({
  workspace,
  userId,
  to,
  message,
  now,
}: {
  workspace: WorkspaceRow;
  userId: string;
  to: string;
  message: string;
  now: string;
}) {
  const { data: existingContact, error: lookupError } = await supabaseAdmin
    .from("artipilot_contacts")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("owner_user_id", userId)
    .eq("phone", to)
    .maybeSingle();

  if (lookupError) {
    console.error("Manual send contact lookup error:", lookupError);
  }

  if (existingContact?.id) {
    const fullUpdate = {
      last_message: message,
      last_message_at: now,
      unread_count: 0,
      conversation_status:
        existingContact.conversation_status === "blocked"
          ? "blocked"
          : existingContact.conversation_status || "open",
    };

    const fallbackUpdate = {
      last_message: message,
      last_message_at: now,
      unread_count: 0,
    };

    const { error: updateError } = await supabaseAdmin
      .from("artipilot_contacts")
      .update(fullUpdate)
      .eq("id", existingContact.id);

    if (!updateError) return existingContact.id;

    if (!hasColumnError(updateError)) {
      console.error("Error updating contact after manual send:", updateError);
      return existingContact.id;
    }

    console.warn("Manual send contact update fallback used:", updateError.message);

    const { error: fallbackError } = await supabaseAdmin
      .from("artipilot_contacts")
      .update(fallbackUpdate)
      .eq("id", existingContact.id);

    if (fallbackError) {
      console.error("Error updating contact after manual send fallback:", fallbackError);
    }

    return existingContact.id;
  }

  const fullInsert = {
    workspace_id: workspace.id,
    owner_user_id: userId,
    phone: to,
    name: null,
    last_message: message,
    last_message_at: now,
    unread_count: 0,
    ai_enabled: false,
    needs_human_attention: false,
    human_attention_reason: null,
    conversation_status: "open",
    assigned_to: null,
    last_ai_summary: null,
    is_blocked: false,
    is_muted: false,
    muted_until: null,
    is_starred: false,
    customer_notes: null,
    profile_image_url: null,
  };

  const fallbackInsert = {
    workspace_id: workspace.id,
    owner_user_id: userId,
    phone: to,
    name: null,
    last_message: message,
    last_message_at: now,
    unread_count: 0,
    ai_enabled: false,
  };

  const { data, error: insertError } = await supabaseAdmin
    .from("artipilot_contacts")
    .insert(fullInsert)
    .select("id")
    .maybeSingle();

  if (!insertError) return data?.id || null;

  if (!hasColumnError(insertError)) {
    console.error("Error creating contact after manual send:", insertError);
    return null;
  }

  console.warn("Manual send contact insert fallback used:", insertError.message);

  const { data: fallbackData, error: fallbackError } = await supabaseAdmin
    .from("artipilot_contacts")
    .insert(fallbackInsert)
    .select("id")
    .maybeSingle();

  if (fallbackError) {
    console.error("Error creating contact after manual send fallback:", fallbackError);
  }

  return fallbackData?.id || null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

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

    const body = (await req.json()) as SendBody;

    const to = normalizePhone(String(body?.to || ""));
    const cleanMessage = sanitizeWhatsAppText(String(body?.message || ""));

    if (!to) {
      return NextResponse.json(
        {
          error: "Missing customer phone number",
        },
        { status: 400 }
      );
    }

    if (!cleanMessage) {
      return NextResponse.json(
        {
          error: "Message cannot be empty",
        },
        { status: 400 }
      );
    }

    if (cleanMessage.length > 4000) {
      return NextResponse.json(
        {
          error: "Message is too long. Please keep it under 4000 characters.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const whatsappData = await sendWhatsAppText({
      to,
      message: cleanMessage,
    });

    const { whatsappMessageId, message } = await saveOutgoingMessage({
      workspace,
      userId: user.id,
      to,
      message: cleanMessage,
      whatsappData,
      now,
    });

    await updateOrCreateContactAfterManualSend({
      workspace,
      userId: user.id,
      to,
      message: cleanMessage,
      now,
    });

    return NextResponse.json(
      {
        success: true,
        whatsappMessageId,
        message,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Send WhatsApp API error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Send message failed",
      },
      { status: 500 }
    );
  }
}