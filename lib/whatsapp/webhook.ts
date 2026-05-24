import { NextRequest, NextResponse } from "next/server";
import { generateAiReply, isOpenAiConfigured } from "@/lib/ai/generateReply";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { normalizePhone, sendWhatsAppText } from "@/lib/whatsapp/send";

type WaMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
};

type WaContact = {
  wa_id?: string;
  profile?: { name?: string };
};

type WaStatus = {
  id?: string;
  status?: string;
  recipient_id?: string;
};

function getVerifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN || "";
}

function waTimestamp(ts?: string) {
  if (!ts) return new Date().toISOString();
  const seconds = Number(ts);
  if (Number.isNaN(seconds)) return new Date().toISOString();
  return new Date(seconds * 1000).toISOString();
}

function messageBody(msg: WaMessage) {
  if (msg.type === "text" && msg.text?.body) return msg.text.body;
  return `[${msg.type || "message"}]`;
}

async function upsertContact(phone: string, profileName?: string | null) {
  const db = getSupabaseAdmin();
  const normalized = normalizePhone(phone);

  const { data: existing } = await db
    .from("artipilot_contacts")
    .select("id, name, profile_name")
    .eq("phone", normalized)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (profileName && !existing.profile_name) {
      updates.profile_name = profileName;
    }
    if (profileName && !existing.name) {
      updates.name = profileName;
    }
    await db.from("artipilot_contacts").update(updates).eq("id", existing.id);
    return existing.id as string;
  }

  const { data: created, error } = await db
    .from("artipilot_contacts")
    .insert({
      phone: normalized,
      name: profileName || null,
      profile_name: profileName || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return created.id as string;
}

async function saveInboundMessage(params: {
  contactId: string;
  phone: string;
  waMessageId?: string;
  body: string;
  createdAt: string;
  raw: unknown;
}) {
  const db = getSupabaseAdmin();

  const { data: message, error } = await db
    .from("artipilot_messages")
    .insert({
      contact_id: params.contactId,
      phone: params.phone,
      whatsapp_message_id: params.waMessageId || null,
      direction: "inbound",
      sender_type: "customer",
      message_type: "text",
      body: params.body,
      status: "received",
      raw_payload: params.raw,
      created_at: params.createdAt,
    })
    .select("*")
    .single();

  if (error) throw error;

  const { data: contact } = await db
    .from("artipilot_contacts")
    .select("unread_count")
    .eq("id", params.contactId)
    .single();

  const unread = (contact?.unread_count ?? 0) + 1;

  await db
    .from("artipilot_contacts")
    .update({
      last_message: params.body,
      last_message_at: params.createdAt,
      unread_count: unread,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.contactId);

  return message;
}

async function saveOutboundMessage(params: {
  contactId: string;
  phone: string;
  body: string;
  senderType: "admin" | "ai" | "system";
  status: string;
  waMessageId?: string | null;
  statusError?: string | null;
}) {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: message, error } = await db
    .from("artipilot_messages")
    .insert({
      contact_id: params.contactId,
      phone: params.phone,
      whatsapp_message_id: params.waMessageId || null,
      direction: "outbound",
      sender_type: params.senderType,
      message_type: "text",
      body: params.body,
      status: params.status,
      status_error: params.statusError || null,
      created_at: now,
    })
    .select("*")
    .single();

  if (error) throw error;

  await db
    .from("artipilot_contacts")
    .update({
      last_message: params.body,
      last_message_at: now,
      updated_at: now,
    })
    .eq("id", params.contactId);

  return message;
}

async function maybeAutoReply(contactId: string, phone: string, inboundBody: string) {
  const db = getSupabaseAdmin();

  const { data: contact } = await db
    .from("artipilot_contacts")
    .select("ai_enabled, name")
    .eq("id", contactId)
    .single();

  if (!contact?.ai_enabled) return;
  if (!isOpenAiConfigured()) return;

  const { data: recent } = await db
    .from("artipilot_messages")
    .select("direction, sender_type, body")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(12);

  const history = (recent || [])
    .reverse()
    .filter((m) => m.body)
    .map((m) => ({
      role:
        m.direction === "inbound"
          ? ("user" as const)
          : ("assistant" as const),
      content: String(m.body),
    }));

  let replyText: string;
  try {
    replyText = await generateAiReply({
      customerMessage: inboundBody,
      recentMessages: history,
    });
  } catch {
    return;
  }

  if (!replyText) return;

  const sendResult = await sendWhatsAppText(phone, replyText);

  await saveOutboundMessage({
    contactId,
    phone,
    body: replyText,
    senderType: "ai",
    status: sendResult.ok ? "sent" : "failed",
    waMessageId: sendResult.ok ? sendResult.messageId : null,
    statusError: sendResult.ok ? null : sendResult.error,
  });
}

async function handleStatusUpdate(status: WaStatus) {
  if (!status.id || !status.status) return;
  const db = getSupabaseAdmin();
  await db
    .from("artipilot_messages")
    .update({ status: status.status })
    .eq("whatsapp_message_id", status.id);
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const verifyToken = getVerifyToken();

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let body: {
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

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const value = body.entry?.[0]?.changes?.[0]?.value;
  if (!value) {
    return NextResponse.json({ ok: true });
  }

  const profileMap = new Map<string, string>();
  for (const c of value.contacts || []) {
    if (c.wa_id && c.profile?.name) {
      profileMap.set(c.wa_id, c.profile.name);
    }
  }

  for (const status of value.statuses || []) {
    await handleStatusUpdate(status);
  }

  for (const msg of value.messages || []) {
    const from = msg.from;
    if (!from) continue;

    const phone = normalizePhone(from);
    const profileName = profileMap.get(from) || null;
    const text = messageBody(msg);
    const createdAt = waTimestamp(msg.timestamp);

    try {
      const contactId = await upsertContact(phone, profileName);
      await saveInboundMessage({
        contactId,
        phone,
        waMessageId: msg.id,
        body: text,
        createdAt,
        raw: msg,
      });
      if (msg.type === "text" && msg.text?.body) {
        await maybeAutoReply(contactId, phone, msg.text.body);
      }
    } catch (error) {
      console.error("Webhook message error:", error);
    }
  }

  return NextResponse.json({ ok: true });
}
