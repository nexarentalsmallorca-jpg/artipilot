import { NextRequest, NextResponse } from "next/server";
import { generateAiReply, isOpenAiConfigured } from "@/lib/ai/generateReply";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { normalizePhone, sendWhatsAppText } from "@/lib/whatsapp/send";

type WaMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
};

type WaContact = {
  wa_id?: string;
  profile?: {
    name?: string;
  };
};

type WaStatus = {
  id?: string;
  status?: string;
};

type WebhookBody = {
  entry?: {
    changes?: {
      value?: {
        messages?: WaMessage[];
        contacts?: WaContact[];
        statuses?: WaStatus[];
      };
    }[];
  }[];
};

type ArtipilotContact = {
  id: string;
  phone: string;
  name?: string | null;
  profile_name?: string | null;
  ai_enabled?: boolean | null;
};

type ArtipilotMessage = {
  id: string;
  contact_phone: string;
  role?: string | null;
  direction?: string | null;
  message_type?: string | null;
  content?: string | null;
  whatsapp_message_id?: string | null;
  created_at?: string | null;
};

function logDebug(label: string, data?: unknown) {
  console.log(`[NERO_WEBHOOK] ${label}`, data ?? "");
}

function logError(label: string, error: unknown) {
  console.error(`[NERO_WEBHOOK_ERROR] ${label}`, error);
}

function getVerifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN?.trim() || "";
}

function safeString(value: unknown) {
  return String(value || "").trim();
}

function waTimestamp(timestamp?: string) {
  if (!timestamp) {
    return new Date().toISOString();
  }

  const seconds = Number(timestamp);

  if (Number.isNaN(seconds)) {
    return new Date().toISOString();
  }

  return new Date(seconds * 1000).toISOString();
}

function getWebhookValue(body: WebhookBody) {
  return body.entry?.[0]?.changes?.[0]?.value || null;
}

function messageBody(message: WaMessage) {
  if (message.type === "text" && message.text?.body?.trim()) {
    return message.text.body.trim();
  }

  return `[${message.type || "message"}]`;
}

function isRealTextMessage(message: WaMessage) {
  return message.type === "text" && Boolean(message.text?.body?.trim());
}

async function messageAlreadyExists(whatsappMessageId?: string) {
  if (!whatsappMessageId) {
    return false;
  }

  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("artipilot_messages")
    .select("id")
    .eq("whatsapp_message_id", whatsappMessageId)
    .maybeSingle();

  if (error) {
    logError("messageAlreadyExists failed", error);
    return false;
  }

  return Boolean(data?.id);
}

async function upsertContact(phone: string, profileName?: string | null) {
  const db = getSupabaseAdmin();
  const normalizedPhone = normalizePhone(phone);
  const cleanProfileName = safeString(profileName);

  logDebug("Upserting contact", {
    phone: normalizedPhone,
    profileName: cleanProfileName || null,
  });

  const { data: existing, error: existingError } = await db
    .from("artipilot_contacts")
    .select("id, phone, name, profile_name, ai_enabled")
    .eq("phone", normalizedPhone)
    .maybeSingle<ArtipilotContact>();

  if (existingError) {
    logError("Contact lookup failed", existingError);
    throw existingError;
  }

  if (existing?.id) {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (cleanProfileName && !existing.profile_name) {
      updates.profile_name = cleanProfileName;
    }

    if (cleanProfileName && !existing.name) {
      updates.name = cleanProfileName;
    }

    const { error: updateError } = await db
      .from("artipilot_contacts")
      .update(updates)
      .eq("id", existing.id);

    if (updateError) {
      logError("Contact update failed", updateError);
      throw updateError;
    }

    return existing;
  }

  const { data: created, error: createError } = await db
    .from("artipilot_contacts")
    .insert({
      phone: normalizedPhone,
      name: cleanProfileName || null,
      profile_name: cleanProfileName || null,
      ai_enabled: true,
      unread_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, phone, name, profile_name, ai_enabled")
    .single<ArtipilotContact>();

  if (createError) {
    logError("Contact create failed", createError);
    throw createError;
  }

  return created;
}

async function insertInboundMessage(params: {
  phone: string;
  whatsappMessageId?: string;
  content: string;
  messageType: string;
  createdAt: string;
}) {
  const db = getSupabaseAdmin();

  logDebug("Saving inbound message", {
    phone: params.phone,
    whatsappMessageId: params.whatsappMessageId || null,
    messageType: params.messageType,
  });

  const { data, error } = await db
    .from("artipilot_messages")
    .insert({
      contact_phone: params.phone,
      whatsapp_message_id: params.whatsappMessageId || null,
      role: "user",
      direction: "inbound",
      message_type: params.messageType || "text",
      content: params.content,
      delivery_status: "received",
      created_at: params.createdAt,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    logError("Inbound message insert failed", error);
    throw error;
  }

  return data;
}

async function insertOutboundAiMessage(params: {
  phone: string;
  content: string;
  status: "pending" | "sent" | "failed";
  whatsappMessageId?: string | null;
  statusError?: string | null;
}) {
  const db = getSupabaseAdmin();

  logDebug("Saving outbound AI message", {
    phone: params.phone,
    status: params.status,
    whatsappMessageId: params.whatsappMessageId || null,
  });

  const { data, error } = await db
    .from("artipilot_messages")
    .insert({
      contact_phone: params.phone,
      whatsapp_message_id: params.whatsappMessageId || null,
      role: "assistant",
      direction: "outbound",
      message_type: "text",
      content: params.content,
      delivery_status: params.status,
      status_error: params.statusError || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    logError("Outbound AI message insert failed", error);
    throw error;
  }

  return data;
}

async function updateMessageStatus(params: {
  messageId: string;
  status: string;
  statusError?: string | null;
  whatsappMessageId?: string | null;
}) {
  const db = getSupabaseAdmin();

  const { error } = await db
    .from("artipilot_messages")
    .update({
      delivery_status: params.status,
      status_error: params.statusError || null,
      whatsapp_message_id: params.whatsappMessageId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.messageId);

  if (error) {
    logError("Message status update failed", error);
  }
}

async function listRecentMessagesForPhone(phone: string) {
  const db = getSupabaseAdmin();
  const normalizedPhone = normalizePhone(phone);

  const { data, error } = await db
    .from("artipilot_messages")
    .select("id, contact_phone, role, direction, message_type, content, whatsapp_message_id, created_at")
    .eq("contact_phone", normalizedPhone)
    .order("created_at", { ascending: true })
    .limit(30)
    .returns<ArtipilotMessage[]>();

  if (error) {
    logError("Recent messages lookup failed", error);
    return [];
  }

  return data || [];
}

async function handleStatusUpdate(status: WaStatus) {
  const whatsappMessageId = safeString(status.id);
  const deliveryStatus = safeString(status.status);

  if (!whatsappMessageId || !deliveryStatus) {
    return;
  }

  const db = getSupabaseAdmin();

  logDebug("Handling WhatsApp status update", {
    whatsappMessageId,
    deliveryStatus,
  });

  const { error } = await db
    .from("artipilot_messages")
    .update({
      delivery_status: deliveryStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("whatsapp_message_id", whatsappMessageId);

  if (error) {
    logError("Status update failed", error);
  }
}

async function maybeAutoReply(params: {
  contact: ArtipilotContact;
  phone: string;
  inboundBody: string;
}) {
  const phone = normalizePhone(params.phone);
  const inboundBody = safeString(params.inboundBody);

  logDebug("Auto reply check started", {
    phone,
    contactId: params.contact.id,
    aiEnabled: params.contact.ai_enabled,
    inboundBody,
  });

  if (!params.contact?.id) {
    logDebug("Auto reply skipped: contact missing");
    return;
  }

  if (params.contact.ai_enabled === false) {
    logDebug("Auto reply skipped: AI disabled for contact", { phone });
    return;
  }

  if (!inboundBody) {
    logDebug("Auto reply skipped: empty inbound body");
    return;
  }

  if (!isOpenAiConfigured()) {
    logError("Auto reply skipped: OpenAI is not configured", {
      hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    });
    return;
  }

  const recentMessages = await listRecentMessagesForPhone(phone);

  const history = recentMessages
    .filter((message) => safeString(message.content))
    .slice(-20)
    .map((message) => ({
      role:
        message.direction === "inbound"
          ? ("user" as const)
          : ("assistant" as const),
      content: safeString(message.content),
    }));

  logDebug("Generating Nero reply", {
    phone,
    historyCount: history.length,
  });

  let replyText = "";

  try {
    replyText = await generateAiReply({
      customerMessage: inboundBody,
      recentMessages: history,
    });
  } catch (error) {
    logError("Nero AI generation failed", error);
    return;
  }

  replyText = safeString(replyText);

  if (!replyText) {
    logError("Nero AI returned empty reply", { phone });
    return;
  }

  const pendingMessage = await insertOutboundAiMessage({
    phone,
    content: replyText,
    status: "pending",
  });

  logDebug("Sending Nero reply through WhatsApp", {
    phone,
    messageId: pendingMessage.id,
  });

  const sendResult = await sendWhatsAppText(phone, replyText);

  if (!sendResult.ok) {
    logError("WhatsApp send failed for Nero reply", sendResult.error);

    await updateMessageStatus({
      messageId: pendingMessage.id,
      status: "failed",
      statusError: sendResult.error || "Unknown WhatsApp send error",
      whatsappMessageId: null,
    });

    return;
  }

  await updateMessageStatus({
    messageId: pendingMessage.id,
    status: "sent",
    statusError: null,
    whatsappMessageId: sendResult.messageId || null,
  });

  logDebug("Nero auto reply sent successfully", {
    phone,
    whatsappMessageId: sendResult.messageId || null,
  });
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  const verifyToken = getVerifyToken();

  if (!verifyToken) {
    return NextResponse.json(
      { error: "WHATSAPP_VERIFY_TOKEN is not configured." },
      { status: 500 }
    );
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase not configured." },
      { status: 500 }
    );
  }

  let body: WebhookBody;

  try {
    body = await request.json();
  } catch (error) {
    logError("Invalid webhook JSON", error);
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const value = getWebhookValue(body);

  if (!value) {
    logDebug("Webhook received without value");
    return NextResponse.json({ ok: true });
  }

  const profileMap = new Map<string, string>();

  for (const contact of value.contacts || []) {
    if (contact.wa_id && contact.profile?.name) {
      profileMap.set(contact.wa_id, contact.profile.name);
    }
  }

  for (const status of value.statuses || []) {
    try {
      await handleStatusUpdate(status);
    } catch (error) {
      logError("Webhook status handling failed", error);
    }
  }

  for (const message of value.messages || []) {
    const from = safeString(message.from);

    if (!from) {
      logDebug("Skipped message: missing from");
      continue;
    }

    const phone = normalizePhone(from);
    const profileName = profileMap.get(from) || null;
    const text = messageBody(message);
    const createdAt = waTimestamp(message.timestamp);
    const whatsappMessageId = safeString(message.id);
    const messageType = safeString(message.type) || "text";

    logDebug("Incoming WhatsApp message received", {
      phone,
      whatsappMessageId,
      messageType,
      isText: isRealTextMessage(message),
    });

    try {
      const duplicate = await messageAlreadyExists(whatsappMessageId);

      if (duplicate) {
        logDebug("Skipped duplicate WhatsApp message", {
          whatsappMessageId,
        });
        continue;
      }

      const contact = await upsertContact(phone, profileName);

      await insertInboundMessage({
        phone,
        whatsappMessageId: whatsappMessageId || undefined,
        content: text,
        messageType,
        createdAt,
      });

      if (isRealTextMessage(message)) {
        await maybeAutoReply({
          contact,
          phone,
          inboundBody: message.text?.body?.trim() || "",
        });
      } else {
        logDebug("Auto reply skipped: not a real text message yet", {
          messageType,
        });
      }
    } catch (error) {
      logError("Webhook message handling failed", error);
    }
  }

  return NextResponse.json({ ok: true });
}