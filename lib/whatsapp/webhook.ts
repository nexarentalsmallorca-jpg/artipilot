import { NextRequest, NextResponse } from "next/server";
import { generateAiReply, isOpenAiConfigured } from "@/lib/ai/generateReply";
import {
  getContactById,
  insertInboundMessage,
  insertOutboundMessage,
  listMessagesForContact,
  updateOutboundMessage,
} from "@/lib/db/private-inbox";
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

function messageBody(message: WaMessage) {
  if (message.type === "text" && message.text?.body) {
    return message.text.body.trim();
  }

  return `[${message.type || "message"}]`;
}

function isRealTextMessage(message: WaMessage) {
  return message.type === "text" && Boolean(message.text?.body?.trim());
}

function getWebhookValue(body: WebhookBody) {
  return body.entry?.[0]?.changes?.[0]?.value || null;
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
    console.error("messageAlreadyExists error:", error);
    return false;
  }

  return Boolean(data?.id);
}

async function upsertContact(phone: string, profileName?: string | null) {
  const db = getSupabaseAdmin();
  const normalizedPhone = normalizePhone(phone);
  const cleanProfileName = safeString(profileName);

  const { data: existing, error: existingError } = await db
    .from("artipilot_contacts")
    .select("id, name, profile_name")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (existingError) {
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

    await db.from("artipilot_contacts").update(updates).eq("id", existing.id);

    return String(existing.id);
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
    .select("id")
    .single();

  if (createError) {
    throw createError;
  }

  return String(created.id);
}

async function handleStatusUpdate(status: WaStatus) {
  const whatsappMessageId = safeString(status.id);
  const deliveryStatus = safeString(status.status);

  if (!whatsappMessageId || !deliveryStatus) {
    return;
  }

  const db = getSupabaseAdmin();

  const modern = await db
    .from("artipilot_messages")
    .update({
      status: deliveryStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("whatsapp_message_id", whatsappMessageId);

  if (modern.error) {
    console.error("Status update error:", modern.error);

    await db
      .from("artipilot_messages")
      .update({
        delivery_status: deliveryStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("whatsapp_message_id", whatsappMessageId);
  }
}

async function maybeAutoReply(params: {
  contactId: string;
  phone: string;
  inboundBody: string;
}) {
  const contact = await getContactById(params.contactId);

  if (!contact?.id) {
    return;
  }

  if (!contact.ai_enabled) {
    return;
  }

  if (!isOpenAiConfigured()) {
    console.warn("Auto reply skipped: OpenAI is not configured.");
    return;
  }

  const recentMessages = await listMessagesForContact(params.contactId);

  const history = recentMessages
    .filter((message) => message.body)
    .slice(-20)
    .map((message) => ({
      role:
        message.direction === "inbound"
          ? ("user" as const)
          : ("assistant" as const),
      content: String(message.body || ""),
    }));

  let replyText = "";

  try {
    replyText = await generateAiReply({
      customerMessage: params.inboundBody,
      recentMessages: history,
    });
  } catch (error) {
    console.error("Nero AI reply generation failed:", error);
    return;
  }

  replyText = safeString(replyText);

  if (!replyText) {
    return;
  }

  const pendingMessage = await insertOutboundMessage({
    contactId: params.contactId,
    phone: params.phone,
    body: replyText,
    senderType: "ai",
    status: "pending",
  });

  const sendResult = await sendWhatsAppText(params.phone, replyText);

  await updateOutboundMessage(pendingMessage.id, {
    status: sendResult.ok ? "sent" : "failed",
    status_error: sendResult.ok ? null : sendResult.error,
    whatsapp_message_id: sendResult.ok ? sendResult.messageId : null,
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
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const value = getWebhookValue(body);

  if (!value) {
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
      console.error("Webhook status update error:", error);
    }
  }

  for (const message of value.messages || []) {
    const from = safeString(message.from);

    if (!from) {
      continue;
    }

    const phone = normalizePhone(from);
    const profileName = profileMap.get(from) || null;
    const text = messageBody(message);
    const createdAt = waTimestamp(message.timestamp);
    const whatsappMessageId = safeString(message.id);

    try {
      const duplicate = await messageAlreadyExists(whatsappMessageId);

      if (duplicate) {
        continue;
      }

      const contactId = await upsertContact(phone, profileName);

      await insertInboundMessage({
        contactId,
        phone,
        waMessageId: whatsappMessageId || undefined,
        body: text,
        createdAt,
        raw: message,
      });

      if (isRealTextMessage(message)) {
        await maybeAutoReply({
          contactId,
          phone,
          inboundBody: message.text?.body?.trim() || "",
        });
      }
    } catch (error) {
      console.error("Webhook message error:", error);
    }
  }

  return NextResponse.json({ ok: true });
}